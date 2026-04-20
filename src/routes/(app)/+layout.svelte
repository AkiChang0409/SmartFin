<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import AgentChat from '$lib/components/AgentChat.svelte';

	type Primary = 'finance' | 'project' | 'business-partner' | 'settings';

	type SideLink = {
		href: string;
		label: string;
		moduleId: string | null;
		icon?: string;
	};

	type SideGroup = {
		title?: string;
		items: SideLink[];
	};

	const primaryTabs: Array<{
		id: Primary;
		href: string;
		label: string;
		moduleId: string | null;
	}> = [
		{ id: 'finance', href: '/dashboard', label: 'Finance', moduleId: null },
		{ id: 'project', href: '/projects', label: 'Project', moduleId: 'project' },
		{ id: 'business-partner', href: '/customers', label: 'Business Partner', moduleId: 'business-partner' },
		{ id: 'settings', href: '/settings', label: 'Setting', moduleId: 'core' }
	];

	// Finance 板块侧边栏 - 公司级财务管理
	const financeGroups: SideGroup[] = [
		{
			title: 'Overview',
			items: [
				{ href: '/dashboard', label: 'Dashboard', moduleId: null, icon: '◫' }
			]
		},
		{
			title: 'Tax',
			items: [
				{ href: '/tax', label: 'GST Return', moduleId: 'tax', icon: '⊞' },
				{ href: '/tax/corporate', label: 'Corporate Tax', moduleId: 'tax', icon: '⊡' }
			]
		},
		{
			title: 'Company Expenses',
			items: [
				{ href: '/expenses', label: 'All Expenses', moduleId: 'expense', icon: '⊟' },
				{ href: '/expenses/reimbursements', label: 'Reimbursement Queue', moduleId: 'expense', icon: '⊠' }
			]
		},
		{
			title: 'Documents',
			items: [
				{ href: '/finance/doc-hub', label: 'Doc Hub', moduleId: 'ar', icon: '▤' }
			]
		}
	];

	// Project 列表页侧边栏 - 项目导航
	const projectListGroups: SideGroup[] = [
		{
			title: 'Projects',
			items: [
				{ href: '/projects', label: 'All Projects', moduleId: 'project', icon: '▦' },
				{ href: '/projects/new', label: 'New Project', moduleId: 'project', icon: '+' }
			]
		}
	];

	const businessPartnerGroups: SideGroup[] = [
		{
			title: 'Partners',
			items: [
				{ href: '/customers', label: 'Customers', moduleId: 'business-partner', icon: '◎' },
				{ href: '/finance/supplier-invoices', label: 'Suppliers', moduleId: 'ar', icon: '◉' }
			]
		}
	];

	const settingsGroups: SideGroup[] = [
		{
			title: 'Configuration',
			items: [
				{ href: '/settings', label: 'Workspace Settings', moduleId: 'core', icon: '⚙' }
			]
		}
	];

	let { children, data } = $props();
	const enabledModules = $derived(new Set((data.enabledModules as string[] | undefined) ?? []));

	const visiblePrimaryTabs = $derived(
		primaryTabs.filter(
			(item) => item.moduleId === null || item.moduleId === 'core' || enabledModules.has(item.moduleId)
		)
	);

	const path = $derived(page.url.pathname);

	// 项目详情页有独立侧栏，主布局隐藏侧边栏
	const isProjectDetailPage = $derived(/^\/projects\/(?!new$)[^/]+/.test(path));

	// 判断当前所属的主板块
	const primaryFromPath = $derived.by((): Primary => {
		if (path.startsWith('/settings')) return 'settings';
		if (path.startsWith('/customers')) return 'business-partner';
		if (path.startsWith('/finance/supplier-invoices')) return 'business-partner';
		// Project 板块：项目列表和项目详情
		if (path === '/projects' || path.startsWith('/projects/')) return 'project';
		// Finance 板块：dashboard, tax, expenses, /finance/*（供应商发票在 Business Partner）
		return 'finance';
	});

	// 根据板块决定显示哪个侧边栏
	const shellSidebarGroups = $derived.by((): SideGroup[] => {
		if (primaryFromPath === 'project') return projectListGroups;
		if (primaryFromPath === 'business-partner') return businessPartnerGroups;
		if (primaryFromPath === 'settings') return settingsGroups;
		return financeGroups;
	});

	function linkAllowed(item: SideLink): boolean {
		return item.moduleId === null || item.moduleId === 'core' || enabledModules.has(item.moduleId);
	}

	function linkActive(item: SideLink): boolean {
		const itemPath = new URL(item.href, page.url.origin).pathname;

		// Dashboard
		if (itemPath === '/dashboard') {
			return path === '/dashboard' || path === '/';
		}
		// Tax
		if (itemPath === '/tax/corporate') {
			return path.startsWith('/tax/corporate');
		}
		if (itemPath === '/tax') {
			return path.startsWith('/tax') && !path.startsWith('/tax/corporate');
		}
		// Expenses
		if (itemPath === '/expenses/reimbursements') {
			return path.startsWith('/expenses/reimbursements');
		}
		if (itemPath === '/expenses') {
			return path === '/expenses' || (path.startsWith('/expenses/') && !path.startsWith('/expenses/reimbursements'));
		}
		// Doc Hub（财务文档中心，不含供应商发票）
		if (itemPath === '/finance/doc-hub') {
			if (path.startsWith('/finance/supplier-invoices')) return false;
			const hub =
				path.startsWith('/finance/doc-hub') ||
				path.startsWith('/finance/contracts') ||
				path.startsWith('/finance/quotations') ||
				path.startsWith('/finance/purchase-orders') ||
				path.startsWith('/finance/customer-invoices');
			return hub;
		}
		// Projects
		if (itemPath === '/projects/new') {
			return path === '/projects/new';
		}
		if (itemPath === '/projects') {
			return path === '/projects';
		}
		// Business Partners
		if (itemPath === '/customers') {
			return path.startsWith('/customers');
		}
		if (itemPath === '/finance/supplier-invoices') {
			return path.startsWith('/finance/supplier-invoices');
		}
		// Settings
		if (itemPath === '/settings') {
			return path.startsWith('/settings');
		}
		return path === itemPath;
	}

	const subLinkClass = (active: boolean) =>
		`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition ${
			active 
				? 'bg-[var(--sf-green-soft)] font-medium text-[var(--sf-green)]' 
				: 'text-slate-600 hover:bg-slate-100'
		}`;

	const primaryTabClass = (id: Primary) =>
		`rounded-md px-3 py-1.5 text-sm font-medium transition ${
			primaryFromPath === id 
				? 'bg-[var(--sf-green-soft)] text-[var(--sf-green)]' 
				: 'text-slate-600 hover:bg-slate-100'
		}`;

	async function logout() {
		await authClient.signOut();
		await goto('/login');
	}
</script>

<div class="theme-shell flex min-h-screen flex-col">
	<!-- 顶部导航栏 -->
	<header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
		<div class="flex h-14 items-center justify-between px-4 lg:px-6">
			<!-- Logo 和主导航 -->
			<div class="flex items-center gap-6">
				<a class="flex items-center gap-2 text-lg font-semibold text-[var(--sf-green)]" href="/dashboard">
					<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sf-green)] text-white text-sm">SF</span>
					SmartFin
				</a>
				<nav class="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
					{#each visiblePrimaryTabs as tab}
						<a class={primaryTabClass(tab.id)} href={tab.href}>
							{tab.label}
						</a>
					{/each}
				</nav>
			</div>
			<!-- 用户信息 -->
			<div class="flex items-center gap-3">
				{#if data.user}
					<div class="hidden items-center gap-2 text-xs sm:flex">
						<span class="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{data.user.email}</span>
						<span class="rounded-full bg-[var(--sf-green-soft)] px-2.5 py-1 font-medium text-[var(--sf-green)]">{data.user.role}</span>
					</div>
					<button
						type="button"
						class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
						onclick={() => logout()}
					>
						Logout
					</button>
				{/if}
			</div>
		</div>
		<!-- 移动端主导航 -->
		<nav class="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden" aria-label="Primary navigation mobile">
			{#each visiblePrimaryTabs as tab}
				<a 
					class={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
						primaryFromPath === tab.id 
							? 'bg-[var(--sf-green-soft)] text-[var(--sf-green)]' 
							: 'text-slate-600 hover:bg-slate-100'
					}`}
					href={tab.href}
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	</header>

	<div class="flex min-h-0 flex-1">
		<!-- 侧边栏 - 仅在非项目详情页显示 -->
		{#if !isProjectDetailPage}
			<aside
				class="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-50/50 lg:block"
				aria-label="Secondary navigation"
			>
				<div class="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col overflow-y-auto p-4">
					{#each shellSidebarGroups as group, gi (gi)}
						<div class={gi > 0 ? 'mt-6' : ''}>
							{#if group.title}
								<p class="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
									{group.title}
								</p>
							{/if}
							<nav class="flex flex-col gap-1">
								{#each group.items as item}
									{#if linkAllowed(item)}
										<a class={subLinkClass(linkActive(item))} href={item.href}>
											{#if item.icon}
												<span class="w-4 text-center opacity-60">{item.icon}</span>
											{/if}
											{item.label}
										</a>
									{/if}
								{/each}
							</nav>
						</div>
					{/each}
				</div>
			</aside>

			<!-- 移动端侧边栏折叠为横向滚动 -->
			<div class="border-b border-slate-200 bg-slate-50/80 px-4 py-2 lg:hidden">
				<div class="flex gap-2 overflow-x-auto pb-1" role="navigation" aria-label="Secondary navigation mobile">
					{#each shellSidebarGroups as group}
						{#each group.items as item}
							{#if linkAllowed(item)}
								<a
									class={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
										linkActive(item)
											? 'border-[var(--sf-green)] bg-[var(--sf-green-soft)] text-[var(--sf-green)]'
											: 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
									}`}
									href={item.href}
								>
									{item.label}
								</a>
							{/if}
						{/each}
					{/each}
				</div>
			</div>
		{/if}

		<!-- 主内容区 -->
		<main class="min-w-0 flex-1 bg-white">
			{#if isProjectDetailPage}
				<!-- 项目详情页：全宽布局，由项目布局自己处理侧边栏 -->
				<div class="h-full">
					{@render children()}
				</div>
			{:else}
				<!-- 其他页面：居中布局 -->
				<div class="mx-auto w-full max-w-6xl px-6 py-6">
					{@render children()}
				</div>
			{/if}
		</main>
	</div>
	<AgentChat />
</div>
