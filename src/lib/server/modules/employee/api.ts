import type { ModuleContext } from '../types';
import { CompensationService, SettlementService, AllocationService } from './service';
import { PayoutRepository } from './repository';

export type EmployeeApi = ReturnType<typeof createEmployeeApi>;

export function createEmployeeApi(ctx: ModuleContext) {
	const comp = new CompensationService(ctx);
	const settlement = new SettlementService(ctx);
	const allocation = new AllocationService(ctx);
	const payoutRepo = new PayoutRepository(ctx.db);

	return {
		// Compensation
		getProjectComponents: comp.getProjectComponents.bind(comp),
		getEmployeeComponents: comp.getEmployeeComponents.bind(comp),
		addProjectComponent: comp.addProjectComponent.bind(comp),
		removeProjectComponent: comp.removeProjectComponent.bind(comp),
		addEmployeeComponent: comp.addEmployeeComponent.bind(comp),
		removeEmployeeComponent: comp.removeEmployeeComponent.bind(comp),
		// Settlement
		settleProjectComponents: settlement.settleProjectComponents.bind(settlement),
		settleCompanyAllocation: settlement.settleCompanyAllocation.bind(settlement),
		// Allocation
		getAllocationsByEmployee: allocation.getByEmployee.bind(allocation),
		getAllocationsByProject: allocation.getByProject.bind(allocation),
		saveAllocations: allocation.saveAllocations.bind(allocation),
		// Payouts
		getProjectStaffCost: payoutRepo.getProjectStaffCost.bind(payoutRepo),
		getPayoutsByProject: payoutRepo.findByProject.bind(payoutRepo)
	};
}
