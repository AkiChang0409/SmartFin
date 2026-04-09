// Module system — public API
export type {
	ModuleLayer,
	ModuleManifest,
	ModuleContext,
	ModuleDefinition,
	DomainEvent,
	EventHandler,
	EventBus
} from './types';

export { createEventBus, createEvent, correlationId, resetCorrelationId } from './event-bus';
export { ModuleRegistry, registry } from './registry';
export { createModuleContext, createWorkerContext } from './context';
export {
	NotFoundError,
	ValidationError,
	ConflictError,
	ForbiddenError,
	ModuleDependencyError
} from './errors';
