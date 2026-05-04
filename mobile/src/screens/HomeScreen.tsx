import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
	const { user, logout } = useAuth();

	return (
		<View style={styles.wrap}>
			<Text style={styles.greet}>你好，{user?.email ?? ''}</Text>
			<Text style={styles.role}>角色：{user?.role ?? '-'}</Text>

			<TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FileUpload')}>
				<Text style={styles.cardTitle}>上传 / 拍照</Text>
				<Text style={styles.cardSub}>选文件或拍照 → 暂存到「待处理」，稍后再录入费用</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={styles.card}
				onPress={() => navigation.navigate('PendingFiles')}
			>
				<Text style={styles.cardTitle}>待处理记录</Text>
				<Text style={styles.cardSub}>对已上传文件挨个进行 OCR + 字段录入</Text>
			</TouchableOpacity>

			<TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Upload')}>
				<Text style={styles.cardTitle}>费用上传 (OCR)</Text>
				<Text style={styles.cardSub}>一步式：选类型与场景 → 文件 → OCR+AI 匹配 → 保存</Text>
			</TouchableOpacity>

			<TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FileHistory')}>
				<Text style={styles.cardTitle}>上传记录</Text>
				<Text style={styles.cardSub}>本机保存的最近上传</Text>
			</TouchableOpacity>

			<TouchableOpacity style={styles.outline} onPress={() => logout()}>
				<Text style={styles.outlineText}>退出登录</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
	greet: { fontSize: 20, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
	role: { fontSize: 14, color: '#64748b', marginBottom: 24 },
	card: {
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 18,
		marginBottom: 14,
		borderWidth: 1,
		borderColor: '#e2e8f0'
	},
	cardTitle: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
	cardSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
	outline: {
		marginTop: 24,
		alignSelf: 'center',
		paddingVertical: 12,
		paddingHorizontal: 20
	},
	outlineText: { color: '#64748b', fontSize: 15 }
});
