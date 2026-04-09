import type { DomainEvent, EventBus, EventHandler, ModuleContext } from './types';

/**
 * Create a fresh EventBus instance per request.
 *
 * - `emit()` dispatches synchronously within the current request,
 *   awaiting each handler sequentially.
 * - `emitAsync()` sends the event to a Cloudflare Queue for
 *   out-of-request processing.
 * - Non-critical handler errors are caught and logged so they
 *   never crash the main request.
 */
export function createEventBus(): EventBus {
	const handlers = new Map<string, Set<EventHandler<any>>>();

	const bus: EventBus = {
		async emit<T>(event: DomainEvent<T>) {
			const set = handlers.get(event.type);
			if (!set) return;
			for (const handler of set) {
				try {
					// We intentionally do NOT have access to ModuleContext here —
					// handlers receive it at registration time via closure.
					await handler(event, undefined as unknown as ModuleContext);
				} catch (err) {
					console.error(
						`[EventBus] handler error for "${event.type}" from "${event.source}":`,
						err
					);
				}
			}
		},

		async emitAsync<T>(event: DomainEvent<T>, queue: Queue) {
			await queue.send(JSON.stringify(event));
		},

		on<T>(eventType: string, handler: EventHandler<T>) {
			let set = handlers.get(eventType);
			if (!set) {
				set = new Set();
				handlers.set(eventType, set);
			}
			set.add(handler as EventHandler<any>);
		},

		off<T>(eventType: string, handler: EventHandler<T>) {
			handlers.get(eventType)?.delete(handler as EventHandler<any>);
		}
	};

	return bus;
}

// ---------------------------------------------------------------------------
// Helper to build a DomainEvent with auto-populated timestamp
// ---------------------------------------------------------------------------

let _corrId: string | undefined;

/** Get or create a correlation ID for the current request scope */
export function correlationId(): string {
	if (!_corrId) _corrId = crypto.randomUUID();
	return _corrId;
}

/** Reset correlation ID (call at start of each request) */
export function resetCorrelationId(): void {
	_corrId = undefined;
}

export function createEvent<T>(
	type: string,
	source: string,
	payload: T
): DomainEvent<T> {
	return {
		type,
		source,
		payload,
		timestamp: new Date().toISOString(),
		correlationId: correlationId()
	};
}
