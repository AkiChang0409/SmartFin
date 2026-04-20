<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { get } from 'svelte/store';
	import { agentPageContext } from '$lib/agent/context';
	import { setPrefill } from '$lib/agent/prefill';

	type Message = {
		role: 'user' | 'assistant';
		text: string;
		action?: {
			id: string;
			entry: string;
			layer: number;
		} | null;
		prefill?: Record<string, unknown>;
		data?: unknown;
		missing_context?: string[];
	};

	type AgentIntentResponse = {
		reply: string;
		action: { id: string; entry: string; layer: number } | null;
		prefill: Record<string, unknown>;
		data?: unknown;
		missing_context: string[];
	};

	let open = $state(false);
	let input = $state('');
	let loading = $state(false);
	let messages = $state<Message[]>([]);
	let messagesContainer: HTMLDivElement | null = $state(null);
	let followUpMode = $state(false);
	let inputRef: HTMLInputElement | null = $state(null);

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	$effect(() => {
		if (open && messages.length > 0) {
			scrollToBottom();
		}
	});

	$effect(() => {
		if (open) {
			setTimeout(scrollToBottom, 50);
		}
	});

	function getRecentHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
		const recent = messages.slice(-6);
		return recent.map((m) => ({
			role: m.role,
			content: m.text
		}));
	}

	function startFollowUp() {
		followUpMode = true;
		inputRef?.focus();
	}

	function cancelFollowUp() {
		followUpMode = false;
	}

	async function send() {
		if (!input.trim() || loading) return;

		const userMessage = input.trim();
		const isFollowUp = followUpMode;
		input = '';
		followUpMode = false;
		messages = [...messages, { role: 'user', text: userMessage }];
		loading = true;

		try {
			const res = await fetch('/api/agent/intent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: userMessage,
					context: {
						currentPath: page.url.pathname,
						...get(agentPageContext)
					},
					history: isFollowUp ? getRecentHistory().slice(0, -1) : undefined
				})
			});
			const data = (await res.json()) as AgentIntentResponse;

			messages = [
				...messages,
				{
					role: 'assistant',
					text: data.reply ?? 'I did not quite follow. Could you rephrase that?',
					action: data.action ?? null,
					prefill: data.prefill ?? {},
					data: data.data,
					missing_context: data.missing_context ?? []
				}
			];
		} catch {
			messages = [...messages, { role: 'assistant', text: 'Something went wrong. Please try again shortly.' }];
		} finally {
			loading = false;
		}
	}

	function navigate(entry: string, prefill: Record<string, unknown>) {
		if (Object.keys(prefill).length > 0) {
			setPrefill(prefill);
		}
		goto(entry);
		open = false;
	}

	type ProfitData = {
		project_name?: string;
		revenue?: number;
		total_cost?: number;
		net_profit?: number;
		profit_margin_pct?: number;
	};

	type ProjectListData = {
		count?: number;
		projects?: Array<{ name: string; status: string; customer_name?: string }>;
	};

	type InvoiceListData = {
		count?: number;
		invoices?: Array<{ invoice_no: string; total: number; currency: string; status: string }>;
	};

	function formatCurrency(val: number, currency = 'SGD'): string {
		return new Intl.NumberFormat('en-SG', { style: 'currency', currency }).format(val);
	}

	function formatData(data: unknown): { type: 'profit' | 'projects' | 'invoices' | 'raw'; content: unknown } {
		if (data === null || data === undefined) return { type: 'raw', content: '' };
		if (typeof data !== 'object') return { type: 'raw', content: String(data) };

		const obj = data as Record<string, unknown>;

		if ('net_profit' in obj && 'revenue' in obj) {
			return { type: 'profit', content: obj as ProfitData };
		}
		if ('projects' in obj && Array.isArray(obj.projects)) {
			return { type: 'projects', content: obj as ProjectListData };
		}
		if ('invoices' in obj && Array.isArray(obj.invoices)) {
			return { type: 'invoices', content: obj as InvoiceListData };
		}

		return { type: 'raw', content: JSON.stringify(data, null, 2) };
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			void send();
		}
	}
</script>

<button
	class="fixed right-6 bottom-6 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-opacity hover:opacity-90"
	style="background: var(--sf-green);"
	aria-label="AI assistant"
	onclick={() => (open = !open)}
>
	{#if open}✕{:else}✦{/if}
</button>

{#if open}
	<div
		class="fixed right-6 bottom-20 z-50 flex w-80 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
		style="max-height: 480px;"
	>
		<div class="px-4 py-3 text-sm font-semibold text-white" style="background: var(--sf-green);">SmartFin assistant</div>

		<div class="flex-1 space-y-2 overflow-y-auto p-3 text-sm" bind:this={messagesContainer}>
			{#if messages.length === 0}
				<p class="mt-8 text-center text-gray-400">Hi! How can I help?</p>
			{/if}

			{#each messages as msg, idx}
				{@const isLastAssistant = msg.role === 'assistant' && idx === messages.length - 1}
				<div class={msg.role === 'user' ? 'text-right' : 'text-left'}>
					<span
						class={`inline-block max-w-[90%] rounded-lg px-3 py-2 ${
							msg.role === 'user' ? 'text-white' : 'bg-gray-100 text-gray-800'
						}`}
						style={msg.role === 'user' ? 'background: var(--sf-green);' : ''}
					>
						{msg.text}
					</span>

				{#if msg.role === 'assistant' && msg.data}
					{@const formatted = formatData(msg.data)}
					<div class="mt-1 max-w-[90%] rounded-lg bg-gray-50 p-2 text-left text-xs">
						{#if formatted.type === 'profit'}
							{@const profit = formatted.content as ProfitData}
							<div class="space-y-1">
								<div class="font-medium text-gray-800">{profit.project_name}</div>
								<div class="flex justify-between"><span>Revenue</span><span class="text-green-600">{formatCurrency(profit.revenue ?? 0)}</span></div>
								<div class="flex justify-between"><span>Total cost</span><span class="text-red-600">{formatCurrency(profit.total_cost ?? 0)}</span></div>
								<div class="flex justify-between border-t pt-1 font-medium"><span>Net profit</span><span class={profit.net_profit && profit.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(profit.net_profit ?? 0)}</span></div>
								<div class="text-right text-gray-500">Margin {profit.profit_margin_pct ?? 0}%</div>
							</div>
						{:else if formatted.type === 'projects'}
							{@const list = formatted.content as ProjectListData}
							<div class="space-y-1">
								<div class="text-gray-500">{list.count ?? 0} project(s)</div>
								{#each (list.projects ?? []).slice(0, 5) as p}
									<div class="flex justify-between"><span>{p.name}</span><span class="text-gray-400">{p.status}</span></div>
								{/each}
							</div>
						{:else if formatted.type === 'invoices'}
							{@const list = formatted.content as InvoiceListData}
							<div class="space-y-1">
								<div class="text-gray-500">{list.count ?? 0} invoice(s)</div>
								{#each (list.invoices ?? []).slice(0, 5) as inv}
									<div class="flex justify-between"><span>{inv.invoice_no}</span><span>{formatCurrency(inv.total, inv.currency)}</span></div>
								{/each}
							</div>
						{:else}
							<pre class="overflow-x-auto text-gray-600">{formatted.content}</pre>
						{/if}
					</div>
				{/if}

					{#if msg.role === 'assistant' && msg.missing_context && msg.missing_context.length > 0}
						<div class="mt-1 text-left text-xs text-amber-600">
							Still need: {msg.missing_context.join(', ')}
						</div>
					{/if}

				{#if msg.role === 'assistant' && (msg.action || isLastAssistant)}
					<div class="mt-1 flex flex-wrap gap-1">
						{#if msg.action}
							<button
								class="rounded-full px-3 py-1 text-xs transition-colors"
								style="border: 1px solid rgba(56, 114, 52, 0.25); background: var(--sf-green-soft); color: var(--sf-green);"
								onclick={() => navigate(msg.action!.entry, msg.prefill ?? {})}
							>
								Go →
							</button>
						{/if}
						{#if isLastAssistant}
							<button
								class="rounded-full px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100"
								style="border: 1px solid #e5e7eb;"
								onclick={startFollowUp}
							>
								Follow up
							</button>
						{/if}
					</div>
				{/if}
				</div>
			{/each}

			{#if loading}
				<div class="text-left">
					<span class="inline-block rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-400">Thinking…</span>
				</div>
			{/if}
		</div>

		<div class="border-t border-gray-200 p-2">
			{#if followUpMode}
				<div class="mb-1 flex items-center justify-between text-xs text-amber-600">
					<span>Follow-up mode: replies use prior messages</span>
					<button class="text-gray-400 hover:text-gray-600" onclick={cancelFollowUp}>Cancel</button>
				</div>
			{/if}
			<div class="flex gap-2">
				<input
					class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none {followUpMode ? 'border-amber-400 bg-amber-50' : 'border-gray-200 focus:border-green-700'}"
					placeholder={followUpMode ? 'Add detail…' : 'What would you like to do?'}
					bind:value={input}
					bind:this={inputRef}
					onkeydown={handleKeydown}
					disabled={loading}
				/>
				<button
					class="rounded-lg px-3 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
					style="background: var(--sf-green);"
					onclick={() => void send()}
					disabled={loading || !input.trim()}
				>
					Send
				</button>
			</div>
		</div>
	</div>
{/if}
