import type { ModuleDefinition } from './types';
import { ModuleDependencyError } from './errors';

/**
 * ModuleRegistry — manages module registration and dependency resolution.
 *
 * Modules register statically at import time. The registry validates
 * dependency chains and supports topological ordering for initialization.
 */
export class ModuleRegistry {
	private modules = new Map<string, ModuleDefinition>();

	register(mod: ModuleDefinition): void {
		this.modules.set(mod.manifest.id, mod);
	}

	get(id: string): ModuleDefinition | undefined {
		return this.modules.get(id);
	}

	getAll(): ModuleDefinition[] {
		return [...this.modules.values()];
	}

	/**
	 * Return definitions for the given IDs.
	 * Core-layer modules are always included regardless of the input list.
	 */
	getEnabled(enabledIds: string[]): ModuleDefinition[] {
		const ids = new Set(enabledIds);
		const result: ModuleDefinition[] = [];
		for (const mod of this.modules.values()) {
			if (mod.manifest.layer === 'core' || ids.has(mod.manifest.id)) {
				result.push(mod);
			}
		}
		return result;
	}

	/**
	 * Resolve all transitive dependencies for a module (topological order).
	 * Returns an ordered list where each module appears after its dependencies.
	 */
	resolveDependencies(moduleId: string): string[] {
		const visited = new Set<string>();
		const result: string[] = [];

		const visit = (id: string) => {
			if (visited.has(id)) return;
			visited.add(id);
			const mod = this.modules.get(id);
			if (!mod) return;
			for (const dep of mod.manifest.dependencies) {
				visit(dep);
			}
			result.push(id);
		};

		visit(moduleId);
		return result;
	}

	/**
	 * Validate that all dependencies for the given enabled modules are present.
	 * Returns `{ valid: true }` or `{ valid: false, missing }` with details.
	 */
	validateDependencies(enabledIds: string[]): {
		valid: boolean;
		missing: { moduleId: string; missingDeps: string[] }[];
	} {
		const enabled = new Set(enabledIds);
		// Core modules are always available
		for (const mod of this.modules.values()) {
			if (mod.manifest.layer === 'core') enabled.add(mod.manifest.id);
		}

		const missing: { moduleId: string; missingDeps: string[] }[] = [];

		for (const id of enabledIds) {
			const mod = this.modules.get(id);
			if (!mod) continue;
			const missingDeps = mod.manifest.dependencies.filter((dep) => !enabled.has(dep));
			if (missingDeps.length > 0) {
				missing.push({ moduleId: id, missingDeps });
			}
		}

		return { valid: missing.length === 0, missing };
	}

	/**
	 * Check which modules would be affected if `moduleId` is disabled.
	 * Returns IDs of modules that depend on it (directly or transitively).
	 */
	getDependents(moduleId: string, enabledIds: string[]): string[] {
		const dependents: string[] = [];
		for (const id of enabledIds) {
			if (id === moduleId) continue;
			const deps = this.resolveDependencies(id);
			if (deps.includes(moduleId)) {
				dependents.push(id);
			}
		}
		return dependents;
	}

	/**
	 * Get initialization order (topological sort of all enabled modules).
	 */
	getInitOrder(enabledIds: string[]): string[] {
		const enabled = new Set(enabledIds);
		// Include core modules
		for (const mod of this.modules.values()) {
			if (mod.manifest.layer === 'core') enabled.add(mod.manifest.id);
		}

		const visited = new Set<string>();
		const result: string[] = [];

		const visit = (id: string) => {
			if (visited.has(id) || !enabled.has(id)) return;
			visited.add(id);
			const mod = this.modules.get(id);
			if (!mod) return;
			for (const dep of mod.manifest.dependencies) {
				visit(dep);
			}
			result.push(id);
		};

		for (const id of enabled) {
			visit(id);
		}

		return result;
	}
}

/** Singleton registry instance — modules register here at import time */
export const registry = new ModuleRegistry();
