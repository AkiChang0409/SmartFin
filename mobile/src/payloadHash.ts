import * as Crypto from 'expo-crypto';

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(obj).sort()) {
			out[key] = canonicalize(obj[key]);
		}
		return out;
	}
	return value;
}

export async function hashConfirmationPayload(payload: unknown): Promise<string> {
	const serialized = JSON.stringify(canonicalize(payload));
	return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, serialized);
}
