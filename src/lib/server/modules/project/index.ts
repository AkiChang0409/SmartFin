import type { ModuleDefinition } from '../types';
import { registerProjectHandlers } from './handlers';

export const projectModule: ModuleDefinition = {
	manifest: {
		id: 'project',
		name: 'Project',
		layer: 'base',
		dependencies: ['core', 'person', 'business-partner']
	},
	registerHandlers: registerProjectHandlers
};

export { createProjectApi, type ProjectApi } from './api';
