import type { ModuleContext } from '../types';
import { ProjectService } from './service';

export type ProjectApi = ReturnType<typeof createProjectApi>;

export function createProjectApi(ctx: ModuleContext) {
	const svc = new ProjectService(ctx);

	return {
		getById: svc.getById.bind(svc),
		getWithCustomer: svc.getWithCustomer.bind(svc),
		list: svc.list.bind(svc),
		create: svc.create.bind(svc),
		update: svc.update.bind(svc),
		archive: svc.archive.bind(svc),
		softDelete: svc.softDelete.bind(svc),
		getMembers: svc.getMembers.bind(svc),
		addMember: svc.addMember.bind(svc),
		removeMember: svc.removeMember.bind(svc),
		getProjectFinancials: svc.getProjectFinancials.bind(svc)
	};
}
