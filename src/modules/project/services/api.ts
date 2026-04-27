import type { ModuleContext } from '../../../lib/server/modules/types';
import { createProjectLegacySource } from '../adapters/legacy';
import { createProjectPublicApi } from './project-service';

export function createProjectApi(ctx: ModuleContext) {
	return createProjectPublicApi(createProjectLegacySource(ctx));
}
