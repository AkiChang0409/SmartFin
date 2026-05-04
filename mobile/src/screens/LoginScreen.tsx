import React, { useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

export function LoginScreen() {
	const { login } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit() {
		setError(null);
		setBusy(true);
		try {
			await login(email.trim(), password);
		} catch (e) {
			const msg = e instanceof ApiError ? e.message : '登录失败';
			setError(msg);
		} finally {
			setBusy(false);
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<Text style={styles.title}>SmartFin</Text>
			<Text style={styles.sub}>使用账号密码登录（与网页同一套用户）</Text>

			<TextInput
				style={styles.input}
				placeholder="邮箱"
				autoCapitalize="none"
				keyboardType="email-address"
				autoCorrect={false}
				value={email}
				onChangeText={setEmail}
			/>
			<TextInput
				style={styles.input}
				placeholder="密码"
				secureTextEntry
				value={password}
				onChangeText={setPassword}
			/>

			{error ? <Text style={styles.err}>{error}</Text> : null}

			<TouchableOpacity style={styles.btn} onPress={onSubmit} disabled={busy}>
				{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>登录</Text>}
			</TouchableOpacity>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 28,
		backgroundColor: '#f8fafc'
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 8,
		color: '#0f172a'
	},
	sub: {
		fontSize: 14,
		color: '#64748b',
		textAlign: 'center',
		marginBottom: 32
	},
	input: {
		backgroundColor: '#fff',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		fontSize: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#e2e8f0'
	},
	err: { color: '#dc2626', marginBottom: 12, textAlign: 'center' },
	btn: {
		backgroundColor: '#2563eb',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center'
	},
	btnText: { color: '#fff', fontSize: 17, fontWeight: '600' }
});
