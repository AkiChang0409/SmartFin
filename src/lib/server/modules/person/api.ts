import type { ModuleContext } from '../types';
import { PersonService } from './service';

export type PersonApi = ReturnType<typeof createPersonApi>;

export function createPersonApi(ctx: ModuleContext) {
	const svc = new PersonService(ctx);

	return {
		getPersonById: svc.getPersonById.bind(svc),
		getPersonWithRoles: svc.getPersonWithRoles.bind(svc),
		createPerson: svc.createPerson.bind(svc),
		updatePerson: svc.updatePerson.bind(svc),
		// Legacy employee access
		getEmployeeById: svc.getEmployeeById.bind(svc),
		updateEmployee: svc.updateEmployee.bind(svc),
		softDeleteEmployee: svc.softDeleteEmployee.bind(svc)
	};
}
