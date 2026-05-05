import type { ModuleDefinition } from '$platform/modules/types';
import { registry, type ModuleRegistry } from './index';

export function registerModules(
	modules: readonly ModuleDefinition[],
	target: ModuleRegistry = registry
): void {
	for (const mod of modules) {
		target.register(mod);
	}
}
