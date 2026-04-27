export const projectWorkspaceEntries = [
	{ id: 'project.workspace', route: '/projects', label: 'Project Workspace' }
] as const;

export const projectDashboardCards = [] as const;

export const projectNavigationEntries = ['/projects'] as const;

export const projectTaskModeEntries = [] as const;

export const projectAppSurface = {
	workspaces: projectWorkspaceEntries,
	dashboardCards: projectDashboardCards,
	navigation: projectNavigationEntries,
	taskModeEntries: projectTaskModeEntries
};
