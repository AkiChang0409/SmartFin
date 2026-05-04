import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loginRequest, meRequest } from '../api/client';
import { clearStoredToken, getStoredToken, setStoredToken } from '../auth/storage';

type User = { id: string; email: string; role: string };

type AuthState = {
	ready: boolean;
	token: string | null;
	user: User | null;
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [ready, setReady] = useState(false);
	const [token, setToken] = useState<string | null>(null);
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const t = await getStoredToken();
				if (cancelled) return;
				setToken(t);
				if (t) {
					try {
						const u = await meRequest();
						if (!cancelled) setUser(u);
					} catch {
						await clearStoredToken();
						if (!cancelled) {
							setToken(null);
							setUser(null);
						}
					}
				}
			} finally {
				if (!cancelled) setReady(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const login = useCallback(async (email: string, password: string) => {
		const res = await loginRequest(email.trim(), password);
		await setStoredToken(res.accessToken);
		setToken(res.accessToken);
		setUser(res.user);
	}, []);

	const logout = useCallback(async () => {
		await clearStoredToken();
		setToken(null);
		setUser(null);
	}, []);

	const refreshUser = useCallback(async () => {
		const u = await meRequest();
		setUser(u);
	}, []);

	const value = useMemo(
		() => ({
			ready,
			token,
			user,
			login,
			logout,
			refreshUser
		}),
		[ready, token, user, login, logout, refreshUser]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}

export { ApiError } from '../api/client';
