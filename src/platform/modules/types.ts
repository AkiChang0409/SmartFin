import type { DBClient } from '$infrastructure/db';

// ---------------------------------------------------------------------------
// Module manifest — declares identity, layer, and dependencies
// ---------------------------------------------------------------------------

export type ModuleLayer = 'core' | 'base' | 'feature';

export interface ModuleManifest {
	/** Unique module identifier, e.g. 'project', 'ar', 'tax' */
	id: string;
	/** Human-readable name */
	name: string;
	/** core = always on; base = optional foundation; feature = composable */
	layer: ModuleLayer;
	/** IDs of modules this module depends on */
	dependencies: string[];
}

export type ModuleDeliveryMode = 'standalone' | 'suite';

export type DependencyStrength = 'strong' | 'weak';

export type FailureSemantics =
	| 'unavailable'
	| 'timeout'
	| 'not_found'
	| 'permission_denied'
	| 'invalid_response';

export type DependencyFailurePolicy = 'degrade' | 'block' | 'retry' | 'fail';

export type ContractInvocationMode = 'sync' | 'async' | 'event';

export interface ContractSchemaRef {
	name: string;
	version: string;
	description?: string;
}

export interface InboundContract {
	id: string;
	description: string;
	mode: ContractInvocationMode;
	input: ContractSchemaRef;
	output: ContractSchemaRef;
	requiredPermissions: string[];
}

export interface OutboundContract {
	id: string;
	provider: 'platform' | 'module' | 'external';
	providerId: string;
	strength: DependencyStrength;
	description: string;
	failurePolicy: DependencyFailurePolicy;
	failures: FailureSemantics[];
}

export interface EventContract {
	type: string;
	payload: ContractSchemaRef;
	emittedWhen: string;
	retryable: boolean;
}

export interface ModuleDependencyContract {
	moduleId: string;
	strength: DependencyStrength;
	description: string;
	failurePolicy: DependencyFailurePolicy;
}

export interface ModuleContract {
	inbound: InboundContract[];
	outbound: OutboundContract[];
	events: EventContract[];
}

export interface ModuleManifestV2 {
	id: string;
	name: string;
	layer: ModuleLayer;
	deliveryModes: ModuleDeliveryMode[];
	dependencies: ModuleDependencyContract[];
	routes: string[];
	workspaces: string[];
	permissions: string[];
	taskTypes: string[];
	workflows: string[];
	dashboardCards: string[];
	aiCapabilities: string[];
	contract: ModuleContract;
}

// ---------------------------------------------------------------------------
// Module context — universal context passed to all module code
// ---------------------------------------------------------------------------

export interface ModuleContext {
	env: Env;
	db: DBClient;
	user: App.Locals['user'];
	eventBus: EventBus;
}

// ---------------------------------------------------------------------------
// Event system
// ---------------------------------------------------------------------------

export interface DomainEvent<T = unknown> {
	/** Dot-notation type, e.g. 'invoice.confirmed' */
	type: string;
	/** Module ID that emitted the event */
	source: string;
	/** Event-specific payload */
	payload: T;
	/** ISO-8601 timestamp */
	timestamp: string;
	/** Links related events within one request */
	correlationId: string;
}

export type EventHandler<T = unknown> = (
	event: DomainEvent<T>,
	ctx: ModuleContext
) => Promise<void>;

export interface EventBus {
	/** Synchronous in-request dispatch — awaits all handlers sequentially */
	emit<T>(event: DomainEvent<T>): Promise<void>;
	/** Async dispatch via Cloudflare Queue */
	emitAsync<T>(event: DomainEvent<T>, queue: Queue): Promise<void>;
	/** Register a handler for an event type */
	on<T>(eventType: string, handler: EventHandler<T>): void;
	/** Remove a handler */
	off<T>(eventType: string, handler: EventHandler<T>): void;
}

// ---------------------------------------------------------------------------
// Module definition — the full contract a module must fulfil
// ---------------------------------------------------------------------------

export interface ModuleDefinition {
	manifest: ModuleManifest;
	manifestV2?: ModuleManifestV2;
	/** Register this module's event handlers on the bus */
	registerHandlers?: (bus: EventBus, ctx: ModuleContext) => void;
}
