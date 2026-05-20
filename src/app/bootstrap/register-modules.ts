/**
 * Application composition root for active module registration.
 *
 * The platform registry owns only the generic registration mechanism; concrete
 * module selection belongs to the app layer.
 */
import { businessPartnerModule } from '$modules/business-partner';
import { coreModule } from '$platform/core';
import { documentIntakeModule } from '$modules/document-intake';
import { financeModule } from '$modules/finance';
import { hrModule } from '$modules/hr';
import { projectModule } from '$modules/project';
import { registerModules } from '$platform/registry/register-all';

// Wave 3.3 final state: 5 target business modules + 1 platform-internal core
// module (event-handler host only). The previous `person` and `employee`
// stubs were collapsed into `hr`.
registerModules([
	coreModule,
	businessPartnerModule,
	projectModule,
	hrModule,
	financeModule,
	documentIntakeModule
]);
