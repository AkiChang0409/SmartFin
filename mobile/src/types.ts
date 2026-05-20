export type ProcessingStatus =
	| 'received'
	| 'stored'
	| 'text_extraction_pending'
	| 'text_extracted'
	| 'ocr_pending'
	| 'ocr_completed'
	| 'classification_pending'
	| 'classified'
	| 'fields_extraction_pending'
	| 'ready_for_review'
	| 'ready_for_workflow'
	| 'confirmed'
	| 'abandoned'
	| 'needs_manual_review'
	| 'failed';

export interface SuggestedFieldsResult {
	fields: Record<string, unknown>;
	confidence?: Record<string, number>;
	evidence?: Record<string, unknown>;
}

export interface DocumentArtifactView {
	id: string;
	tenantId: string;
	source: string;
	processingStatus: ProcessingStatus;
	documentType?: string;
	originalFile: {
		fileId: string;
		fileName: string;
		mimeType: string;
		sizeBytes: number;
	};
	textExtraction?: {
		method: string;
		status: string;
		confidence?: number;
		language?: string;
		provider?: string;
		error?: string;
	};
	classification?: {
		documentType?: string;
		confidence?: number;
		possibleTypes?: Array<{ documentType: string; confidence?: number }>;
	};
	suggestedFields?: SuggestedFieldsResult;
	suggestedCategoryId?: string;
	securityFlags?: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CategoryChoice {
	id: string;
	label: string;
	sublabel?: string;
	bucket: 'expense' | 'revenue' | 'document_only';
	expenseType?: string | null;
	persistTarget: string | null;
	llmFields: readonly string[];
	userFields: readonly string[];
	requiresProject?: boolean;
}

export interface ProjectInfo {
	id: string;
	name: string;
	customerName: string | null;
	status: string;
	startDate: string | null;
	endDate: string | null;
}

export interface ConfirmPayload {
	documentId: string;
	categoryId: string;
	supplierId: string | null;
	poId: string | null;
	projectId: string | null;
	fields: Record<string, unknown>;
}
