import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ExpenseResult'>;

export function ExpenseResultScreen({ route, navigation }: Props) {
	const { expenseId, documentId, fileName } = route.params;

	return (
		<View style={styles.wrap}>
			<Text style={styles.title}>已保存费用与文档</Text>
			<Text style={styles.hint}>
				与网页「费用上传」一致：直接写入费用表与文档记录，不经过进项发票 OCR 队列。
			</Text>
			{fileName ? <Text style={styles.row}>文件：{fileName}</Text> : null}
			<Text style={styles.row}>费用 ID：{expenseId}</Text>
			{documentId ? <Text style={styles.row}>文档 ID：{documentId}</Text> : null}

			<TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Home')}>
				<Text style={styles.btnText}>返回首页</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { flex: 1, padding: 22, backgroundColor: '#f8fafc' },
	title: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
	hint: { fontSize: 14, color: '#64748b', lineHeight: 21, marginBottom: 20 },
	row: { fontSize: 15, color: '#334155', marginBottom: 10 },
	btn: {
		marginTop: 28,
		backgroundColor: '#2563eb',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center'
	},
	btnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
