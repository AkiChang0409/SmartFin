import type { ModuleDefinition } from '../types';
import { registerReportingHandlers } from './handlers';

export const reportingModule: ModuleDefinition = {
	manifest: {
		id: 'reporting',
		name: 'Reporting',
		layer: 'feature',
		dependencies: ['core', 'project', 'ar', 'employee', 'expense']
	},
	registerHandlers: registerReportingHandlers
};

export { createReportingApi, type ReportingApi } from './api';
