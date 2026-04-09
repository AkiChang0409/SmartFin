import type { ModuleDefinition } from '../types';
import { registerPersonHandlers } from './handlers';

export const personModule: ModuleDefinition = {
	manifest: {
		id: 'person',
		name: 'Person',
		layer: 'base',
		dependencies: ['core']
	},
	registerHandlers: registerPersonHandlers
};

export { createPersonApi, type PersonApi } from './api';
