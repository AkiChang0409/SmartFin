import type { EventBus, ModuleContext } from '../types';

/**
 * Employee module listens to project.archived to finalize draft payouts.
 */
export function registerEmployeeHandlers(bus: EventBus, _ctx: ModuleContext) {
	bus.on('project.archived', async (_event) => {
		// Future: finalize outstanding draft payouts for the archived project
		// const p = event.payload as { projectId: string };
		// await finalizeDraftPayouts(ctx, p.projectId);
	});
}
