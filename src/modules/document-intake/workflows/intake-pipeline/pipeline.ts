/**
 * Document Intake Pipeline â€?main orchestrator.
 *
 * Layered per the optimisation brief:
 *   1. Classify  â€?decide (bucket, docType, category) from rawText
 *   2. Extract   â€?directed, category-specific LLM prompt
 *   3. Match     â€?find candidate projects for this doc
 *   4. Narrate   â€?one-liner for the UI
 *
 * Two entry points:
 *   â€?runIntakePipeline      â€?fresh intake, classifier decides everything
 *   â€?runReclassifyPipeline  â€?user forced (bucket, kind), skip classifier
 *
 * Future layers that will slot in here without restructuring:
 *   â€?Container unpacking (zip / eml / docx / xlsx) â€?before (1)
 *   â€?Page selection â€?between normalise and (1) for multi-page docs
 *   â€?Cost tiering (cheap regex â†?LLM fallback) â€?inside (2)
 *   â€?Confidence banding â€?wraps (2)'s output
 */

import type { RequestEvent } from '@sveltejs/kit';

import { createModuleContext } from '$lib/server/modules';
import { normalizeDocTypeHint } from '$lib/server/ocr/classify';
import { resolveKindSelection } from '$modules/document-intake/schemas/intake-field-specs';
import { createProjectApi } from '$modules/project';

import { classifyIntake } from './classify';
import { extractByCategory } from './extract';
import { buildNarration } from './narration';
import type { Bucket, IntakeResult, ProjectMatch } from './types';

async function matchProjects(rawText: string, event: RequestEvent): Promise<ProjectMatch[]> {
	try {
		const ctx = await createModuleContext(event);
		const projectApi = createProjectApi(ctx);
		const all = await projectApi.list({ pageSize: 1000 });
		const t = rawText.toLowerCase();
		return all
			.map((row) => {
				const name = row.project.name ?? '';
				const customer = row.customerName ?? '';
				let score = 0;
				if (name && t.includes(name.toLowerCase())) score += 5;
				if (customer && customer.length >= 3 && t.includes(customer.toLowerCase())) score += 3;
				const words = [...name.split(/\s+/), ...customer.split(/\s+/)]
					.map((w) => w.toLowerCase())
					.filter((w) => w.length >= 4);
				for (const word of new Set(words)) {
					if (t.includes(word)) score += 0.5;
				}
				return { id: row.project.id, name, customerName: customer, score };
			})
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 3);
	} catch {
		return [];
	}
}

export interface PipelineInput {
	rawText: string;
	hintDocType?: string | null;
}

export async function runIntakePipeline(
	event: RequestEvent,
	input: PipelineInput
): Promise<IntakeResult> {
	const env = event.platform!.env;
	const hint = normalizeDocTypeHint(input.hintDocType ?? undefined);

	// 1. Classify first (decides which extractor we run next)
	const classify = await classifyIntake(input.rawText, hint, env);

	// 2 + 3. Directed extract + project match in parallel (independent)
	const [fields, projectMatches] = await Promise.all([
		extractByCategory({
			rawText: input.rawText,
			bucket: classify.bucket,
			docType: classify.docType,
			category: classify.category,
			env
		}),
		matchProjects(input.rawText, event)
	]);

	// 4. Narration
	const narration = buildNarration({
		bucket: classify.bucket,
		docType: classify.docType,
		category: classify.category,
		fields,
		topProject: projectMatches[0] ?? null
	});

	return {
		bucket: classify.bucket,
		docType: classify.docType,
		expenseType: classify.expenseType,
		category: classify.category,
		categoryDocType: classify.categoryDocType,
		fields,
		projectMatches,
		confidence: classify.confidence,
		narration,
		provider: {
			classifier: classify.provider,
			extractor: 'directed'
		}
	};
}

export interface ReclassifyInput {
	rawText: string;
	bucket: Bucket;
	kind: string;
}

/**
 * Re-run the pipeline with the user's forced (bucket, kind). Used when
 * the classifier picked wrong and the user corrected the kind via the
 * step-3 chips or the review pills. We skip classifyIntake entirely â€? * the forced pair IS the answer â€?and just re-run extract + match +
 * narration under the correct schema.
 */
export async function runReclassifyPipeline(
	event: RequestEvent,
	input: ReclassifyInput
): Promise<IntakeResult> {
	const env = event.platform!.env;
	const resolved = resolveKindSelection(input.bucket, input.kind);

	const [fields, projectMatches] = await Promise.all([
		extractByCategory({
			rawText: input.rawText,
			bucket: input.bucket,
			docType: resolved.docType,
			category: resolved.category,
			env
		}),
		matchProjects(input.rawText, event)
	]);

	const narration = buildNarration({
		bucket: input.bucket,
		docType: resolved.docType,
		category: resolved.category,
		fields,
		topProject: projectMatches[0] ?? null
	});

	return {
		bucket: input.bucket,
		docType: resolved.docType,
		expenseType: resolved.expenseType,
		category: resolved.category,
		categoryDocType: resolved.docTypeForDocs,
		fields,
		projectMatches,
		// User-forced â†?by definition the source of truth; display as 100.
		confidence: 100,
		narration,
		provider: {
			classifier: 'user_override',
			extractor: 'directed'
		}
	};
}
