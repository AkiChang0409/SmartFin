export const PROJECT_FAILURE_CODES = [
	'unavailable',
	'timeout',
	'not_found',
	'permission_denied',
	'invalid_response'
] as const;

export type ProjectFailureCode = (typeof PROJECT_FAILURE_CODES)[number];

export interface ProjectFailureSemantics {
	code: ProjectFailureCode;
	blocking: boolean;
	retryable: boolean;
}

export const projectFailureSemantics: ProjectFailureSemantics[] = [
	{ code: 'unavailable', blocking: true, retryable: true },
	{ code: 'timeout', blocking: true, retryable: true },
	{ code: 'not_found', blocking: false, retryable: false },
	{ code: 'permission_denied', blocking: true, retryable: false },
	{ code: 'invalid_response', blocking: true, retryable: false }
];
