import type { InboundContract } from '../../../platform/registry/contracts';
import type { ProjectApi } from '../services/project-service';

export interface ProjectInboundContract {
	projects: ProjectApi;
}

export const PROJECT_PUBLIC_GROUPS = ['projects'] as const;

export type ProjectPublicGroup = (typeof PROJECT_PUBLIC_GROUPS)[number];

export const projectInboundContracts: InboundContract[] = [
	{
		id: 'project.projects',
		description: 'Project list, detail, membership, and financial summary operations',
		mode: 'sync',
		input: { name: 'project-input', version: 'v1' },
		output: { name: 'project-output', version: 'v1' },
		requiredPermissions: ['project:view']
	}
];
