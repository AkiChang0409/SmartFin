import type { RequestEvent } from '@sveltejs/kit';
import { getDb } from '../db';
import type { ModuleContext } from './types';
import { createEventBus, resetCorrelationId } from './event-bus';
import { registry } from './registry';

/**
 * Create a ModuleContext from a SvelteKit RequestEvent.
 *
 * Replaces the repeated pattern in every route handler:
 * ```
 * if (!platform) return fail('...', 500);
 * const db = getDb(platform.env);
 * ```
 *
 * Also creates a fresh EventBus and registers handlers from all
 * enabled modules.
 */
export function createModuleContext(event: RequestEvent): ModuleContext {
	const platform = event.platform;
	if (!platform) {
		throw new Error('Cloudflare platform bindings are required');
	}

	// Fresh correlation ID per request
	resetCorrelationId();

	const env = platform.env;
	const db = getDb(env);
	const user = event.locals.user;
	const eventBus = createEventBus();

	const ctx: ModuleContext = { env, db, user, eventBus };

	// Register event handlers from all modules.
	// In Phase 9 this will be filtered by enabled modules via KV lookup.
	const modules = registry.getAll();
	for (const mod of modules) {
		mod.registerHandlers?.(eventBus, ctx);
	}

	return ctx;
}

/**
 * Create a ModuleContext from raw Env + user (for non-SvelteKit contexts
 * like Queue consumers or scheduled workers).
 */
export function createWorkerContext(
	env: Env,
	user?: App.Locals['user']
): ModuleContext {
	resetCorrelationId();

	const db = getDb(env);
	const eventBus = createEventBus();

	const ctx: ModuleContext = { env, db, user: user ?? null, eventBus };

	const modules = registry.getAll();
	for (const mod of modules) {
		mod.registerHandlers?.(eventBus, ctx);
	}

	return ctx;
}
