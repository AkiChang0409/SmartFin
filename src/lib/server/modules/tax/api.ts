import type { ModuleContext } from '../types';
import { GstService, IncomeTaxService, TimeLogService, estimateSingaporeResidentTax } from './service';

export type TaxApi = ReturnType<typeof createTaxApi>;

export function createTaxApi(ctx: ModuleContext) {
	const gst = new GstService(ctx);
	const incomeTax = new IncomeTaxService(ctx);
	const timeLog = new TimeLogService(ctx);

	return {
		// GST
		getGstReturn: gst.getReturn.bind(gst),
		// Income tax
		getPersonIncome: incomeTax.getPersonIncome.bind(incomeTax),
		estimateResidentTax: incomeTax.estimateResidentTax.bind(incomeTax),
		estimateSingaporeResidentTax,
		// Time logs
		getTimeLogs: timeLog.getByPersonAndProject.bind(timeLog),
		createTimeLog: timeLog.create.bind(timeLog)
	};
}
