import type { EventBus, ModuleContext } from '../types';

/** Person module currently has no external event handlers */
export function registerPersonHandlers(_bus: EventBus, _ctx: ModuleContext) {
	// No handlers needed yet — person module is a data provider
}
