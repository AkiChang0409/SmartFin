import { getApiBaseUrl } from '../config';
import { clearStoredToken, getStoredToken } from '../auth/storage';

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public body?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

async function parseJson(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text) return null;
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

type FetchOpts = RequestInit & { skipAuth?: boolean };

export async function apiFetch(path: string, init: FetchOpts = {}): Promise<Response> {
	const base = getApiBaseUrl();
	const { skipAuth, ...rest } = init;
	const headers = new Headers(rest.headers);

	const token = skipAuth ? null : await getStoredToken();
	if (token && !headers.has('Authorization')) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	if (rest.body !== undefined && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}

	return fetch(`${base}${path}`, { ...rest, headers });
}

export async function requireJson<T>(path: string, init?: FetchOpts): Promise<T> {
	const res = await apiFetch(path, init);
	const raw = (await parseJson(res)) as Record<string, unknown> | null;
	if (!res.ok) {
		const msg =
			(typeof raw?.error === 'string' && raw.error) ||
			(typeof raw?.message === 'string' && raw.message) ||
			res.statusText;
		if (res.status === 401) await clearStoredToken();
		throw new ApiError(msg, res.status, raw);
	}
	if (raw?.ok !== true) {
		const msg = typeof raw?.error === 'string' ? raw.error : 'Request failed';
		throw new ApiError(msg, res.status, raw);
	}
	if (raw.data !== undefined) return raw.data as T;
	return raw as unknown as T;
}

export type LoginResponse = {
	ok: boolean;
	accessToken: string;
	expiresIn: number;
	user: { id: string; email: string; role: string };
};

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
	const res = await apiFetch('/api/mobile/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
		skipAuth: true
	});
	const raw = (await parseJson(res)) as Record<string, unknown> | null;
	if (!res.ok || !raw || raw.ok !== true) {
		const msg = typeof raw?.error === 'string' ? raw.error : 'Login failed';
		throw new ApiError(msg, res.status, raw);
	}
	return raw as unknown as LoginResponse;
}

export async function meRequest(): Promise<{ id: string; email: string; role: string }> {
	const res = await apiFetch('/api/mobile/auth/me');
	const raw = (await parseJson(res)) as Record<string, unknown> | null;
	if (!res.ok) {
		const msg =
			(typeof raw?.error === 'string' && raw.error) || res.statusText;
		if (res.status === 401) await clearStoredToken();
		throw new ApiError(msg, res.status, raw);
	}
	if (raw?.ok === true && raw.user && typeof raw.user === 'object') {
		return raw.user as { id: string; email: string; role: string };
	}
	throw new ApiError('Invalid /me response', 500, raw);
}

export type PresignData = {
	key: string;
	uploadUrl: string;
	expiresInSeconds: number;
};

export async function presignUpload(body: {
	fileName: string;
	contentType: string;
	projectId: string;
	entityType: string;
	entityId: string;
}): Promise<PresignData> {
	return requireJson<PresignData>('/api/upload/presign', {
		method: 'POST',
		body: JSON.stringify(body)
	});
}

export async function putUploadBinary(uploadUrlPath: string, contentType: string, body: ArrayBuffer) {
	const base = getApiBaseUrl();
	const path = uploadUrlPath.startsWith('http') ? uploadUrlPath : `${base}${uploadUrlPath}`;
	const token = await getStoredToken();
	const res = await fetch(path, {
		method: 'PUT',
		headers: {
			'Content-Type': contentType,
			...(token ? { Authorization: `Bearer ${token}` } : {})
		},
		body
	});
	if (!res.ok) {
		const t = await res.text();
		throw new ApiError(t || 'Upload failed', res.status);
	}
}

/** multipart：不要设置 Content-Type，由运行时带 boundary。 */
export async function apiFetchMultipart(path: string, formData: FormData): Promise<Response> {
	const base = getApiBaseUrl();
	const token = await getStoredToken();
	return fetch(`${base}${path}`, {
		method: 'POST',
		headers: {
			...(token ? { Authorization: `Bearer ${token}` } : {})
		},
		body: formData
	});
}

function appendRnFile(fd: FormData, fieldName: string, uri: string, fileName: string, mime: string) {
	fd.append(
		fieldName,
		{ uri, name: fileName, type: mime || 'application/octet-stream' } as unknown as Blob
	);
}

export type WorkersVisionData = { text: string; model?: string; fileName?: string };

/** 原生用 `uri`（DocumentPicker）；Expo Web 等环境用标准 `Blob`/`File`。 */
export async function postWorkersVisionImage(
	params: { fileName: string; mime: string } & ({ uri: string } | { blob: Blob })
): Promise<WorkersVisionData> {
	const fd = new FormData();
	if ('blob' in params) {
		fd.append('file', params.blob, params.fileName);
	} else {
		appendRnFile(fd, 'file', params.uri, params.fileName, params.mime);
	}
	const res = await apiFetchMultipart('/api/ocr/workers-vision', fd);
	const raw = (await parseJson(res)) as Record<string, unknown> | null;
	if (!res.ok || !raw || raw.ok !== true) {
		const msg = (typeof raw?.error === 'string' && raw.error) || res.statusText;
		if (res.status === 401) await clearStoredToken();
		throw new ApiError(msg, res.status, raw);
	}
	return raw.data as WorkersVisionData;
}

export type ExpenseDetectResult = {
	fileName?: string;
	fileType?: string;
	ocr?: { warnings?: string[]; extractionMethod?: string; ocrProvider?: string; llmProvider?: string };
	context?: { expenseType?: string; category?: string; docType?: string | null };
	suggestions?: Record<string, unknown>;
	metaHints?: Record<string, string>;
	extracted?: unknown;
	rawTextPreview?: string;
	rawTextLength?: number;
	confidence?: number;
	provider?: string;
};

export type ExpenseDetectInput = {
	expenseType: string;
	category: string;
	docType?: string | null;
	rawText?: string;
} & (
	| { uri: string; fileName: string; mime: string }
	| { documentId: string; fileName?: string; mime?: string }
);

export async function postExpenseDetect(params: ExpenseDetectInput): Promise<ExpenseDetectResult> {
	const fd = new FormData();
	if ('uri' in params) {
		appendRnFile(fd, 'file', params.uri, params.fileName, params.mime);
	} else {
		fd.append('documentId', params.documentId);
	}
	fd.append('expenseType', params.expenseType);
	fd.append('category', params.category);
	if (params.docType) fd.append('docType', params.docType);
	if (params.rawText?.trim()) fd.append('rawText', params.rawText.trim());

	const res = await apiFetchMultipart('/api/expenses/detect', fd);
	const raw = (await parseJson(res)) as Record<string, unknown> | null;
	if (!res.ok || !raw || raw.ok !== true) {
		const msg =
			(typeof raw?.error === 'string' && raw.error) ||
			(typeof raw?.message === 'string' && raw.message) ||
			res.statusText;
		if (res.status === 401) await clearStoredToken();
		throw new ApiError(msg, res.status, raw);
	}
	return (raw.data !== undefined ? raw.data : raw) as ExpenseDetectResult;
}

/** ----------------------------------------------------------------------- */
/** 两段式上传：第一段「仅入库 documents」 + 待处理列表/详情                  */
/** ----------------------------------------------------------------------- */

export type FinancialPendingDocument = {
	documentId: string;
	projectId: string | null;
	fileKey: string;
	fileName: string;
	fileType: string;
	docType: 'invoice' | 'receipt' | 'contract' | 'po' | 'bom' | 'quotation' | 'other';
	ocrStatus: 'pending' | 'processing' | 'done' | 'failed';
	notes: string | null;
	createdAt: string;
};

export type FinancialDocumentDetail = FinancialPendingDocument & {
	purpose: 'financial' | 'reference';
	entityType: string | null;
	entityId: string | null;
	updatedAt: string;
};

export async function createFinancialDocumentPending(body: {
	key: string;
	fileName: string;
	fileType: string;
	projectId?: string | null;
	docType?: 'invoice' | 'receipt' | 'po' | 'other';
	notes?: string | null;
}): Promise<{ documentId: string; status: 'pending'; message?: string }> {
	return requireJson<{ documentId: string; status: 'pending'; message?: string }>(
		'/api/documents/financial-upload',
		{
			method: 'POST',
			body: JSON.stringify({
				...body,
				projectId: body.projectId ?? null
			})
		}
	);
}

export async function listFinancialPendingDocuments(): Promise<{
	items: FinancialPendingDocument[];
}> {
	return requireJson<{ items: FinancialPendingDocument[] }>('/api/documents/financial-pending');
}

export async function getFinancialDocumentDetail(
	documentId: string
): Promise<FinancialDocumentDetail> {
	return requireJson<FinancialDocumentDetail>(
		`/api/documents/${encodeURIComponent(documentId)}/financial-detail`
	);
}

export type ConfirmResult = { entityId: string; status: string };

export async function confirmUpload(body: {
	key: string;
	fileType: string;
	projectId: string;
	entityType: string;
	entityId: string;
	triggerOcr?: boolean;
}): Promise<ConfirmResult> {
	return requireJson<ConfirmResult>('/api/upload/confirm', {
		method: 'POST',
		body: JSON.stringify(body)
	});
}

/** 与网页 `/expenses/upload` 一致：文件已在 R2 后提交费用字段（可不关联项目，`projectId: null`）。 */
export type SaveExpenseDocumentBody = {
	idempotencyKey: string;
	/** 关联既有 documents 行（两段式上传第二段提交 expense 时使用） */
	documentId?: string;
	/** 全新上传时必填；从 documentId 复用时可省略 */
	key?: string;
	fileName?: string;
	fileType?: string;
	projectId?: string | null;
	expenseType?: 'opex' | 'sales_cost';
	category?: string;
	docType?: string | null;
	date: string;
	amount: number;
	currency?: string;
	gstAmount?: number | null;
	vendorOrSupplier?: string | null;
	staffName?: string | null;
	notes?: string | null;
	reimbursement?: boolean;
	businessTrip?: boolean;
	destination?: string | null;
	metadata?: Record<string, unknown> | null;
};

export async function saveExpenseDocument(
	body: SaveExpenseDocumentBody
): Promise<{ documentId: string; expenseId: string; status: string; message?: string }> {
	return requireJson<{ documentId: string; expenseId: string; status: string; message?: string }>(
		'/api/expenses/upload',
		{
			method: 'POST',
			body: JSON.stringify({
				...body,
				projectId: body.projectId ?? null
			})
		}
	);
}

/** 两段式：从「待处理 financial 文档」提交 expense（文件已在 R2，仅追加 expense 字段）。 */
export async function saveExpenseFromPendingDocument(
	documentId: string,
	body: Omit<SaveExpenseDocumentBody, 'documentId' | 'key'>
): Promise<{ documentId: string; expenseId: string; status: string; message?: string }> {
	return saveExpenseDocument({ ...body, documentId });
}

export type OcrStatusInvoice = {
	id: string;
	status: string;
	confidence: number | null;
	result: unknown;
};

export async function getOcrInvoiceStatus(invoiceId: string): Promise<OcrStatusInvoice> {
	return requireJson<OcrStatusInvoice>(`/api/ocr/status/${encodeURIComponent(invoiceId)}`);
}
