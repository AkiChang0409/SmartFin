/**
 * extract-document-fields — generalized document field extraction (Phase 3).
 *
 * Replaces the Phase-2 `finance.extract-invoice-fields` (which hard-coded the
 * supplier-invoice shape). Same heuristic-first → LLM-fallback → fixture-mock
 * dispatch as before, but now category-aware: the `categoryDocType` decided
 * by the workflow's bucket/category step picks both the prompt + schema and
 * the heuristic branch.
 *
 * Output shape stays compatible with the Phase-2 `ExtractInvoiceFieldsOutput`
 * so the matching and confirmation steps don't have to change yet.
 */
import type { ZodType } from 'zod';
import { runStructuredOutput } from '../../../../platform/ai/ai-runtime';
import {
	findCategoryById,
	type CategoryDefinition,
	type CategoryDocType
} from '../../workflows/financial-document-intake/categories';
import type { FinanceEvidence } from '../../agent/types';
import type { FinanceCapability, FinanceCapabilityContext } from '../types';
import {
	buildEvidence,
	pickFixture,
	type ExtractedInvoiceFields,
	type ExtractInvoiceFieldsOutput,
	type ExtractionProvider
} from '../extract-invoice-fields/mock';
import { runHeuristicExtraction, type HeuristicCommonFields } from './heuristic';
import {
	customerInvoiceSchemaV1,
	invoiceSchemaV1,
	poSchemaV1,
	receiptSchemaV1,
	EXTRACT_DOCUMENT_FIELDS_SCHEMA_VERSION,
	type CustomerInvoiceLlmV1,
	type InvoiceLlmV1,
	type PoLlmV1,
	type ReceiptLlmV1
} from './schemas';
import {
	buildDocumentUserPrompt,
	CUSTOMER_INVOICE_SYSTEM_PROMPT,
	EXTRACT_DOCUMENT_FIELDS_PROMPT_VERSION,
	INVOICE_SYSTEM_PROMPT,
	PO_SYSTEM_PROMPT,
	RECEIPT_SYSTEM_PROMPT
} from './prompts';

const HEURISTIC_ACCEPT_THRESHOLD = 0.65;
const MIN_TEXT_LENGTH_FOR_REAL_EXTRACT = 32;

interface CapabilityContextWithEnv extends FinanceCapabilityContext {
	env?: Env;
}

export interface ExtractDocumentFieldsInput {
	documentId: string;
	fileName?: string;
	text?: string;
	artifactConfidence?: number;
	/** Category id from the workflow state, e.g. `expense.sales_cost.invoice`.
	 *  When absent the capability defaults to invoice extraction (Phase 2 behavior). */
	categoryId?: string;
}

export type ExtractDocumentFieldsOutput = ExtractInvoiceFieldsOutput;

// ---------------------------------------------------------------------------
// Heuristic → common ExtractedInvoiceFields projection
// ---------------------------------------------------------------------------

function projectHeuristic(
	fields: HeuristicCommonFields
): ExtractedInvoiceFields | null {
	if (
		!fields.documentNumber ||
		!fields.supplierName ||
		fields.totalAmount === null ||
		!fields.issueDate ||
		!fields.currency
	) {
		return null;
	}
	return {
		documentNumber: fields.documentNumber,
		counterpartyName: fields.supplierName,
		currency: fields.currency.toUpperCase(),
		totalAmount: fields.totalAmount,
		gstAmount: fields.gstAmount ?? 0,
		issueDate: fields.issueDate,
		dueDate: fields.dueDate ?? fields.issueDate
	};
}

// ---------------------------------------------------------------------------
// LLM dispatch (per categoryDocType)
// ---------------------------------------------------------------------------

interface LlmConfig<T> {
	systemPrompt: string;
	schema: ZodType<T>;
	schemaName: string;
	mapToFields: (value: T) => ExtractedInvoiceFields | null;
	confidenceFromValue: (value: T) => number | undefined;
}

function configForDocType(docType: CategoryDocType): LlmConfig<unknown> | null {
	if (docType === 'invoice') {
		return {
			systemPrompt: INVOICE_SYSTEM_PROMPT,
			schema: invoiceSchemaV1 as ZodType<unknown>,
			schemaName: 'finance.invoice-extraction',
			mapToFields: (raw) => {
				const v = raw as InvoiceLlmV1;
				if (
					!v.invoiceNumber ||
					!v.supplierName ||
					v.totalAmount === null ||
					!v.issueDate ||
					!v.currency
				) return null;
				return {
					documentNumber: v.invoiceNumber,
					counterpartyName: v.supplierName,
					currency: v.currency.toUpperCase(),
					totalAmount: v.totalAmount,
					gstAmount: v.gstAmount ?? 0,
					issueDate: v.issueDate,
					dueDate: v.dueDate ?? v.issueDate
				};
			},
			confidenceFromValue: (raw) => (raw as InvoiceLlmV1).confidence
		};
	}
	if (docType === 'receipt') {
		return {
			systemPrompt: RECEIPT_SYSTEM_PROMPT,
			schema: receiptSchemaV1 as ZodType<unknown>,
			schemaName: 'finance.receipt-extraction',
			mapToFields: (raw) => {
				const v = raw as ReceiptLlmV1;
				if (
					!v.vendor ||
					v.totalAmount === null ||
					!v.date ||
					!v.currency
				) return null;
				return {
					documentNumber: v.receiptNumber ?? `RCT-${v.date}`,
					counterpartyName: v.vendor,
					currency: v.currency.toUpperCase(),
					totalAmount: v.totalAmount,
					gstAmount: v.gstAmount ?? 0,
					issueDate: v.date,
					dueDate: v.date
				};
			},
			confidenceFromValue: (raw) => (raw as ReceiptLlmV1).confidence
		};
	}
	if (docType === 'po' || docType === 'purchase_order_doc') {
		return {
			systemPrompt: PO_SYSTEM_PROMPT,
			schema: poSchemaV1 as ZodType<unknown>,
			schemaName: 'finance.po-extraction',
			mapToFields: (raw) => {
				const v = raw as PoLlmV1;
				if (
					!v.poNumber ||
					!v.supplierName ||
					v.totalAmount === null ||
					!v.date ||
					!v.currency
				) return null;
				return {
					documentNumber: v.poNumber,
					counterpartyName: v.supplierName,
					currency: v.currency.toUpperCase(),
					totalAmount: v.totalAmount,
					gstAmount: 0,
					issueDate: v.date,
					dueDate: v.date
				};
			},
			confidenceFromValue: (raw) => (raw as PoLlmV1).confidence
		};
	}
	if (docType === 'invoice_out') {
		return {
			systemPrompt: CUSTOMER_INVOICE_SYSTEM_PROMPT,
			schema: customerInvoiceSchemaV1 as ZodType<unknown>,
			schemaName: 'finance.customer-invoice-extraction',
			mapToFields: (raw) => {
				const v = raw as CustomerInvoiceLlmV1;
				if (
					!v.invoiceNumber ||
					!v.customerName ||
					v.totalAmount === null ||
					!v.invoiceDate ||
					!v.currency
				) return null;
				return {
					documentNumber: v.invoiceNumber,
					counterpartyName: v.customerName,
					currency: v.currency.toUpperCase(),
					totalAmount: v.totalAmount,
					gstAmount: v.gstAmount ?? 0,
					issueDate: v.invoiceDate,
					dueDate: v.invoiceDueDate ?? v.invoiceDate
				};
			},
			confidenceFromValue: (raw) => (raw as CustomerInvoiceLlmV1).confidence
		};
	}
	return null;
}

async function tryLlmExtraction(
	text: string,
	docType: CategoryDocType,
	ctx: CapabilityContextWithEnv,
	categoryId: string,
	documentId: string
): Promise<{ fields: ExtractedInvoiceFields; confidence: number; provider: ExtractionProvider } | null> {
	if (!ctx.env?.AI) return null;
	const cfg = configForDocType(docType);
	if (!cfg) return null;

	const result = await runStructuredOutput<unknown>({
		task: `finance.extractDocumentFields.${docType ?? 'unknown'}`,
		messages: [
			{ role: 'system', content: cfg.systemPrompt },
			{ role: 'user', content: buildDocumentUserPrompt(text) }
		],
		schema: cfg.schema,
		schemaName: cfg.schemaName,
		schemaVersion: EXTRACT_DOCUMENT_FIELDS_SCHEMA_VERSION,
		modelHint: { capability: 'structured_extraction', priority: 'quality' },
		metadata: {
			tenantId: ctx.tenantId ?? 'default',
			userId: ctx.userId,
			capabilityId: 'finance.extract-document-fields',
			promptVersion: EXTRACT_DOCUMENT_FIELDS_PROMPT_VERSION,
			schemaVersion: EXTRACT_DOCUMENT_FIELDS_SCHEMA_VERSION,
			riskLevel: 'R2',
			inputRefs: [`document:${documentId}`, `category:${categoryId}`]
		},
		env: ctx.env
	});

	if (result.status !== 'success') return null;
	const fields = cfg.mapToFields(result.result.value);
	if (!fields) return null;
	const confidence = cfg.confidenceFromValue(result.result.value) ?? 0.8;
	const provider: ExtractionProvider =
		result.result.meta.providerId === 'workers_ai' ? 'workers_ai' : 'external_api';
	return { fields, confidence, provider };
}

// ---------------------------------------------------------------------------
// Capability
// ---------------------------------------------------------------------------

function buildEvidenceForReal(provider: ExtractionProvider): FinanceEvidence[] {
	const labels: Array<keyof ExtractedInvoiceFields> = [
		'documentNumber',
		'counterpartyName',
		'currency',
		'totalAmount',
		'gstAmount',
		'issueDate',
		'dueDate'
	];
	return labels.map((field) => ({
		type: 'extracted_field',
		refId: `${provider}://${field}`,
		summary: `Extracted ${field} via ${provider}`
	}));
}

function resolveDocType(input: ExtractDocumentFieldsInput): {
	docType: CategoryDocType;
	category: CategoryDefinition | null;
} {
	if (input.categoryId) {
		const cat = findCategoryById(input.categoryId);
		if (cat) return { docType: cat.categoryDocType, category: cat };
	}
	return { docType: 'invoice', category: null };
}

export const extractDocumentFieldsCapability: FinanceCapability<
	ExtractDocumentFieldsInput,
	ExtractDocumentFieldsOutput
> = {
	id: 'finance.extract-document-fields',
	description:
		'Extract structured fields from a finance document (invoice, receipt, PO, customer invoice) per the workflow-selected category.',
	riskLevel: 'R2',

	async execute(input, ctx) {
		const ctxWithEnv = ctx as CapabilityContextWithEnv;
		const { docType, category } = resolveDocType(input);

		// 1. No usable text → fixture mock fallback (Phase 1/2 demo path).
		if (!input.text || input.text.length < MIN_TEXT_LENGTH_FOR_REAL_EXTRACT) {
			const fixture = pickFixture({ documentId: input.documentId, fileName: input.fileName });
			return {
				fields: fixture.fields,
				confidence: fixture.confidence,
				evidence: buildEvidence(fixture.fields),
				provider: 'mock-v1'
			};
		}

		// 2. Heuristic-first over real text, branched by docType.
		const heuristic = runHeuristicExtraction(input.text, docType);
		if (heuristic.confidence >= HEURISTIC_ACCEPT_THRESHOLD) {
			const fields = projectHeuristic(heuristic.fields);
			if (fields) {
				return {
					fields,
					confidence: heuristic.confidence,
					evidence: buildEvidenceForReal('heuristic'),
					provider: 'heuristic'
				};
			}
		}

		// 3. LLM fallback (gated on AI binding presence + per-docType schema).
		const llm = await tryLlmExtraction(
			input.text,
			docType,
			ctxWithEnv,
			category?.id ?? input.categoryId ?? 'unknown',
			input.documentId
		);
		if (llm) {
			return {
				fields: llm.fields,
				confidence: llm.confidence,
				evidence: buildEvidenceForReal(llm.provider),
				provider: llm.provider
			};
		}

		// 4. Below-threshold heuristic that still produced usable fields.
		const fields = projectHeuristic(heuristic.fields);
		if (fields) {
			return {
				fields,
				confidence: heuristic.confidence,
				evidence: buildEvidenceForReal('heuristic'),
				provider: 'heuristic'
			};
		}

		// 5. Final: filename-keyed fixture.
		const fixture = pickFixture({ documentId: input.documentId, fileName: input.fileName });
		return {
			fields: fixture.fields,
			confidence: fixture.confidence,
			evidence: buildEvidence(fixture.fields),
			provider: 'mock-v1'
		};
	}
};
