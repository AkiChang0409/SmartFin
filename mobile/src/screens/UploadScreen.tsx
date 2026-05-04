import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import {
	presignUpload,
	putUploadBinary,
	saveExpenseDocument,
	saveExpenseFromPendingDocument,
	postExpenseDetect,
	postWorkersVisionImage,
	getFinancialDocumentDetail,
	ApiError,
	type ExpenseDetectResult
} from '../api/client';
import { buildPdfRawTextForDetect, isLikelyPdfMimeOrName } from '../lib/pdf/extractPdfRawText';
import {
	CATEGORY_COMMON_FIELDS,
	CATEGORY_DEFAULTS,
	CATEGORY_DOC_TYPE_MAP,
	CATEGORY_LABELS_ZH,
	CATEGORY_METADATA_FIELDS,
	EXPENSE_CATEGORY_OPTIONS,
	EXPENSE_TYPE_LABELS_ZH,
	normalizeExpenseCurrency,
	type ExpenseCategory,
	type ExpenseType
} from '../constants/expenseUploadTaxonomy';
import { MAX_UPLOAD_BYTES } from '../config';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { appendUploadHistory } from '../upload/history';

type Props = NativeStackScreenProps<RootStackParamList, 'Upload'>;

type PickedFile = { uri: string; name: string; mime: string };

type LoadedDocument = {
	documentId: string;
	fileName: string;
	mime: string;
};

function todayYmd(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function isImageMime(m: string) {
	return m.toLowerCase().startsWith('image/');
}

export function UploadScreen({ navigation, route }: Props) {
	const initialDocumentId = route.params?.documentId ?? null;
	const initialFileName = route.params?.fileName;
	const initialFileType = route.params?.fileType;

	const [expenseType, setExpenseType] = useState<ExpenseType>('opex');
	const [category, setCategory] = useState<ExpenseCategory>('transport');

	const [picked, setPicked] = useState<PickedFile | null>(null);
	const [pendingDoc, setPendingDoc] = useState<LoadedDocument | null>(
		initialDocumentId
			? {
					documentId: initialDocumentId,
					fileName: initialFileName ?? '待处理文件',
					mime: initialFileType ?? 'application/octet-stream'
				}
			: null
	);
	const [loadingDoc, setLoadingDoc] = useState<boolean>(Boolean(initialDocumentId));
	const [detecting, setDetecting] = useState(false);
	const [saving, setSaving] = useState(false);
	const [detectInfo, setDetectInfo] = useState<string>('');
	const [rawPreview, setRawPreview] = useState('');

	const [amount, setAmount] = useState('');
	const [currency, setCurrency] = useState('SGD');
	const [expenseDate, setExpenseDate] = useState(todayYmd());
	const [vendorOrSupplier, setVendorOrSupplier] = useState('');
	const [staffName, setStaffName] = useState('');
	const [gstAmount, setGstAmount] = useState('');
	const [notes, setNotes] = useState('');
	const [destination, setDestination] = useState('');
	const [reimbursement, setReimbursement] = useState(true);
	const [businessTrip, setBusinessTrip] = useState(false);
	const [metaFields, setMetaFields] = useState<Record<string, string>>({});
	const [pdfJsHtml, setPdfJsHtml] = useState<string | null>(null);
	const pendingPdfJsRef = useRef<{
		resolve: (value: string) => void;
		reject: (reason?: unknown) => void;
		timer: ReturnType<typeof setTimeout>;
	} | null>(null);

	const isAllowance = category === 'allowance';
	const needsFile = !isAllowance;
	const autoDocType = CATEGORY_DOC_TYPE_MAP[category];
	const metaDefs = CATEGORY_METADATA_FIELDS[category] ?? [];
	const commonVis = CATEGORY_COMMON_FIELDS[category] ?? {
		vendorOrSupplier: true,
		staffName: true,
		gstAmount: true
	};

	const categoryChips = useMemo(
		() => [...EXPENSE_CATEGORY_OPTIONS[expenseType]] as ExpenseCategory[],
		[expenseType]
	);

	useEffect(() => {
		const cats = EXPENSE_CATEGORY_OPTIONS[expenseType] as readonly string[];
		if (!cats.includes(category)) {
			setCategory(cats[0] as ExpenseCategory);
		}
	}, [expenseType, category]);

	useEffect(() => {
		const d = CATEGORY_DEFAULTS[category];
		setReimbursement(d.reimbursement);
		setBusinessTrip(d.businessTrip);
		const fresh: Record<string, string> = {};
		for (const f of CATEGORY_METADATA_FIELDS[category] ?? []) {
			fresh[f.key] = '';
		}
		setMetaFields(fresh);
	}, [category]);

	useEffect(() => {
		return () => {
			const p = pendingPdfJsRef.current;
			if (p) {
				clearTimeout(p.timer);
				p.reject(new Error('PDF extraction cancelled'));
				pendingPdfJsRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!initialDocumentId) return;
		let cancelled = false;
		(async () => {
			try {
				const detail = await getFinancialDocumentDetail(initialDocumentId);
				if (cancelled) return;
				const lower = detail.fileName.toLowerCase();
				const inferredMime =
					detail.fileType === 'pdf' || lower.endsWith('.pdf')
						? 'application/pdf'
						: detail.fileType === 'image'
							? lower.endsWith('.png')
								? 'image/png'
								: lower.endsWith('.webp')
									? 'image/webp'
									: 'image/jpeg'
							: 'application/octet-stream';
				setPendingDoc({
					documentId: detail.documentId,
					fileName: detail.fileName,
					mime: inferredMime
				});
				if (detail.entityType === 'expense' && detail.entityId) {
					Alert.alert('该文件已被关联', '此文件已生成 expense 记录，将不再处理。', [
						{
							text: '返回',
							onPress: () => navigation.goBack()
						}
					]);
				}
			} catch (e) {
				const msg = e instanceof ApiError ? e.message : String(e);
				Alert.alert('加载待处理文件失败', msg, [
					{ text: '返回', onPress: () => navigation.goBack() }
				]);
			} finally {
				if (!cancelled) setLoadingDoc(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [initialDocumentId, navigation]);

	function buildPdfJsExtractionHtml(fileUri: string): string {
		const safeUri = JSON.stringify(fileUri);
		return `<!doctype html><html><head><meta charset="utf-8" /></head><body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
const send = (payload) => window.ReactNativeWebView.postMessage(JSON.stringify(payload));
(async () => {
  try {
    if (!window.pdfjsLib) throw new Error('pdfjs not loaded');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const fileUri = ${safeUri};
    const res = await fetch(fileUri);
    if (!res.ok) throw new Error('fetch failed: ' + res.status);
    const data = new Uint8Array(await res.arrayBuffer());
    const task = window.pdfjsLib.getDocument({ data });
    const pdf = await Promise.race([
      task.promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('pdf parse timeout')), 15000))
    ]);
    const maxPages = Math.min(pdf.numPages, 8);
    const chunks = [];
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) => (item && typeof item.str === 'string' ? item.str : ''))
        .join(' ')
        .replace(/\\s+/g, ' ')
        .trim();
      if (line) chunks.push(line);
    }
    send({ ok: true, text: chunks.join('\\n').trim() });
  } catch (e) {
    send({ ok: false, error: e && e.message ? e.message : String(e) });
  }
})();
</script></body></html>`;
	}

	async function extractPdfTextByWebView(uri: string): Promise<string> {
		if (Platform.OS === 'web') return '';
		if (pendingPdfJsRef.current) throw new Error('PDF extraction already in progress');

		return await new Promise<string>((resolve, reject) => {
			const timer = setTimeout(() => {
				pendingPdfJsRef.current = null;
				setPdfJsHtml(null);
				reject(new Error('PDF.js extraction timeout'));
			}, 25000);

			pendingPdfJsRef.current = {
				resolve: (text) => {
					clearTimeout(timer);
					pendingPdfJsRef.current = null;
					setPdfJsHtml(null);
					resolve(text);
				},
				reject: (err) => {
					clearTimeout(timer);
					pendingPdfJsRef.current = null;
					setPdfJsHtml(null);
					reject(err);
				},
				timer
			};
			setPdfJsHtml(buildPdfJsExtractionHtml(uri));
		});
	}

	function onPdfJsWebMessage(event: WebViewMessageEvent) {
		const pending = pendingPdfJsRef.current;
		if (!pending) return;
		try {
			const payload = JSON.parse(event.nativeEvent.data) as {
				ok?: boolean;
				text?: string;
				error?: string;
			};
			if (payload.ok) {
				pending.resolve((payload.text ?? '').trim());
			} else {
				pending.reject(new Error(payload.error || 'PDF.js extraction failed'));
			}
		} catch {
			pending.reject(new Error('Invalid PDF.js bridge payload'));
		}
	}

	async function onPickFile() {
		const res = await DocumentPicker.getDocumentAsync({
			type: '*/*',
			copyToCacheDirectory: true
		});
		if (res.canceled || !res.assets?.[0]) return;
		const a = res.assets[0];
		setPicked({
			uri: a.uri,
			name: a.name ?? 'file',
			mime: a.mimeType ?? 'application/octet-stream'
		});
		setRawPreview('');
		setDetectInfo('');
	}

	function applyDetectData(data: ExpenseDetectResult) {
		const s = data.suggestions ?? {};
		if (typeof s.amount === 'number') setAmount(String(s.amount));
		if (typeof s.currency === 'string') {
			const c = normalizeExpenseCurrency(s.currency);
			if (c) setCurrency(c);
		}
		if (typeof s.expenseDate === 'string' && s.expenseDate) setExpenseDate(s.expenseDate);
		if (typeof s.vendorOrSupplier === 'string' && s.vendorOrSupplier)
			setVendorOrSupplier(s.vendorOrSupplier);
		if (typeof s.gstAmount === 'number') setGstAmount(String(s.gstAmount));

		const hints = data.metaHints ?? {};
		const defs = CATEGORY_METADATA_FIELDS[category] ?? [];
		setMetaFields((prev) => {
			const next = { ...prev };
			for (const def of defs) {
				const v = hints[def.key];
				if (v != null && String(v).trim() !== '') next[def.key] = String(v);
			}
			return next;
		});

		setRawPreview(typeof data.rawTextPreview === 'string' ? data.rawTextPreview : '');
		const conf =
			typeof data.confidence === 'number' ? `模型置信度约 ${Math.round(data.confidence)}%。` : '';
		const n = data.rawTextLength ?? 0;
		const warn = (data.ocr?.warnings?.length && data.ocr.warnings.join('; ')) || '';
		setDetectInfo(
			`已提取约 ${n} 字符 OCR 文本。${conf}${warn ? `\n注意：${warn}` : ''}${data.provider ? `\n提供方：${data.provider}` : ''}`
		);
	}

	async function runOcrDetect() {
		if (isAllowance) return;
		if (!picked && !pendingDoc) return;

		setDetecting(true);
		setDetectInfo('');
		try {
			if (pendingDoc) {
				// 两段式第二段：文件已在 R2，由服务端从 documents.fileKey 取回处理（toMarkdown / vision fallback）。
				const data = await postExpenseDetect({
					documentId: pendingDoc.documentId,
					fileName: pendingDoc.fileName,
					mime: pendingDoc.mime,
					expenseType,
					category,
					docType: autoDocType ?? undefined
				});
				applyDetectData(data);
				Alert.alert('OCR + AI', '已根据当前场景尝试匹配字段，请核对后保存。');
				return;
			}

			if (!picked) return;
			let rawText = '';
			if (isLikelyPdfMimeOrName(picked.mime, picked.name)) {
				// 与网页端一致：优先 PDF.js textContent，再送 `/api/expenses/detect`。
				try {
					rawText = await extractPdfTextByWebView(picked.uri);
				} catch {
					rawText = '';
				}
				// 兜底：扫描件或 PDF.js 失败时，走图片化 + vision OCR。
				if (!rawText.trim()) {
					rawText = await buildPdfRawTextForDetect({
						uri: picked.uri,
						fileName: picked.name,
						mime: picked.mime,
						runWorkersVision: postWorkersVisionImage
					});
				}
			} else if (isImageMime(picked.mime)) {
				try {
					const vis = await postWorkersVisionImage({
						uri: picked.uri,
						fileName: picked.name,
						mime: picked.mime
					});
					if (vis.text?.trim()) rawText = vis.text.trim();
				} catch {
					// 与网页一致：视觉 OCR 失败则交给服务端 pipeline
				}
			}

			const data = await postExpenseDetect({
				uri: picked.uri,
				fileName: picked.name,
				mime: picked.mime,
				expenseType,
				category,
				docType: autoDocType ?? undefined,
				rawText: rawText || undefined
			});
			applyDetectData(data);
			Alert.alert('OCR + AI', '已根据当前场景尝试匹配字段，请核对后保存。');
		} catch (e) {
			const msg = e instanceof ApiError ? e.message : String(e);
			Alert.alert('识别失败', msg);
		} finally {
			setDetecting(false);
		}
	}

	async function saveExpense() {
		if (isAllowance) {
			Alert.alert('提示', '出差津贴无附件，请在网页端「费用上传」中录入。');
			return;
		}
		if (!picked && !pendingDoc) {
			Alert.alert('提示', '请先选择文件');
			return;
		}
		const amountNum = Number.parseFloat(amount.replace(/,/g, '').trim());
		if (!Number.isFinite(amountNum) || amountNum <= 0) {
			Alert.alert('提示', '请填写有效金额');
			return;
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate.trim())) {
			Alert.alert('提示', '日期格式 YYYY-MM-DD');
			return;
		}

		if (picked?.uri) {
			const head = await fetch(picked.uri);
			const buf = await head.arrayBuffer();
			if (buf.byteLength > MAX_UPLOAD_BYTES) {
				Alert.alert('文件过大', `请不超过 ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`);
				return;
			}
		}

		const gst =
			gstAmount.trim() === '' ? 0 : Number.parseFloat(gstAmount.replace(/,/g, '').trim());
		const gstNum = Number.isFinite(gst) ? gst : 0;

		const meta: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(metaFields)) {
			if (v.trim()) {
				const def = metaDefs.find((d) => d.key === k);
				meta[k] = def?.type === 'number' ? Number(v) : v.trim();
			}
		}

		const idempotencyKey = Crypto.randomUUID();

		const sharedPayload = {
			idempotencyKey,
			projectId: null as string | null,
			expenseType,
			category,
			docType: autoDocType,
			date: expenseDate.trim(),
			amount: amountNum,
			currency,
			gstAmount: gstNum,
			vendorOrSupplier: vendorOrSupplier.trim() || null,
			staffName: staffName.trim() || null,
			notes: notes.trim() || null,
			reimbursement,
			businessTrip,
			destination: destination.trim() || null,
			metadata: Object.keys(meta).length ? meta : null
		};

		setSaving(true);
		try {
			let saved: { documentId: string; expenseId: string };
			let displayName: string;

			if (pendingDoc) {
				// 两段式第二段：文件已在 R2，复用 documents 行
				saved = await saveExpenseFromPendingDocument(pendingDoc.documentId, sharedPayload);
				displayName = pendingDoc.fileName;
			} else {
				if (!picked) return;
				const presignProjectId = 'company';
				const entityId = Crypto.randomUUID();
				const presign = await presignUpload({
					fileName: picked.name,
					contentType: picked.mime,
					projectId: presignProjectId,
					entityType: 'expense',
					entityId
				});
				const bufRes = await fetch(picked.uri);
				const buf = await bufRes.arrayBuffer();
				await putUploadBinary(presign.uploadUrl, picked.mime, buf);

				saved = await saveExpenseDocument({
					...sharedPayload,
					key: presign.key,
					fileName: picked.name,
					fileType: picked.mime
				});
				displayName = picked.name;
			}

			await appendUploadHistory({
				id: saved.expenseId,
				kind: 'expense',
				label: displayName,
				createdAt: new Date().toISOString(),
				fileName: displayName,
				documentId: saved.documentId
			});

			navigation.navigate('ExpenseResult', {
				expenseId: saved.expenseId,
				documentId: saved.documentId,
				fileName: displayName
			});
		} catch (e) {
			const msg = e instanceof ApiError ? e.message : String(e);
			Alert.alert('保存失败', msg);
		} finally {
			setSaving(false);
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.flex}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
				<Text style={styles.lead}>
					流程与网页「费用上传」一致：先选费用类型与业务场景 → 选文件 →
					<Text style={{ fontWeight: '700' }}> OCR + AI 自动匹配 </Text>
					→ 核对字段 → 保存（公司级，不写项目）。
				</Text>

				<Text style={styles.h2}>1. 费用类型</Text>
				<View style={styles.row}>
					{( ['opex', 'sales_cost'] as const).map((t) => (
						<TouchableOpacity
							key={t}
							style={[styles.typeChip, expenseType === t && styles.typeChipOn]}
							onPress={() => setExpenseType(t)}
						>
							<Text style={[styles.typeChipText, expenseType === t && styles.typeChipTextOn]}>
								{EXPENSE_TYPE_LABELS_ZH[t]}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				<Text style={styles.h2}>2. 业务场景（决定 LLM 提取字段集）</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
					{categoryChips.map((c) => (
						<TouchableOpacity
							key={c}
							style={[styles.chip, category === c && styles.chipOn]}
							onPress={() => setCategory(c)}
						>
							<Text style={[styles.chipText, category === c && styles.chipTextOn]}>
								{CATEGORY_LABELS_ZH[c] ?? c}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
				<Text style={styles.meta}>
					推断凭证类型：{autoDocType ?? '无（按场景手填）'}
					{isAllowance ? ' · 津贴无文件，请用网页录入' : ''}
				</Text>

				{!isAllowance ? (
					<>
						<Text style={styles.h2}>3. 文件</Text>
						{pendingDoc ? (
							<View style={styles.fileBtn}>
								<Text style={styles.fileBtnText}>
									{loadingDoc ? '加载待处理文件…' : `处理中：${pendingDoc.fileName}`}
								</Text>
								<Text style={styles.hint}>来自待处理记录，已在云端，无需重新上传。</Text>
							</View>
						) : (
							<TouchableOpacity style={styles.fileBtn} onPress={onPickFile}>
								<Text style={styles.fileBtnText}>
									{picked ? `已选：${picked.name}` : '选择凭证文件'}
								</Text>
							</TouchableOpacity>
						)}
						<TouchableOpacity
							style={[
								styles.ocrBtn,
								((!picked && !pendingDoc) || detecting || loadingDoc) && styles.btnDisabled
							]}
							onPress={() => void runOcrDetect()}
							disabled={(!picked && !pendingDoc) || detecting || loadingDoc}
						>
							{detecting ? (
								<ActivityIndicator color="#14532d" />
							) : (
								<Text style={styles.ocrBtnText}>OCR + AI 自动匹配</Text>
							)}
						</TouchableOpacity>
						<Text style={styles.hint}>
							{pendingDoc
								? '由服务端从云端取回文件，使用 toMarkdown / 视觉 OCR 自动抽取文本。'
								: 'PDF 先走 PDF.js textContent 提取，图片走 Workers 视觉 OCR，再统一送检测。'}
						</Text>
						{detectInfo ? <Text style={styles.info}>{detectInfo}</Text> : null}
						{rawPreview ? (
							<View style={styles.previewBox}>
								<Text style={styles.previewTitle}>OCR 文本预览（节选）</Text>
								<Text selectable style={styles.previewBody} numberOfLines={12}>
									{rawPreview}
								</Text>
							</View>
						) : null}
					</>
				) : (
					<Text style={styles.warn}>当前场景为「出差津贴」，无附件流程，请使用网页端完成录入。</Text>
				)}

				<Text style={styles.h2}>{isAllowance ? '—' : '4'}. 费用字段</Text>
				<Text style={styles.label}>金额 *</Text>
				<TextInput
					style={styles.input}
					keyboardType="decimal-pad"
					placeholder="0.00"
					value={amount}
					onChangeText={setAmount}
					editable={!isAllowance}
				/>
				<Text style={styles.label}>币种</Text>
				<View style={styles.rowWrap}>
					{(['SGD', 'USD', 'CNY', 'MYR', 'EUR'] as const).map((c) => (
						<TouchableOpacity
							key={c}
							style={[styles.miniChip, currency === c && styles.miniChipOn]}
							onPress={() => setCurrency(c)}
						>
							<Text style={[styles.miniChipText, currency === c && styles.miniChipTextOn]}>{c}</Text>
						</TouchableOpacity>
					))}
				</View>
				<Text style={styles.label}>发生日期 *</Text>
				<TextInput
					style={styles.input}
					value={expenseDate}
					onChangeText={setExpenseDate}
					placeholder={todayYmd()}
					editable={!isAllowance}
				/>
				{commonVis.vendorOrSupplier ? (
					<>
						<Text style={styles.label}>供应商 / 商户</Text>
						<TextInput
							style={styles.input}
							value={vendorOrSupplier}
							onChangeText={setVendorOrSupplier}
							editable={!isAllowance}
						/>
					</>
				) : null}
				{commonVis.staffName ? (
					<>
						<Text style={styles.label}>员工姓名</Text>
						<TextInput
							style={styles.input}
							value={staffName}
							onChangeText={setStaffName}
							editable={!isAllowance}
						/>
					</>
				) : null}
				{commonVis.gstAmount ? (
					<>
						<Text style={styles.label}>GST 金额</Text>
						<TextInput
							style={styles.input}
							keyboardType="decimal-pad"
							value={gstAmount}
							onChangeText={setGstAmount}
							editable={!isAllowance}
						/>
					</>
				) : null}

				<View style={styles.switchRow}>
					<Text style={styles.label}>报销 (reimbursement)</Text>
					<Switch value={reimbursement} onValueChange={setReimbursement} disabled={isAllowance} />
				</View>
				<View style={styles.switchRow}>
					<Text style={styles.label}>出差 (business trip)</Text>
					<Switch value={businessTrip} onValueChange={setBusinessTrip} disabled={isAllowance} />
				</View>
				<Text style={styles.label}>目的地（可选）</Text>
				<TextInput
					style={styles.input}
					value={destination}
					onChangeText={setDestination}
					placeholder="例如 China / Malaysia"
					editable={!isAllowance}
				/>

				{metaDefs.length > 0 && !isAllowance ? (
					<>
						<Text style={styles.h2}>场景扩展字段</Text>
						{metaDefs.map((def) => (
							<View key={def.key}>
								<Text style={styles.label}>{def.label}</Text>
								<TextInput
									style={styles.input}
									value={metaFields[def.key] ?? ''}
									onChangeText={(v) => setMetaFields((m) => ({ ...m, [def.key]: v }))}
								/>
							</View>
						))}
					</>
				) : null}

				<Text style={styles.label}>备注</Text>
				<TextInput
					style={[styles.input, styles.notes]}
					multiline
					value={notes}
					onChangeText={setNotes}
					editable={!isAllowance}
				/>

				<TouchableOpacity
					style={[
						styles.saveBtn,
						(saving || isAllowance || loadingDoc) && styles.btnDisabled
					]}
					onPress={() => void saveExpense()}
					disabled={saving || isAllowance || loadingDoc}
				>
					{saving ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.saveBtnText}>
							{pendingDoc ? '保存费用并完成处理' : '保存费用与文件'}
						</Text>
					)}
				</TouchableOpacity>
			</ScrollView>
			{pdfJsHtml ? (
				<View style={styles.hiddenWebviewWrap}>
					<WebView
						originWhitelist={['*']}
						source={{ html: pdfJsHtml }}
						javaScriptEnabled
						domStorageEnabled
						onMessage={onPdfJsWebMessage}
						onError={(e) => {
							const pending = pendingPdfJsRef.current;
							if (!pending) return;
							pending.reject(new Error(e.nativeEvent.description || 'PDF.js WebView error'));
						}}
					/>
				</View>
			) : null}
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: '#f8fafc' },
	wrap: { padding: 16, paddingBottom: 48 },
	lead: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
	h2: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 12, marginBottom: 10 },
	row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
	typeChip: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 10,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0'
	},
	typeChipOn: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
	typeChipText: { fontSize: 14, color: '#475569' },
	typeChipTextOn: { color: '#1d4ed8', fontWeight: '600' },
	chipScroll: { maxHeight: 48, marginBottom: 6 },
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0',
		marginRight: 8
	},
	chipOn: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
	chipText: { fontSize: 13, color: '#475569' },
	chipTextOn: { color: '#1d4ed8', fontWeight: '600' },
	meta: { fontSize: 12, color: '#64748b', marginBottom: 8 },
	fileBtn: {
		backgroundColor: '#fff',
		padding: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		marginBottom: 10
	},
	fileBtnText: { fontSize: 15, color: '#0f172a' },
	ocrBtn: {
		backgroundColor: '#dcfce7',
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#86efac',
		marginBottom: 8
	},
	ocrBtnText: { fontSize: 16, fontWeight: '700', color: '#14532d' },
	hint: { fontSize: 12, color: '#64748b', marginBottom: 8 },
	info: { fontSize: 12, color: '#166534', marginBottom: 8 },
	previewBox: {
		backgroundColor: '#fff',
		borderRadius: 10,
		padding: 10,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		marginBottom: 12
	},
	previewTitle: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6 },
	previewBody: { fontSize: 11, color: '#334155', lineHeight: 16 },
	warn: { fontSize: 13, color: '#b45309', marginVertical: 8 },
	label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
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
	rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
	miniChip: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#e2e8f0'
	},
	miniChipOn: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
	miniChipText: { fontSize: 13, color: '#64748b' },
	miniChipTextOn: { color: '#1d4ed8', fontWeight: '600' },
	switchRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10
	},
	saveBtn: {
		marginTop: 16,
		backgroundColor: '#2563eb',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center'
	},
	saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
	btnDisabled: { opacity: 0.45 }
	,
	hiddenWebviewWrap: {
		position: 'absolute',
		width: 1,
		height: 1,
		opacity: 0
	}
});
