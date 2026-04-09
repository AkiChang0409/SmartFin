import type { ModuleDefinition } from '../types';
import { registerTaxHandlers } from './handlers';

export const taxModule: ModuleDefinition = {
	manifest: {
		id: 'tax',
		name: 'Tax',
		layer: 'feature',
		dependencies: ['core', 'person', 'ar', 'employee']
	},
	registerHandlers: registerTaxHandlers
};

export { createTaxApi, type TaxApi } from './api';
