import type { BriefItem, QuickAction } from '../types';

/**
 * Phase 1A mock data. Uses realistic SMB vendor names so the demo
 * doesn't look like Lorem ipsum. Will be replaced by real data
 * sources (Feishu sync, scheduled jobs, event queue) in later phases.
 */

export const mockBriefItems: BriefItem[] = [
	{
		id: 'brief-1',
		title: '3 supplier invoices waiting on you',
		detail: 'From Axiom Tech, Cloudfactor SG, Neon Robotics — OCR draft ready.',
		workflowId: 'supplier-invoice-entry',
		urgency: 'due-soon',
		count: 3
	},
	{
		id: 'brief-2',
		title: 'GST Q1 return due in 9 days',
		detail: "I've tallied input/output tax so far. Want to review the draft?",
		urgency: 'normal'
	},
	{
		id: 'brief-3',
		title: '2 expense claims need approval',
		detail: 'Joyce and Wei Ming submitted travel receipts this morning.',
		urgency: 'normal',
		count: 2
	}
];

export const mockGreetingLine =
	"Morning. 3 things I've pre-drafted, 2 need your eyes.";

export const mockQuickActions: QuickAction[] = [
	{
		id: 'qa-invoice',
		label: 'Record invoice',
		icon: 'receipt',
		workflowId: 'supplier-invoice-entry'
	},
	{ id: 'qa-expense', label: 'Log expense', icon: 'wallet' },
	{ id: 'qa-gst', label: 'GST progress', icon: 'percent' },
	{ id: 'qa-report', label: 'This month', icon: 'line-chart' }
];
