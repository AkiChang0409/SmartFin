import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AgentContext, DomainResult, QueryContext, ChatHistoryMessage } from '$lib/server/agent/types';
import { routeIntent } from '$lib/server/agent/router';
import { getDomainAgent } from '$lib/server/agent/domains/registry';
import { executeDomainAgent } from '$lib/server/agent/domains/executor';

type IntentRequest = {
	message: string;
	context?: Partial<AgentContext>;
	history?: ChatHistoryMessage[];
};

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as IntentRequest;
	const message = body.message?.trim();
	if (!message) {
		return json({ error: 'message is required' }, { status: 400 });
	}

	if (!platform) {
		return json(
			{
				reply: 'The AI assistant is unavailable right now. Please try again later.',
				action: null,
				prefill: {},
				missing_context: []
			} satisfies DomainResult,
			{ status: 503 }
		);
	}

	const context: AgentContext = {
		currentPath: body.context?.currentPath ?? '/',
		...body.context,
		user_role: locals.user.role
	};

	const routerResult = await routeIntent(platform.env, message, context);

	if (!routerResult.domain || routerResult.confidence < 0.4) {
		return json({
			reply:
				routerResult.intent_type === 'chat'
					? 'Hi! I am the SmartFin assistant. I can help with projects, invoices, reports, and more. What would you like to do?'
					: 'I am not sure which area you mean. Can you add a bit more detail?',
			action: null,
			prefill: {},
			missing_context: []
		} satisfies DomainResult);
	}

	const domain = getDomainAgent(routerResult.domain);
	if (!domain) {
		return json({
			reply: 'That module is not enabled for this workspace.',
			action: null,
			prefill: {},
			missing_context: []
		} satisfies DomainResult);
	}

	const queryCtx: QueryContext = {
		env: platform.env,
		userId: locals.user.id,
		userRole: locals.user.role
	};

	const history = Array.isArray(body.history) ? body.history : undefined;

	try {
		const domainResult = await executeDomainAgent(
			platform.env,
			domain,
			routerResult,
			locals.user.role,
			queryCtx,
			history
		);

		return json(domainResult);
	} catch {
		return json({
			reply: 'The AI assistant hit an error. Please try again in a moment.',
			action: null,
			prefill: {},
			missing_context: []
		} satisfies DomainResult);
	}
};
