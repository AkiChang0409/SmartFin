import type { ModuleContext } from '../types';
import { InvoiceService, PaymentService, DocumentLinkService } from './service';

export type ArApi = ReturnType<typeof createArApi>;

export function createArApi(ctx: ModuleContext) {
	const invoice = new InvoiceService(ctx);
	const payment = new PaymentService(ctx);
	const docLink = new DocumentLinkService(ctx);

	return {
		// Customer invoices
		createCustomerInvoice: invoice.createCustomerInvoice.bind(invoice),
		updateCustomerInvoice: invoice.updateCustomerInvoice.bind(invoice),
		confirmInvoice: invoice.confirmInvoice.bind(invoice),
		getProjectRevenue: invoice.getProjectRevenue.bind(invoice),
		getProjectPurchaseCost: invoice.getProjectPurchaseCost.bind(invoice),
		getCustomerInvoicesByProject: invoice.getCustomerInvoicesByProject.bind(invoice),
		getSupplierInvoicesByProject: invoice.getSupplierInvoicesByProject.bind(invoice),
		// GST helper
		calculateGst: InvoiceService.calculateGst,
		// Payments
		recordPayment: payment.recordPayment.bind(payment),
		getPaymentsByInvoice: payment.getByInvoice.bind(payment),
		getPaymentsByProject: payment.getByProject.bind(payment),
		// Document links
		linkDocuments: docLink.linkDocuments.bind(docLink),
		getLinkedDocuments: docLink.getLinkedDocuments.bind(docLink)
	};
}
