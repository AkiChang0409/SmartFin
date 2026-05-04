import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getOcrInvoiceStatus, type OcrStatusInvoice, ApiError } from '../api/client';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'OcrResult'>;

const POLL_MS = 2000;
const MAX_POLLS = 90;

function isStillProcessing(status: string) {
	const s = status.toLowerCase();
	return s === 'processing' || s === 'pending' || s === 'queued';
}

function formatJson(v: unknown) {
	try {
		return JSON.stringify(v, null, 2);
	} catch {
		return String(v);
	}
}

export function OcrResultScreen({ route }: Props) {
	const { invoiceId, fileName } = route.params;
	const [row, setRow] = useState<OcrStatusInvoice | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [polls, setPolls] = useState(0);
	const [stopped, setStopped] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function loop() {
			let n = 0;
			while (!cancelled && n < MAX_POLLS) {
				try {
					const r = await getOcrInvoiceStatus(invoiceId);
					if (cancelled) return;
					setRow(r);
					setErr(null);
					setPolls(n + 1);
					if (!isStillProcessing(r.status ?? '')) {
						setStopped(true);
						return;
					}
				} catch (e) {
					if (cancelled) return;
					setErr(e instanceof ApiError ? e.message : String(e));
					setStopped(true);
					return;
				}
				await new Promise((res) => setTimeout(res, POLL_MS));
				n++;
			}
			if (!cancelled) setStopped(true);
		}

		loop();
		return () => {
			cancelled = true;
		};
	}, [invoiceId]);

	const status = row?.status ?? (err ? '错误' : '加载中…');

	return (
		<ScrollView contentContainerStyle={styles.wrap}>
			{fileName ? <Text style={styles.file}>文件：{fileName}</Text> : null}
			<Text style={styles.meta}>发票 / OCR id：{invoiceId}</Text>
			<Text style={styles.status}>状态：{status}</Text>

			{!row && !err ? <ActivityIndicator style={{ marginTop: 16 }} size="large" /> : null}
			{err ? <Text style={styles.err}>{err}</Text> : null}

			{row?.confidence != null ? (
				<Text style={styles.conf}>置信度：{String(row.confidence)}</Text>
			) : null}

			{row?.result != null ? (
				<View style={styles.block}>
					<Text style={styles.blockTitle}>结构化结果</Text>
					<Text selectable style={styles.pre}>
						{formatJson(row.result)}
					</Text>
				</View>
			) : null}

			{stopped && polls >= MAX_POLLS && row && isStillProcessing(row.status ?? '') ? (
				<Text style={styles.warn}>轮询超时，请在后台队列完成后刷新网页查看。</Text>
			) : null}
		</ScrollView>
	);
}

const mono = Platform.select({
	ios: 'Menlo',
	android: 'monospace',
	default: 'monospace'
});

const styles = StyleSheet.create({
	wrap: { padding: 20, paddingBottom: 40, backgroundColor: '#f8fafc' },
	file: { fontSize: 15, color: '#0f172a', marginBottom: 8 },
	meta: { fontSize: 13, color: '#64748b', marginBottom: 8 },
	status: { fontSize: 17, fontWeight: '600', color: '#2563eb', marginBottom: 16 },
	err: { color: '#dc2626', marginBottom: 12 },
	conf: { fontSize: 14, color: '#334155', marginBottom: 12 },
	block: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 14,
		borderWidth: 1,
		borderColor: '#e2e8f0'
	},
	blockTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: '#0f172a' },
	pre: { fontFamily: mono, fontSize: 11, color: '#334155' },
	warn: { marginTop: 16, color: '#ca8a04', fontSize: 13 }
});
