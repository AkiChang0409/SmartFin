import type { ModuleManifest as LegacyModuleManifest, ModuleManifestV2 } from '../modules/types';

export type {
	ContractInvocationMode,
	ContractSchemaRef,
	DependencyFailurePolicy,
	DependencyStrength,
	EventContract,
	FailureSemantics,
	InboundContract,
	ModuleContract,
	ModuleDeliveryMode,
	ModuleDependencyContract,
	ModuleManifestV2,
	OutboundContract
} from '../modules/types';

export function toLegacyModuleManifest(manifest: ModuleManifestV2): LegacyModuleManifest {
	return {
		id: manifest.id,
		name: manifest.name,
		layer: manifest.layer,
		dependencies: manifest.dependencies.map((dependency) => dependency.moduleId)
	};
}
