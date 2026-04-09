import type { EventBus, ModuleContext } from '../types';

/**
 * Project module listens to financial events for potential cache invalidation.
 * Currently no-op — profit is calculated on-demand from live data.
 */
export function registerProjectHandlers(bus: EventBus, _ctx: ModuleContext) {
	// Future: cache invalidation on invoice.confirmed, expense.created, payout.settled
}
