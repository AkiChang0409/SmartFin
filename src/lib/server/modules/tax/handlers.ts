import type { EventBus, ModuleContext } from '../types';

/**
 * Tax module listens to invoice and payout events to keep tax data current.
 */
export function registerTaxHandlers(bus: EventBus, _ctx: ModuleContext) {
	// Listen to invoice.confirmed for GST working data
	bus.on('invoice.confirmed', async (_event) => {
		// Future: refresh GST working data for the relevant quarter
		// const p = event.payload as InvoiceConfirmedPayload;
		// await gstService.refreshQuarterData(p);
	});

	// Listen to payout.settled for PersonIncome records
	bus.on('payout.settled', async (_event) => {
		// Future: create/update PersonIncome records
		// const p = event.payload as PayoutSettledPayload;
		// await incomeTaxService.recordPayoutIncome(p);
	});
}
