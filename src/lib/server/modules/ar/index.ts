import type { ModuleDefinition } from '../types';
import { registerArHandlers } from './handlers';

export const arModule: ModuleDefinition = {
	manifest: {
		id: 'ar',
		name: 'Accounts Receivable',
		layer: 'base',
		dependencies: ['core', 'business-partner', 'project']
	},
	registerHandlers: registerArHandlers
};

export { createArApi, type ArApi } from './api';
