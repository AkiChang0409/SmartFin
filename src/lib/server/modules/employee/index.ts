import type { ModuleDefinition } from '../types';
import { registerEmployeeHandlers } from './handlers';

export const employeeModule: ModuleDefinition = {
	manifest: {
		id: 'employee',
		name: 'Employee',
		layer: 'base',
		dependencies: ['core', 'person', 'project']
	},
	registerHandlers: registerEmployeeHandlers
};

export { createEmployeeApi, type EmployeeApi } from './api';
