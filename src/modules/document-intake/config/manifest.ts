import type { ModuleManifestV2 } from '$platform/registry/contracts';
import {
	documentIntakeEventContracts,
	documentIntakeInboundContracts,
	documentIntakeOutboundContracts
} from '../contracts';

export const documentIntakeManifestV2: ModuleManifestV2 = {
	id: 'document-intake',
	name: 'Document Intake',
	layer: 'feature',
	deliveryModes: ['standalone', 'suite'],
	dependencies: [
		{
			moduleId: 'core',
			strength: 'strong',
			description: 'Document Intake requires core platform context and settings',
			failurePolicy: 'block'
		},
		{
			moduleId: 'finance',
			strength: 'weak',
			description: 'Document Intake can hand off extracted records to Finance',
			failurePolicy: 'block'
		},
		{
			moduleId: 'project',
			strength: 'weak',
			description: 'Document Intake can suggest project matches for extracted text',
			failurePolicy: 'degrade'
		}
	],
	routes: ['/api/documents', '/api/intake', '/api/doc-hub', '/api/upload', '/api/ocr'],
	workspaces: ['document-intake'],
	permissions: ['finance:view', 'finance:edit'],
	taskTypes: ['document-intake-task'],
	workflows: ['document-intake.intake-pipeline'],
	dashboardCards: [],
	aiCapabilities: ['document-intake.classify-document'],
	contract: {
		inbound: documentIntakeInboundContracts,
		outbound: documentIntakeOutboundContracts,
		events: documentIntakeEventContracts
	}
};
