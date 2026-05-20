import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	// v4 final schema sources. Each target module owns its own *.schema.ts files;
	// platform/auth and infrastructure/storage hold cross-cutting tables.
	//
	// Historical 0000–0025 SQL migrations are archived in
	// drizzle/migrations.archive-pre-v4/ — see Wave 0 follow-up #1 in
	// ref_files/v4/SmartFin_Migration_Plan.md.
	schema: [
		'./src/modules/**/repositories/*.schema.ts',
		'./src/platform/**/*.schema.ts',
		'./src/platform/auth/auth-tables.ts',
		'./src/infrastructure/**/*.schema.ts'
	],
	out: './drizzle/migrations',
	dialect: 'sqlite',
	driver: 'd1-http',
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? 'replace-me',
		databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID ?? 'replace-me',
		token: process.env.CLOUDFLARE_API_TOKEN ?? 'replace-me'
	}
});
