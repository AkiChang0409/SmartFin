import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'smartfin_mobile_upload_history_v1';

export type UploadHistoryItem = {
	id: string;
	/** `invoice_in`：旧版进项上传；`expense`：费用+文件 */
	kind?: 'invoice_in' | 'expense';
	label: string;
	createdAt: string;
	projectId?: string;
	fileName?: string;
	documentId?: string;
};

export async function appendUploadHistory(item: UploadHistoryItem): Promise<void> {
	const prev = await loadUploadHistory();
	const next = [item, ...prev.filter((x) => x.id !== item.id)].slice(0, 50);
	await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function loadUploadHistory(): Promise<UploadHistoryItem[]> {
	try {
		const raw = await AsyncStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as UploadHistoryItem[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
