import type { DomainAgentDef, RouterResult, DomainResult, AgentAction, QueryContext } from '../types';
import { callAiJsonWithSource } from '$lib/server/services/ai-agent';
import { executeQuery } from '../query-handlers';

export async function executeDomainAgent(
	env: Env,
	domain: DomainAgentDef,
	routerResult: RouterResult,
	userRole: string,
	queryCtx?: QueryContext
): Promise<DomainResult> {
	const availableActions = domain.actions.filter((a) =>
		a.required_roles.includes(userRole as AgentAction['required_roles'][number])
	);

	if (availableActions.length === 0) {
		return {
			reply: '你当前没有权限操作此模块的功能。',
			action: null,
			prefill: {},
			missing_context: []
		};
	}

	const isQueryIntent = routerResult.intent_type === 'query';
	const systemPrompt = buildSystemPromptForIntent(domain, isQueryIntent);

	const userPrompt = `User message: ${routerResult.raw_message}
Intent type: ${routerResult.intent_type}
Current page: ${routerResult.context.currentPath}
${routerResult.context.project_id ? `Current project ID: ${routerResult.context.project_id}, project name: ${routerResult.context.project_name ?? ''}` : ''}
User role: ${routerResult.context.user_role ?? ''}`;

	const aiResult = await callAiJsonWithSource(env, {
		system: systemPrompt,
		user: userPrompt,
		promptVersion: `domain-${domain.descriptor.id}-v1`
	});

	const parsed = aiResult.json as Record<string, unknown> | null;

	const actionId = typeof parsed?.matched_action_id === 'string' ? parsed.matched_action_id : null;
	const matchedAction = actionId ? availableActions.find((a) => a.id === actionId) : null;

	const prefill =
		parsed?.prefill && typeof parsed.prefill === 'object' && !Array.isArray(parsed.prefill)
			? (parsed.prefill as Record<string, unknown>)
			: {};

	// For query intent, try to execute the query directly
	if (isQueryIntent && matchedAction?.api && queryCtx) {
		const queryParams = {
			...prefill,
			project_id: prefill.project_id ?? routerResult.context.project_id,
			project_name: prefill.project_name ?? routerResult.context.project_name
		};

		const queryResult = await executeQuery(queryCtx, matchedAction.id, queryParams);

		if (queryResult.success && queryResult.data) {
			const baseReply =
				typeof parsed?.reply === 'string' && parsed.reply.trim()
					? parsed.reply.trim()
					: '查询结果如下：';

			return {
				reply: baseReply,
				action: null,
				prefill: {},
				data: queryResult.data,
				missing_context: []
			};
		}

		if (!queryResult.success) {
			const missingCtx = queryResult.error?.includes('项目 ID')
				? ['project_id']
				: [];

			return {
				reply: queryResult.error ?? '查询失败，请稍后重试。',
				action: matchedAction
					? { id: matchedAction.id, entry: matchedAction.entry, layer: matchedAction.layer }
					: null,
				prefill,
				missing_context: missingCtx
			};
		}
	}

	return {
		reply:
			typeof parsed?.reply === 'string' && parsed.reply.trim()
				? parsed.reply.trim()
				: '我理解了你的需求，请查看下方操作。',
		action: matchedAction
			? { id: matchedAction.id, entry: matchedAction.entry, layer: matchedAction.layer }
			: null,
		prefill,
		data: parsed?.data ?? undefined,
		missing_context: Array.isArray(parsed?.missing_context)
			? (parsed.missing_context as string[]).filter((x) => typeof x === 'string')
			: []
	};
}

function buildSystemPromptForIntent(domain: DomainAgentDef, isQuery: boolean): string {
	const basePrompt = domain.buildSystemPrompt();

	if (isQuery) {
		return (
			basePrompt +
			`

IMPORTANT for QUERY intent:
- The user is asking a question and wants data, not navigation
- You MUST identify which action's API can answer this query
- Extract all relevant parameters (especially project_id, project_name) into prefill
- If project context is available, use it to fill project_id
- If user mentions a project by name, extract it to project_name in prefill`
		);
	}

	return basePrompt;
}
