import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
	ApiError,
	createFinancialDocumentPending,
	presignUpload,
	putUploadBinary
} from '../api/client';
import { MAX_UPLOAD_BYTES } from '../config';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { appendUploadHistory } from '../upload/history';

type Props = NativeStackScreenProps<RootStackParamList, 'FileUpload'>;

type PickedFile = { uri: string; name: string; mime: string };

const DOC_TYPES = [
	{ value: 'invoice', label: '发票' },
	{ value: 'receipt', label: '收据' },
	{ value: 'po', label: '采购单 (PO)' },
	{ value: 'other', label: '其他' }
] as const;

type DocTypeValue = (typeof DOC_TYPES)[number]['value'];

function inferMimeFromName(name: string, fallback?: string): string {
	const lower = name.toLowerCase();
	if (lower.endsWith('.pdf')) return 'application/pdf';
	if (lower.endsWith('.png')) return 'image/png';
	if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
	if (lower.endsWith('.webp')) return 'image/webp';
	return fallback ?? 'application/octet-stream';
}

export function FileUploadScreen({ navigation }: Props) {
	const [picked, setPicked] = useState<PickedFile | null>(null);
	const [uploading, setUploading] = useState(false);
	const [docType, setDocType] = useState<DocTypeValue>('invoice');
	const [notes, setNotes] = useState('');

	async function onPickFile() {
		const res = await DocumentPicker.getDocumentAsync({
			type: '*/*',
			copyToCacheDirectory: true
		});
		if (res.canceled || !res.assets?.[0]) return;
		const a = res.assets[0];
		const name = a.name ?? 'file';
		setPicked({ uri: a.uri, name, mime: a.mimeType ?? inferMimeFromName(name) });
	}

	async function onTakePhoto() {
		const perm = await ImagePicker.requestCameraPermissionsAsync();
		if (!perm.granted) {
			Alert.alert('权限被拒绝', '请在系统设置中允许 SmartFin 使用相机后再试。');
			return;
		}
		const res = await ImagePicker.launchCameraAsync({
			mediaTypes: ['images'],
			quality: 0.9,
			allowsEditing: false
		});
		if (res.canceled || !res.assets?.[0]) return;
		const a = res.assets[0];
		const name = a.fileName || `photo-${Date.now()}.jpg`;
		setPicked({
			uri: a.uri,
			name,
			mime: a.mimeType || inferMimeFromName(name, 'image/jpeg')
		});
	}

	async function onSubmit() {
		if (!picked) {
			Alert.alert('提示', '请先选择文件或拍照');
			return;
		}

		setUploading(true);
		try {
			const head = await fetch(picked.uri);
			const buf = await head.arrayBuffer();
			if (buf.byteLength > MAX_UPLOAD_BYTES) {
				Alert.alert('文件过大', `请不超过 ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`);
				return;
			}

			const entityId = Crypto.randomUUID();
			const presign = await presignUpload({
				fileName: picked.name,
				contentType: picked.mime,
				projectId: 'company',
				entityType: 'expense',
				entityId
			});

			await putUploadBinary(presign.uploadUrl, picked.mime, buf);

			const created = await createFinancialDocumentPending({
				key: presign.key,
				fileName: picked.name,
				fileType: picked.mime,
				projectId: null,
				docType,
				notes: notes.trim() || null
			});

			await appendUploadHistory({
				id: created.documentId,
				kind: 'expense',
				label: picked.name,
				createdAt: new Date().toISOString(),
				fileName: picked.name,
				documentId: created.documentId
			});

			Alert.alert('已加入待处理', '文件已上传到云端，可在「待处理记录」中继续录入费用。', [
				{
					text: '去待处理',
					onPress: () => navigation.replace('PendingFiles')
				},
				{
					text: '继续上传',
					style: 'cancel',
					onPress: () => {
						setPicked(null);
						setNotes('');
					}
				}
			]);
		} catch (e) {
			const msg = e instanceof ApiError ? e.message : String(e);
			Alert.alert('上传失败', msg);
		} finally {
			setUploading(false);
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.flex}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
				<Text style={styles.lead}>
					第一步：把发票/收据/凭证上传到云端，先入库到「待处理」。
					<Text style={{ fontWeight: '700' }}> 不立即录入费用</Text>，稍后在「待处理」中挨个处理。
				</Text>

				<Text style={styles.h2}>1. 选择文件来源</Text>
				<View style={styles.row}>
					<TouchableOpacity style={styles.bigBtn} onPress={() => void onPickFile()}>
						<Text style={styles.bigBtnText}>📁 选择文件</Text>
						<Text style={styles.bigBtnSub}>PDF / 图片</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.bigBtn} onPress={() => void onTakePhoto()}>
						<Text style={styles.bigBtnText}>📷 拍照</Text>
						<Text style={styles.bigBtnSub}>使用相机拍摄</Text>
					</TouchableOpacity>
				</View>

				{picked ? (
					<View style={styles.previewBox}>
						<Text style={styles.previewTitle}>已选文件</Text>
						<Text selectable style={styles.previewBody}>
							{picked.name}
						</Text>
						<Text style={styles.previewMeta}>{picked.mime}</Text>
					</View>
				) : null}

				<Text style={styles.h2}>2. 凭证类型（可选）</Text>
				<View style={styles.row}>
					{DOC_TYPES.map((dt) => (
						<TouchableOpacity
							key={dt.value}
							style={[styles.chip, docType === dt.value && styles.chipOn]}
							onPress={() => setDocType(dt.value)}
						>
							<Text
								style={[styles.chipText, docType === dt.value && styles.chipTextOn]}
							>
								{dt.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				<Text style={styles.h2}>3. 备注（可选）</Text>
				<TextInput
					style={[styles.input, styles.notes]}
					multiline
					value={notes}
					onChangeText={setNotes}
					placeholder="例如：上海差旅票据 #12"
				/>

				<TouchableOpacity
					style={[styles.saveBtn, (uploading || !picked) && styles.btnDisabled]}
					onPress={() => void onSubmit()}
					disabled={uploading || !picked}
				>
					{uploading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.saveBtnText}>上传并加入待处理</Text>
					)}
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.secondaryBtn}
					onPress={() => navigation.navigate('PendingFiles')}
				>
					<Text style={styles.secondaryBtnText}>查看「待处理记录」</Text>
				</TouchableOpacity>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: '#f8fafc' },
	wrap: { padding: 16, paddingBottom: 48 },
	lead: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
	h2: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 12, marginBottom: 10 },
	row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
	bigBtn: {
		flexGrow: 1,
		minWidth: 140,
		backgroundColor: '#fff',
		borderRadius: 14,
		paddingVertical: 22,
		paddingHorizontal: 18,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#cbd5e1'
	},
	bigBtnText: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
	bigBtnSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
	previewBox: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 14,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		marginBottom: 12
	},
	previewTitle: { fontSize: 12, color: '#64748b', marginBottom: 4 },
	previewBody: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
	previewMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
	chip: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0'
	},
	chipOn: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
	chipText: { fontSize: 13, color: '#475569' },
	chipTextOn: { color: '#1d4ed8', fontWeight: '600' },
	input: {
		backgroundColor: '#fff',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		marginBottom: 12
	},
	notes: { minHeight: 64, textAlignVertical: 'top' },
	saveBtn: {
		marginTop: 8,
		backgroundColor: '#2563eb',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center'
	},
	saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
	secondaryBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
	secondaryBtnText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
	btnDisabled: { opacity: 0.45 }
});
