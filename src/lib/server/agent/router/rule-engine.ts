import type { AgentContext, RouterResult } from '../types';
import { domainRegistry } from '../domains/registry';

/**
 * Keyword + path heuristic routing for the agent.
 * Returns null when uncertain so the LLM can decide.
 */
export function matchByRules(message: string, context: AgentContext): RouterResult | null {
	const msgLower = message.toLowerCase();

	const pathDomain = inferDomainFromPath(context.currentPath);

	let bestMatch: { domain: string; score: number } | null = null;

	for (const domain of domainRegistry) {
		let score = 0;
		for (const kw of domain.descriptor.keywords) {
			if (msgLower.includes(kw.toLowerCase())) {
				score += kw.length;
			}
		}
		if (score > 0 && (!bestMatch || score > bestMatch.score)) {
			bestMatch = { domain: domain.descriptor.id, score };
		}
	}

	const intentType = inferIntentType(msgLower);

	if (bestMatch && bestMatch.score >= 4) {
		return {
			intent_type: intentType,
			domain: bestMatch.domain,
			confidence: Math.min(0.95, 0.6 + bestMatch.score * 0.05),
			raw_message: message,
			context
		};
	}

	if (pathDomain && intentType !== 'chat') {
		return {
			intent_type: intentType,
			domain: pathDomain,
			confidence: 0.6,
			raw_message: message,
			context
		};
	}

	return null;
}

function inferDomainFromPath(path: string): string | null {
	if (path.startsWith('/ar') || path.startsWith('/finance')) return 'ar';
	if (path.startsWith('/projects')) return 'project';
	if (path.startsWith('/expenses')) return 'expense';
	if (path.startsWith('/tax')) return 'tax';
	if (path.startsWith('/employees')) return 'employee';
	if (path.startsWith('/reports')) return 'reporting';
	return null;
}

function inferIntentType(msg: string): 'action' | 'query' | 'chat' {
	const queryPatterns = [
		'how much',
		'how many',
		'show me',
		'show ',
		'list',
		'what is',
		'what are',
		'view ',
		'display',
		'summary',
		'search',
		'find ',
		'query',
		'total ',
		'count',
		'report',
		'profit',
		'margin',
		'which ',
		'any '
	];
	const actionPatterns = [
		'create',
		'new ',
		'add ',
		'upload',
		'generate',
		'open ',
		'record',
		'edit',
		'update',
		'delete',
		'remove',
		'submit'
	];

	const isQuery = queryPatterns.some((p) => msg.includes(p));
	const isAction = actionPatterns.some((p) => msg.includes(p));

	if (isAction && !isQuery) return 'action';
	if (isQuery && !isAction) return 'query';
	if (isAction && isQuery) return 'action';
	return 'chat';
}
