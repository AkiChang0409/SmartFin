import { signJWT, verifyJWT, verifyPassword } from 'better-auth/crypto';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import type { AuthRole } from '$lib/server/auth/config';
import { getDb } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';

/** JWT `typ` claim so we do not treat arbitrary HS256 tokens as session grants. */
export const SMARTFIN_ACCESS_JWT_TYP = 'smartfin_access' as const;

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

export function isMobileJwtAuthEnabled(env: Env): boolean {
	const v = env.SMARTFIN_JWT_AUTH?.trim().toLowerCase();
	if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
	return true;
}

/** Signs mobile access tokens; falls back to `BETTER_AUTH_SECRET` if unset. */
export function getJwtSigningSecret(env: Env): string | null {
	const s = env.SMARTFIN_JWT_SECRET?.trim() || env.BETTER_AUTH_SECRET?.trim();
	return s || null;
}

export function getJwtExpiresSec(env: Env): number {
	const raw = env.SMARTFIN_JWT_EXPIRES_SEC?.trim();
	const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
	if (Number.isFinite(n) && n > 0 && n <= 365 * 24 * 3600) return n;
	return 604800;
}

type JwtPayload = {
	typ?: string;
	sub?: string;
	email?: string;
};

export async function resolveUserFromJwtBearer(
	request: Request,
	env: Env
): Promise<{ id: string; email: string; role: AuthRole } | null> {
	if (!isMobileJwtAuthEnabled(env)) return null;

	const secret = getJwtSigningSecret(env);
	if (!secret) return null;

	const h = request.headers.get('authorization');
	if (!h?.startsWith('Bearer ')) return null;
	const token = h.slice('Bearer '.length).trim();
	if (!token) return null;

	const payload = (await verifyJWT<JwtPayload>(token, secret)) as JwtPayload | null;
	if (!payload || payload.typ !== SMARTFIN_ACCESS_JWT_TYP) return null;
	const id = typeof payload.sub === 'string' ? payload.sub : '';
	const email = typeof payload.email === 'string' ? payload.email : '';
	if (!id || !email) return null;

	const db = getDb(env);
	const row = await db
		.select({
			id: schema.users.id,
			email: schema.users.email,
			role: schema.users.role
		})
		.from(schema.users)
		.where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
		.get();

	if (!row || row.email !== email) return null;

	return {
		id: row.id,
		email: row.email,
		role: (row.role as AuthRole) ?? 'employee'
	};
}

export async function signSmartfinAccessToken(env: Env, user: { id: string; email: string; role: string }) {
	const secret = getJwtSigningSecret(env);
	if (!secret) throw new Error('JWT signing secret is not configured');

	const expiresIn = getJwtExpiresSec(env);
	const token = await signJWT(
		{
			typ: SMARTFIN_ACCESS_JWT_TYP,
			sub: user.id,
			email: user.email,
			role: user.role
		},
		secret,
		expiresIn
	);

	return { token, expiresIn };
}

export async function verifyEmailPasswordForJwt(env: Env, emailRaw: string, password: string) {
	const emailNorm = normalizeEmail(emailRaw);
	const db = getDb(env);

	const rows = await db
		.select({
			userId: schema.users.id,
			email: schema.users.email,
			role: schema.users.role,
			hash: schema.accounts.password
		})
		.from(schema.accounts)
		.innerJoin(schema.users, eq(schema.accounts.userId, schema.users.id))
		.where(
			and(
				isNotNull(schema.accounts.password),
				isNull(schema.users.deletedAt),
				sql`lower(${schema.users.email}) = ${emailNorm}`
			)
		)
		.all();

	if (!rows.length) return null;

	for (const row of rows) {
		if (!row.hash) continue;
		const ok = await verifyPassword({ hash: row.hash, password });
		if (ok) {
			return {
				id: row.userId,
				email: row.email,
				role: (row.role as AuthRole) ?? 'employee'
			};
		}
	}
	return null;
}
