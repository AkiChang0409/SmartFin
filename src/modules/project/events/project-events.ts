import {
	PROJECT_EVENT_TYPES,
	type ProjectEventContract,
	type ProjectEventType
} from '../contracts/events';

export { PROJECT_EVENT_TYPES };

export function createProjectEvent<TType extends ProjectEventType>(
	type: TType,
	payload?: Record<string, unknown>
): ProjectEventContract<TType> {
	return {
		type,
		payload,
		occurredAt: new Date().toISOString()
	};
}
