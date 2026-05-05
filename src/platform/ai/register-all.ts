import {
	registerCapability,
	type PlatformCapability,
	type ToolManifest
} from './capability-registry';

export interface CapabilityRegistration {
	manifest: ToolManifest;
	capability: PlatformCapability<unknown, unknown>;
}

export function registerCapabilities(capabilities: readonly CapabilityRegistration[]): void {
	for (const entry of capabilities) {
		registerCapability(entry.manifest, entry.capability);
	}
}
