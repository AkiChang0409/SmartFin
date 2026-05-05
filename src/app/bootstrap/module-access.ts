import type { DBClient } from '$infrastructure/db';
import { CompanySettingsRepository } from '$modules/legacy/server-modules/core/repository';
import {
	isPathEnabled as isMappedPathEnabled,
	resolveEnabledModuleIds,
	type ModulePathMapping
} from '$platform/config';

const MODULE_PATH_MAPPINGS: ModulePathMapping[] = [
	{ prefix: '/expenses', moduleId: 'expense' },
	{ prefix: '/api/expenses', moduleId: 'expense' },
	{ prefix: '/api/business-trips', moduleId: 'expense' },
	{ prefix: '/ar', moduleId: 'ar' },
	{ prefix: '/finance', moduleId: 'ar' },
	{ prefix: '/projects', moduleId: 'project' },
	{ prefix: '/customers', moduleId: 'business-partner' },
	{ prefix: '/suppliers', moduleId: 'business-partner' },
	{ prefix: '/api/customers', moduleId: 'business-partner' },
	{ prefix: '/api/suppliers', moduleId: 'business-partner' },
	{ prefix: '/employees', moduleId: 'employee' },
	{ prefix: '/tax', moduleId: 'tax' },
	{ prefix: '/reports', moduleId: 'reporting' },
	{ prefix: '/settings', moduleId: 'core' },
	{ prefix: '/api/ar', moduleId: 'ar' },
	{ prefix: '/api/projects', moduleId: 'project' },
	{ prefix: '/api/employees', moduleId: 'employee' },
	{ prefix: '/api/tax', moduleId: 'tax' },
	{ prefix: '/api/reports', moduleId: 'reporting' },
	{ prefix: '/api/dashboard', moduleId: 'reporting' },
	{ prefix: '/api/settings', moduleId: 'core' },
	{ prefix: '/api/documents', moduleId: 'ar' }
];

export async function getEnabledModuleIds(db: DBClient): Promise<string[]> {
	const repo = new CompanySettingsRepository(db);
	const raw = await repo.get<unknown>('modules.enabled');
	return resolveEnabledModuleIds(raw);
}

export function isPathEnabled(pathname: string, enabledModuleIds: readonly string[]): boolean {
	return isMappedPathEnabled(pathname, enabledModuleIds, MODULE_PATH_MAPPINGS);
}
