export type PlatformRiskLevel = 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export interface PlatformCapabilityContext {
	tenantId?: string;
	userId?: string;
	useMock?: boolean;
}

export interface PlatformCapability<TInput, TOutput> {
	id: string;
	description: string;
	riskLevel: PlatformRiskLevel;
	execute(input: TInput, ctx: PlatformCapabilityContext): Promise<TOutput>;
}

export interface ToolManifest {
	id: string;
	ownerModule: string;
	description: string;
	riskLevel: PlatformRiskLevel;
	allowedAgents: string[];
	requiredUserPermissions: string[];
	requiresConfirmation: boolean;
	auditRequired: boolean;
	enabled: boolean;
}

interface RegistryEntry {
	manifest: ToolManifest;
	capability: PlatformCapability<unknown, unknown>;
}

const entries = new Map<string, RegistryEntry>();

export function registerCapability<TInput, TOutput>(
	manifest: ToolManifest,
	capability: PlatformCapability<TInput, TOutput>
): void {
	if (manifest.id !== capability.id) {
		throw new Error(
			`Capability id mismatch: manifest=${manifest.id} capability=${capability.id}`
		);
	}
	entries.set(manifest.id, {
		manifest,
		capability: capability as PlatformCapability<unknown, unknown>
	});
}

export function lookupCapability(id: string): RegistryEntry | undefined {
	return entries.get(id);
}

export function listCapabilities(): ToolManifest[] {
	return [...entries.values()].map((entry) => entry.manifest);
}

export function executeCapability(
	id: string,
	input: unknown,
	ctx: PlatformCapabilityContext
): Promise<unknown> {
	const entry = entries.get(id);
	if (!entry) {
		throw new Error(`Capability not registered: ${id}`);
	}
	if (!entry.manifest.enabled) {
		throw new Error(`Capability disabled: ${id}`);
	}
	return entry.capability.execute(input, ctx);
}

export function clearCapabilityRegistry(): void {
	entries.clear();
}
