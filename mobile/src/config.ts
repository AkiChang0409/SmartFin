import Constants from 'expo-constants';

/** 与后端 `/api/files` 单次缓冲上限对齐的客户端预检上限（字节）。 */
export const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

export function getApiBaseUrl(): string {
	const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
	const fromExtra = (
		Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined
	)?.apiBaseUrl?.trim();
	const url = fromEnv || fromExtra;
	if (!url) {
		throw new Error(
			'请在项目根 `mobile/.env` 设置 EXPO_PUBLIC_API_BASE_URL（或 app.json extra.apiBaseUrl）'
		);
	}
	return url.replace(/\/$/, '');
}
