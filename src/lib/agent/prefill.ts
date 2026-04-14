import { writable, get } from 'svelte/store';

export type AgentPrefillData = Record<string, unknown>;

export const agentPrefill = writable<AgentPrefillData>({});

/**
 * Consume prefill data (read and clear).
 * Call this in form pages to get prefilled values from Agent.
 */
export function consumePrefill(): AgentPrefillData {
	const value = get(agentPrefill);
	agentPrefill.set({});
	return value;
}

/**
 * Set prefill data (used by AgentChat before navigation).
 */
export function setPrefill(data: AgentPrefillData): void {
	agentPrefill.set(data);
}

/**
 * Check if there's pending prefill data without consuming it.
 */
export function hasPrefill(): boolean {
	const value = get(agentPrefill);
	return Object.keys(value).length > 0;
}
