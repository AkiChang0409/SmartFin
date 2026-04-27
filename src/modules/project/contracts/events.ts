import type { EventContract } from '../../../platform/registry/contracts';

export const PROJECT_EVENT_TYPES = ['project.archived'] as const;

export type ProjectEventType = (typeof PROJECT_EVENT_TYPES)[number];

export interface ProjectEventContract<TType extends ProjectEventType = ProjectEventType> {
	type: TType;
	entityId?: string | null;
	payload?: Record<string, unknown>;
	occurredAt?: string;
}

export const projectEventContracts: EventContract[] = [
	{
		type: 'project.archived',
		payload: { name: 'project-archived-event', version: 'v1' },
		emittedWhen: 'A project is archived from the project module',
		retryable: true
	}
];
