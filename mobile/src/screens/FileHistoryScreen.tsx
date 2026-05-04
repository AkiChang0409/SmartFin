import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { loadUploadHistory, type UploadHistoryItem } from '../upload/history';

type Props = NativeStackScreenProps<RootStackParamList, 'FileHistory'>;

export function FileHistoryScreen({ navigation }: Props) {
	const [items, setItems] = useState<UploadHistoryItem[]>([]);
	const [refreshing, setRefreshing] = useState(false);

	const refresh = useCallback(async () => {
		setRefreshing(true);
		try {
			setItems(await loadUploadHistory());
		} finally {
			setRefreshing(false);
		}
	}, []);

	React.useEffect(() => {
		const unsub = navigation.addListener('focus', () => {
			void refresh();
		});
		return unsub;
	}, [navigation, refresh]);

	return (
		<View style={styles.wrap}>
			<Text style={styles.hint}>以下为在本机记录的最近上传（用于快速回到 OCR 状态）。</Text>
			<FlatList
				data={items}
				keyExtractor={(item) => item.id}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
				ListEmptyComponent={<Text style={styles.empty}>暂无记录</Text>}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={styles.row}
						onPress={() => {
							const kind = item.kind ?? 'invoice_in';
							if (kind === 'expense') {
								navigation.navigate('ExpenseResult', {
									expenseId: item.id,
									documentId: item.documentId,
									fileName: item.fileName ?? item.label
								});
							} else {
								navigation.navigate('OcrResult', {
									invoiceId: item.id,
									fileName: item.fileName ?? item.label
								});
							}
						}}
					>
						<Text style={styles.title}>{item.label}</Text>
						<Text style={styles.sub}>{new Date(item.createdAt).toLocaleString()}</Text>
						<Text style={styles.id}>{item.id}</Text>
					</TouchableOpacity>
				)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { flex: 1, backgroundColor: '#f8fafc' },
	hint: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, fontSize: 13, color: '#64748b' },
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
	sub: { fontSize: 13, color: '#64748b', marginTop: 4 },
	id: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
	empty: { textAlign: 'center', color: '#94a3b8', marginTop: 48 }
});
