import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
	ApiError,
	listFinancialPendingDocuments,
	type FinancialPendingDocument
} from '../api/client';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PendingFiles'>;

function fmtTime(s: string): string {
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return s;
	return d.toLocaleString();
}

function statusLabel(s: FinancialPendingDocument['ocrStatus']): { text: string; color: string } {
	switch (s) {
		case 'pending':
			return { text: '待处理', color: '#b45309' };
		case 'processing':
			return { text: '处理中', color: '#2563eb' };
		case 'failed':
			return { text: '失败', color: '#dc2626' };
		case 'done':
			return { text: '已完成', color: '#16a34a' };
		default:
			return { text: String(s), color: '#64748b' };
	}
}

export function PendingFilesScreen({ navigation }: Props) {
	const [items, setItems] = useState<FinancialPendingDocument[]>([]);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setRefreshing(true);
		setError(null);
		try {
			const res = await listFinancialPendingDocuments();
			setItems(res.items ?? []);
		} catch (e) {
			setError(e instanceof ApiError ? e.message : String(e));
		} finally {
			setRefreshing(false);
		}
	}, []);

	const initialLoad = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await listFinancialPendingDocuments();
			setItems(res.items ?? []);
		} catch (e) {
			setError(e instanceof ApiError ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		const unsub = navigation.addListener('focus', () => {
			void initialLoad();
		});
		return unsub;
	}, [navigation, initialLoad]);

	if (loading && items.length === 0) {
		return (
			<View style={styles.center}>
				<ActivityIndicator />
				<Text style={styles.muted}>加载待处理列表…</Text>
			</View>
		);
	}

	return (
		<View style={styles.wrap}>
			<View style={styles.headerRow}>
				<Text style={styles.headerTitle}>共 {items.length} 个待处理</Text>
				<TouchableOpacity onPress={() => navigation.navigate('FileUpload')}>
					<Text style={styles.actionLink}>+ 上传 / 拍照</Text>
				</TouchableOpacity>
			</View>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<FlatList
				data={items}
				keyExtractor={(item) => item.documentId}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
				ListEmptyComponent={
					<Text style={styles.empty}>暂无待处理文件，先去「上传 / 拍照」试试吧。</Text>
				}
				renderItem={({ item }) => {
					const st = statusLabel(item.ocrStatus);
					return (
						<TouchableOpacity
							style={styles.row}
							onPress={() =>
								navigation.navigate('Upload', {
									documentId: item.documentId,
									fileName: item.fileName,
									fileType: item.fileType,
									projectId: item.projectId,
									docType: item.docType
								})
							}
						>
							<Text style={styles.title} numberOfLines={1}>
								{item.fileName}
							</Text>
							<Text style={styles.sub}>
								{item.docType.toUpperCase()} · {fmtTime(item.createdAt)}
							</Text>
							<View style={styles.metaRow}>
								<Text style={[styles.statusPill, { color: st.color, borderColor: st.color }]}>
									{st.text}
								</Text>
								<Text style={styles.cta}>处理 →</Text>
							</View>
						</TouchableOpacity>
					);
				}}
				contentContainerStyle={items.length === 0 ? styles.flexCenter : undefined}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { flex: 1, backgroundColor: '#f8fafc' },
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#f8fafc'
	},
	flexCenter: { flexGrow: 1, justifyContent: 'center' },
	muted: { color: '#64748b', fontSize: 13 },
	headerRow: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	headerTitle: { fontSize: 13, color: '#475569' },
	actionLink: { fontSize: 14, color: '#2563eb', fontWeight: '600' },
	error: {
		marginHorizontal: 16,
		marginBottom: 8,
		padding: 10,
		backgroundColor: '#fef2f2',
		borderColor: '#fecaca',
		borderWidth: 1,
		borderRadius: 10,
		color: '#b91c1c',
		fontSize: 12
	},
	row: {
		backgroundColor: '#fff',
		marginHorizontal: 16,
		marginBottom: 10,
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0'
	},
	title: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
	sub: { fontSize: 12, color: '#64748b', marginTop: 4 },
	metaRow: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	statusPill: {
		fontSize: 11,
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 999,
		borderWidth: 1
	},
	cta: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
	empty: {
		textAlign: 'center',
		color: '#94a3b8',
		paddingHorizontal: 32,
		fontSize: 13,
		lineHeight: 20
	}
});
