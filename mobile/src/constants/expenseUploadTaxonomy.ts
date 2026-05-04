/**
 * 与 `src/lib/constants/expense-upload.ts` 及 ref_files/smartfin-expense-revenue-design.md 对齐。
 * 移动端独立副本，避免 Metro 去解析 Svelte 工程路径。
 */

export const EXPENSE_CATEGORY_OPTIONS = {
	opex: [
		'transport',
		'accommodation',
		'meal',
		'gift',
		'allowance',
		'ai_subscription',
		'logistics',
		'purchase',
		'others'
	],
	sales_cost: ['invoice', 'receipt']
} as const;

export type ExpenseType = keyof typeof EXPENSE_CATEGORY_OPTIONS;
export type ExpenseCategory = (typeof EXPENSE_CATEGORY_OPTIONS)[ExpenseType][number];

export type ExpenseDocType = 'invoice' | 'receipt' | 'po';

export const CATEGORY_DOC_TYPE_MAP: Record<ExpenseCategory, ExpenseDocType | null> = {
	transport: 'receipt',
	accommodation: 'receipt',
	meal: 'receipt',
	gift: 'receipt',
	allowance: null,
	ai_subscription: 'invoice',
	logistics: 'receipt',
	purchase: 'po',
	invoice: 'invoice',
	receipt: 'receipt',
	others: null
};

export const CATEGORY_DEFAULTS: Record<
	ExpenseCategory,
	{ reimbursement: boolean; businessTrip: boolean }
> = {
	transport: { reimbursement: true, businessTrip: false },
	accommodation: { reimbursement: true, businessTrip: true },
	meal: { reimbursement: true, businessTrip: false },
	gift: { reimbursement: false, businessTrip: false },
	allowance: { reimbursement: false, businessTrip: true },
	ai_subscription: { reimbursement: false, businessTrip: false },
	logistics: { reimbursement: false, businessTrip: false },
	purchase: { reimbursement: false, businessTrip: false },
	invoice: { reimbursement: false, businessTrip: false },
	receipt: { reimbursement: false, businessTrip: false },
	others: { reimbursement: false, businessTrip: false }
};

export type MetaFieldDef = { key: string; label: string; type: 'text' | 'number' | 'date'; source: 'llm' | 'user' };

export const CATEGORY_METADATA_FIELDS: Record<string, MetaFieldDef[]> = {
	transport: [{ key: 'receipt_number', label: '收据号', type: 'text', source: 'llm' }],
	accommodation: [],
	meal: [{ key: 'receipt_number', label: '收据号', type: 'text', source: 'llm' }],
	gift: [
		{ key: 'receipt_number', label: '收据号', type: 'text', source: 'llm' },
		{ key: 'recipient', label: '礼品接收方', type: 'text', source: 'user' }
	],
	allowance: [],
	ai_subscription: [
		{ key: 'invoice_number', label: '发票号', type: 'text', source: 'llm' },
		{ key: 'due_date', label: '到期日', type: 'date', source: 'llm' },
		{ key: 'service_name', label: '服务名称', type: 'text', source: 'llm' },
		{ key: 'period', label: '周期', type: 'text', source: 'llm' }
	],
	logistics: [
		{ key: 'receipt_number', label: '收据/发票号', type: 'text', source: 'llm' },
		{ key: 'tracking_number', label: '运单号', type: 'text', source: 'llm' }
	],
	purchase: [
		{ key: 'po_number', label: '采购单号', type: 'text', source: 'llm' },
		{ key: 'description', label: '说明', type: 'text', source: 'llm' }
	],
	invoice: [
		{ key: 'invoice_number', label: '发票号', type: 'text', source: 'llm' },
		{ key: 'due_date', label: '到期日', type: 'date', source: 'llm' }
	],
	receipt: [{ key: 'receipt_number', label: '收据号', type: 'text', source: 'llm' }],
	others: []
};

export const CATEGORY_COMMON_FIELDS: Record<
	string,
	{ vendorOrSupplier: boolean; staffName: boolean; gstAmount: boolean }
> = {
	transport: { vendorOrSupplier: true, staffName: true, gstAmount: false },
	accommodation: { vendorOrSupplier: true, staffName: true, gstAmount: false },
	meal: { vendorOrSupplier: true, staffName: true, gstAmount: false },
	gift: { vendorOrSupplier: true, staffName: false, gstAmount: false },
	allowance: { vendorOrSupplier: false, staffName: true, gstAmount: false },
	ai_subscription: { vendorOrSupplier: true, staffName: false, gstAmount: true },
	logistics: { vendorOrSupplier: true, staffName: false, gstAmount: false },
	purchase: { vendorOrSupplier: true, staffName: false, gstAmount: false },
	invoice: { vendorOrSupplier: true, staffName: false, gstAmount: true },
	receipt: { vendorOrSupplier: true, staffName: false, gstAmount: true },
	others: { vendorOrSupplier: true, staffName: true, gstAmount: false }
};

export const EXPENSE_TYPE_LABELS_ZH: Record<ExpenseType, string> = {
	opex: '运营费用 (OpEx)',
	sales_cost: '销售成本 (COGS)'
};

export const CATEGORY_LABELS_ZH: Record<string, string> = {
	transport: '交通',
	accommodation: '住宿',
	meal: '餐饮',
	gift: '礼品',
	allowance: '出差津贴（无文件）',
	ai_subscription: 'AI / 订阅',
	logistics: '物流',
	purchase: '采购 (PO)',
	others: '其他',
	invoice: '供应商发票',
	receipt: '付款收据'
};

export const EXPENSE_UPLOAD_CURRENCIES = ['SGD', 'USD', 'CNY', 'MYR', 'EUR'] as const;
export type ExpenseUploadCurrency = (typeof EXPENSE_UPLOAD_CURRENCIES)[number];

const ISO = new Set<string>(EXPENSE_UPLOAD_CURRENCIES);

export function normalizeExpenseCurrency(input: string | null | undefined): ExpenseUploadCurrency | null {
	if (input == null || typeof input !== 'string') return null;
	const raw = input.normalize('NFKC').trim();
	if (!raw) return null;
	const upperSpaced = raw.toUpperCase().replace(/\s+/g, ' ').trim();
	const compact = upperSpaced.replace(/\s/g, '');
	if (ISO.has(compact)) return compact as ExpenseUploadCurrency;
	if (ISO.has(upperSpaced)) return upperSpaced as ExpenseUploadCurrency;
	if (/^US\$|^USD$|U\.S\.\s*DOLLAR|\bUS\s*DOLLAR\b/i.test(upperSpaced) || /^US\$/i.test(compact)) return 'USD';
	if (/^S\$|^SGD$|^SG\$|\bSINGAPORE\s+DOLLAR\b/i.test(upperSpaced) || /^S\$/i.test(compact)) return 'SGD';
	if (/^€|^EUR\b|\bEURO\b/i.test(upperSpaced) || raw.includes('€')) return 'EUR';
	if (/^RM\b|^MYR\b|\bRINGGIT\b/i.test(upperSpaced)) return 'MYR';
	if (/^[¥￥]$/.test(raw.trim())) return 'CNY';
	if (/¥|￥|CN¥|CNY|RMB|\u4EBA\u6C11\u5E01|\u4EBA\u6C11\u5E63|\bRENMINBI\b/i.test(raw)) return 'CNY';
	if (/^RMB$|^CN¥$/i.test(compact)) return 'CNY';
	return null;
}

export function isValidCategoryForType(expenseType: ExpenseType, category: string): category is ExpenseCategory {
	const list = EXPENSE_CATEGORY_OPTIONS[expenseType] as readonly string[];
	return list.includes(category);
}
