import type { EventBus, ModuleContext } from '../types';

/** AR module currently has no external event handlers */
export function registerArHandlers(_bus: EventBus, _ctx: ModuleContext) {
	// AR is primarily an event emitter, not listener
}
