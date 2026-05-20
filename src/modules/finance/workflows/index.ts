import { allowanceRecordingWorkflow } from './allowance-recording';
import { financialDocumentIntakeWorkflow } from './financial-document-intake';
import { vendorInvoiceIntakeWorkflow } from './vendor-invoice-intake';

export const financeWorkflows = [
	vendorInvoiceIntakeWorkflow,
	financialDocumentIntakeWorkflow,
	allowanceRecordingWorkflow
] as const;

export const financeWorkflowIds = financeWorkflows.map((workflow) => workflow.id);
