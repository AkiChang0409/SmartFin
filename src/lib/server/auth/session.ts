import type { Cookies } from '@sveltejs/kit';

import type { AuthRole } from './config';

const SESSION_COOKIE = 'smartfin_session';
const MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionPayload = {
	userId: string;
	email: string;
	role: AuthRole;
	exp: number;
};

function toBase64Url(input: string): string {
	const bytes = new TextEncoder().encode(input);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): string {
	const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
	const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

async function sign(secret: string, value: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
	const bytes = new Uint8Array(signature);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function createSessionCookie(
	cookies: Cookies,
	user: { userId: string; email: string; role: AuthRole },
	secret: string
) {
	const payload: SessionPayload = {
		userId: user.userId,
		email: user.email,
		role: user.role,
		exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS
	};
	const body = toBase64Url(JSON.stringify(payload));
	const signature = await sign(secret, body);
	cookies.set(SESSION_COOKIE, `${body}.${signature}`, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		maxAge: MAX_AGE_SECONDS
	});
}

export async function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export async function readSessionCookie(
	cookies: Cookies,
	secret: string
): Promise<{ id: string; email: string; role: AuthRole } | null> {
	const raw = cookies.get(SESSION_COOKIE);
	if (!raw) return null;
	const [body, signature] = raw.split('.');
	if (!body || !signature) return null;
	const expected = await sign(secret, body);
	if (expected !== signature) return null;

	let parsed: SessionPayload | null = null;
	try {
		parsed = JSON.parse(fromBase64Url(body)) as SessionPayload;
	} catch {
		return null;
	}
	if (!parsed) return null;
	if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
	return {
		id: parsed.userId,
		email: parsed.email,
		role: parsed.role
	};
}
