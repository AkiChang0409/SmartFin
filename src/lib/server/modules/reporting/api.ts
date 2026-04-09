import type { ModuleContext } from '../types';
import { DashboardService } from './service';

export type ReportingApi = ReturnType<typeof createReportingApi>;

export function createReportingApi(ctx: ModuleContext) {
	const dashboard = new DashboardService(ctx);

	return {
		getDashboardOverview: dashboard.getOverview.bind(dashboard)
	};
}
