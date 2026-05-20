import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	SafeAreaView,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View
} from 'react-native';

import { SmartFinApi } from './src/api';
import {
	coerceDraftValue,
	confidenceFor,
	type Draft,
	editableFields,
	fieldMeta,
	initialDraftFor,
	projectValueFromDraft,
	uniqueFields
} from './src/fieldMeta';
import type { CategoryChoice, ConfirmPayload, DocumentArtifactView, ProcessingStatus, ProjectInfo } from './src/types';

const PROCESSING_STATUSES: ProcessingStatus[] = [
	'received',
	'stored',
	'text_extraction_pending',
	'text_extracted',
	'ocr_pending',
	'ocr_completed',
	'classification_pending',
	'classified',
	'fields_extraction_pending'
];

const READY_STATUSES: ProcessingStatus[] = ['ready_for_review', 'ready_for_workflow'];

const CATEGORY_BY_DOCUMENT_TYPE: Record<string, string[]> = {
	supplier_invoice: ['expense.sales_cost.invoice'],
	customer_invoice: ['revenue.invoice_out'],
	receipt: [
		'expense.sales_cost.receipt',
		'expense.opex.meal',
		'expense.opex.transport',
		'expense.opex.accommodation',
		'expense.opex.ai_subscription',
		'expense.opex.others'
	],
	purchase_order: ['document_only.purchase_order'],
	contract: ['document_only.contract'],
	quotation: ['document_only.quotation']
};

const DEFAULT_BASE_URL = 'http://localhost:5173';

type ReviewStep = 'category' | 'fields' | 'project';

function categorySuggestions(artifact: DocumentArtifactView, categories: CategoryChoice[]) {
	const seen = new Set<string>();
	const out: Array<{ category: CategoryChoice; confidence?: number }> = [];
	const add = (id: string | undefined, confidence?: number) => {
		if (!id || seen.has(id)) return;
		const category = categories.find((c) => c.id === id);
		if (!category) return;
		seen.add(id);
		out.push({ category, confidence });
	};
	add(artifact.suggestedCategoryId, artifact.classification?.confidence);
	for (const candidate of artifact.classification?.possibleTypes ?? []) {
		for (const id of CATEGORY_BY_DOCUMENT_TYPE[candidate.documentType] ?? []) {
			add(id, candidate.confidence);
		}
	}
	return out.slice(0, 4);
}

function formatStatus(status: string) {
	return status.replaceAll('_', ' ');
}

function formatDate(iso: string) {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
}

function sizeLabel(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function App() {
	const apiRef = useRef(new SmartFinApi(DEFAULT_BASE_URL));
	const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [signedIn, setSignedIn] = useState(false);
	const [authBusy, setAuthBusy] = useState(false);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [categories, setCategories] = useState<CategoryChoice[]>([]);
	const [processing, setProcessing] = useState<DocumentArtifactView[]>([]);
	const [ready, setReady] = useState<DocumentArtifactView[]>([]);
	const [reviewArtifact, setReviewArtifact] = useState<DocumentArtifactView | null>(null);

	useEffect(() => {
		apiRef.current.setBaseUrl(baseUrl);
	}, [baseUrl]);

	const refreshInbox = useCallback(async () => {
		if (!signedIn) return;
		const [processingItems, readyItems, categoryItems] = await Promise.all([
			apiRef.current.inbox(PROCESSING_STATUSES),
			apiRef.current.inbox(READY_STATUSES),
			categories.length > 0 ? Promise.resolve(categories) : apiRef.current.categories()
		]);
		setProcessing(processingItems);
		setReady(readyItems);
		setCategories(categoryItems);
	}, [categories, signedIn]);

	useEffect(() => {
		if (!signedIn) return;
		const timer = setInterval(() => {
			refreshInbox().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Refresh failed'));
		}, 5000);
		return () => clearInterval(timer);
	}, [refreshInbox, signedIn]);

	async function signIn() {
		setAuthBusy(true);
		setError('');
		setMessage('');
		try {
			await apiRef.current.signIn(email.trim(), password);
			const categoryItems = await apiRef.current.categories();
			const [processingItems, readyItems] = await Promise.all([
				apiRef.current.inbox(PROCESSING_STATUSES),
				apiRef.current.inbox(READY_STATUSES)
			]);
			setCategories(categoryItems);
			setProcessing(processingItems);
			setReady(readyItems);
			setSignedIn(true);
			setMessage('Signed in. Capture a document to start the inbox flow.');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Sign-in failed');
		} finally {
			setAuthBusy(false);
		}
	}

	async function captureAndUpload() {
		setBusy(true);
		setError('');
		setMessage('');
		try {
			const permission = await ImagePicker.requestCameraPermissionsAsync();
			if (!permission.granted) {
				throw new Error('Camera permission is required to capture documents.');
			}
			const result = await ImagePicker.launchCameraAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				quality: 0.82,
				allowsEditing: false
			});
			if (result.canceled || !result.assets[0]) return;
			const asset = result.assets[0];
			const uploaded = await apiRef.current.uploadPhoto({
				uri: asset.uri,
				name: asset.fileName ?? `smartfin-document-${Date.now()}.jpg`,
				type: asset.mimeType ?? 'image/jpeg'
			});
			setMessage(`Uploaded ${uploaded.originalFile.fileName}. Waiting for processing.`);
			await refreshInbox();
			if (READY_STATUSES.includes(uploaded.processingStatus)) {
				setReviewArtifact(uploaded);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Upload failed');
		} finally {
			setBusy(false);
		}
	}

	async function chooseImageAndUpload() {
		setBusy(true);
		setError('');
		setMessage('');
		try {
			const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permission.granted) {
				throw new Error('Photo library permission is required to choose an image.');
			}
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				quality: 0.9
			});
			if (result.canceled || !result.assets[0]) return;
			const asset = result.assets[0];
			const uploaded = await apiRef.current.uploadPhoto({
				uri: asset.uri,
				name: asset.fileName ?? `smartfin-upload-${Date.now()}.jpg`,
				type: asset.mimeType ?? 'image/jpeg'
			});
			setMessage(`Uploaded ${uploaded.originalFile.fileName}. Waiting for processing.`);
			await refreshInbox();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Upload failed');
		} finally {
			setBusy(false);
		}
	}

	async function openReview(item: DocumentArtifactView) {
		setBusy(true);
		setError('');
		try {
			const artifact = await apiRef.current.document(item.id);
			setReviewArtifact(artifact);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not open document');
		} finally {
			setBusy(false);
		}
	}

	if (!signedIn) {
		return (
			<SafeAreaView style={styles.safe}>
				<StatusBar style="dark" />
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
					<ScrollView contentContainerStyle={styles.authShell} keyboardShouldPersistTaps="handled">
						<Text style={styles.brand}>SmartFin Mobile</Text>
						<Text style={styles.title}>Document inbox MVP</Text>
						<Text style={styles.copy}>
							Connect to the SmartFin worker, sign in, then capture documents into the same inbox pipeline used by the web AI Panel.
						</Text>

						<LabeledInput
							label="SmartFin API base URL"
							value={baseUrl}
							onChangeText={setBaseUrl}
							autoCapitalize="none"
							placeholder="http://192.168.1.23:5173"
						/>
						<LabeledInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
						<LabeledInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />

						<Notice message={message} error={error} />
						<PrimaryButton label={authBusy ? 'Signing in...' : 'Sign in'} disabled={authBusy || !email || !password} onPress={signIn} />
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		);
	}

	if (reviewArtifact) {
		return (
			<ReviewScreen
				api={apiRef.current}
				artifact={reviewArtifact}
				categories={categories}
				onBack={() => {
					setReviewArtifact(null);
					refreshInbox().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Refresh failed'));
				}}
				onUpdated={setReviewArtifact}
				onConfirmed={() => {
					setReviewArtifact(null);
					refreshInbox().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Refresh failed'));
				}}
			/>
		);
	}

	return (
		<SafeAreaView style={styles.safe}>
			<StatusBar style="dark" />
			<ScrollView contentContainerStyle={styles.shell}>
				<View style={styles.headerRow}>
					<View>
						<Text style={styles.brand}>SmartFin</Text>
						<Text style={styles.title}>Mobile inbox</Text>
					</View>
					<Pressable style={styles.ghostButton} onPress={() => refreshInbox().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Refresh failed'))}>
						<Text style={styles.ghostButtonText}>Refresh</Text>
					</Pressable>
				</View>

				<Notice message={message} error={error} />

				<View style={styles.capturePanel}>
					<Text style={styles.panelTitle}>Capture document</Text>
					<Text style={styles.copy}>Photos are uploaded to /api/documents and then processed by document-intake.</Text>
					<View style={styles.buttonRow}>
						<PrimaryButton label={busy ? 'Working...' : 'Take photo'} disabled={busy} onPress={captureAndUpload} />
						<SecondaryButton label="Choose image" disabled={busy} onPress={chooseImageAndUpload} />
					</View>
					{busy ? <ActivityIndicator color="#387234" style={styles.loader} /> : null}
				</View>

				<InboxSection title="Ready" empty="No documents ready for review." items={ready} onOpen={openReview} />
				<InboxSection title="Processing" empty="No documents processing." items={processing} onOpen={openReview} passive />
			</ScrollView>
		</SafeAreaView>
	);
}

function ReviewScreen({
	api,
	artifact: initialArtifact,
	categories,
	onBack,
	onUpdated,
	onConfirmed
}: {
	api: SmartFinApi;
	artifact: DocumentArtifactView;
	categories: CategoryChoice[];
	onBack: () => void;
	onUpdated: (artifact: DocumentArtifactView) => void;
	onConfirmed: () => void;
}) {
	const [artifact, setArtifact] = useState(initialArtifact);
	const [step, setStep] = useState<ReviewStep>('category');
	const [selectedCategoryId, setSelectedCategoryId] = useState(artifact.suggestedCategoryId ?? categories[0]?.id ?? '');
	const selectedCategory = useMemo(
		() => categories.find((category) => category.id === selectedCategoryId) ?? null,
		[categories, selectedCategoryId]
	);
	const [draft, setDraft] = useState<Draft>(() => initialDraftFor(artifact, selectedCategory));
	const [projectId, setProjectId] = useState(() => projectValueFromDraft(draft));
	const [projectQuery, setProjectQuery] = useState('');
	const [projectStatus, setProjectStatus] = useState('active');
	const [projects, setProjects] = useState<ProjectInfo[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');

	const suggestions = useMemo(() => categorySuggestions(artifact, categories), [artifact, categories]);
	const fields = useMemo(() => editableFields(selectedCategory), [selectedCategory]);
	const allFields = useMemo(() => uniqueFields(selectedCategory), [selectedCategory]);
	const isArchiveOnly = Boolean(selectedCategory?.persistTarget && selectedCategory.persistTarget !== 'expenses' && selectedCategory.persistTarget !== 'revenue');
	const projectRequired = Boolean(selectedCategory?.requiresProject || isArchiveOnly);
	const canConfirm = step === 'project' && selectedCategory && (!projectRequired || projectId);

	useEffect(() => {
		setArtifact(initialArtifact);
	}, [initialArtifact]);

	useEffect(() => {
		setDraft(initialDraftFor(artifact, selectedCategory));
	}, [artifact, selectedCategory]);

	async function changeCategory(categoryId: string) {
		if (categoryId === selectedCategoryId) return;
		setBusy(true);
		setError('');
		setMessage('');
		try {
			setSelectedCategoryId(categoryId);
			const updated = await api.reclassify(artifact.id, categoryId);
			const nextCategoryId = updated.suggestedCategoryId ?? categoryId;
			const nextCategory = categories.find((category) => category.id === nextCategoryId) ?? null;
			setArtifact(updated);
			onUpdated(updated);
			setSelectedCategoryId(nextCategoryId);
			const nextDraft = initialDraftFor(updated, nextCategory);
			setDraft(nextDraft);
			setProjectId(projectValueFromDraft(nextDraft));
			setStep('category');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Reclassify failed');
		} finally {
			setBusy(false);
		}
	}

	async function searchProjects() {
		setBusy(true);
		setError('');
		try {
			const rows = await api.projects(projectQuery, projectStatus);
			setProjects(rows);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Project search failed');
		} finally {
			setBusy(false);
		}
	}

	function payloadFields() {
		const out: Record<string, unknown> = {};
		for (const key of allFields) out[key] = coerceDraftValue(key, draft[key]);
		out.project_id = projectId;
		return out;
	}

	async function confirm() {
		if (!selectedCategory) return;
		setBusy(true);
		setError('');
		setMessage('');
		try {
			const payload: ConfirmPayload = {
				documentId: artifact.id,
				categoryId: selectedCategory.id,
				supplierId: null,
				poId: null,
				projectId: projectId || null,
				fields: payloadFields()
			};
			const result = await api.confirm(payload);
			Alert.alert('Confirmed', `Created ${result.categoryId} record.`);
			onConfirmed();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Confirm failed');
		} finally {
			setBusy(false);
		}
	}

	return (
		<SafeAreaView style={styles.safe}>
			<StatusBar style="dark" />
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
				<ScrollView contentContainerStyle={styles.shell} keyboardShouldPersistTaps="handled">
					<View style={styles.headerRow}>
						<View style={styles.flex}>
							<Text style={styles.brand}>Review</Text>
							<Text style={styles.title} numberOfLines={2}>{artifact.originalFile.fileName}</Text>
							<Text style={styles.meta}>{formatStatus(artifact.processingStatus)} · {sizeLabel(artifact.originalFile.sizeBytes)}</Text>
						</View>
						<Pressable style={styles.ghostButton} onPress={onBack}>
							<Text style={styles.ghostButtonText}>Back</Text>
						</Pressable>
					</View>

					<Notice message={message} error={error} />

					<View style={styles.stepRow}>
						<StepPill active={step === 'category'} label="1 Category" />
						<StepPill active={step === 'fields'} label="2 Fields" />
						<StepPill active={step === 'project'} label="3 Project" />
					</View>

					{step === 'category' ? (
						<View style={styles.panel}>
							<Text style={styles.panelTitle}>Confirm category</Text>
							{suggestions.map(({ category, confidence }) => (
								<Pressable key={category.id} style={[styles.option, selectedCategoryId === category.id && styles.optionSelected]} onPress={() => changeCategory(category.id)}>
									<Text style={styles.optionTitle}>{category.label}</Text>
									<Text style={styles.meta}>{category.sublabel ?? category.id}{confidence != null ? ` · ${(confidence * 100).toFixed(0)}%` : ''}</Text>
								</Pressable>
							))}
							<Text style={styles.smallLabel}>All categories</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
								{categories.map((category) => (
									<Pressable key={category.id} style={[styles.chip, selectedCategoryId === category.id && styles.chipSelected]} onPress={() => changeCategory(category.id)}>
										<Text style={[styles.chipText, selectedCategoryId === category.id && styles.chipTextSelected]}>{category.label}</Text>
									</Pressable>
								))}
							</ScrollView>
							<PrimaryButton label={busy ? 'Working...' : 'Category is correct'} disabled={busy || !selectedCategory} onPress={() => setStep('fields')} />
						</View>
					) : null}

					{step === 'fields' ? (
						<View style={styles.panel}>
							<Text style={styles.panelTitle}>Check fields</Text>
							{fields.length === 0 ? <Text style={styles.copy}>No category fields were suggested.</Text> : null}
							{fields.map((key) => {
								const meta = fieldMeta(key);
								const confidence = confidenceFor(artifact, key);
								const value = draft[key];
								if (meta.kind === 'checkbox') {
									return (
										<Pressable key={key} style={styles.checkboxRow} onPress={() => setDraft((prev) => ({ ...prev, [key]: !prev[key] }))}>
											<View style={[styles.checkbox, value === true && styles.checkboxOn]} />
											<Text style={styles.label}>{meta.label}</Text>
										</Pressable>
									);
								}
								return (
									<LabeledInput
										key={key}
										label={`${meta.label}${confidence != null ? ` (${(confidence * 100).toFixed(0)}%)` : ''}`}
										value={typeof value === 'string' ? value : ''}
										onChangeText={(text) => setDraft((prev) => ({ ...prev, [key]: text }))}
										keyboardType={meta.kind === 'number' ? 'decimal-pad' : 'default'}
										multiline={meta.kind === 'textarea'}
									/>
								);
							})}
							<View style={styles.buttonRow}>
								<SecondaryButton label="Back" onPress={() => setStep('category')} />
								<PrimaryButton label="Fields look right" onPress={() => setStep('project')} />
							</View>
						</View>
					) : null}

					{step === 'project' ? (
						<View style={styles.panel}>
							<Text style={styles.panelTitle}>Link project</Text>
							<Text style={styles.copy}>{projectRequired ? 'This category requires a project.' : 'Project is optional for this category.'}</Text>
							<LabeledInput label="Search project" value={projectQuery} onChangeText={setProjectQuery} placeholder="Project name, ID, or customer" />
							<View style={styles.statusRow}>
								{['active', 'on_hold', 'completed', ''].map((status) => (
									<Pressable key={status || 'all'} style={[styles.chip, projectStatus === status && styles.chipSelected]} onPress={() => setProjectStatus(status)}>
										<Text style={[styles.chipText, projectStatus === status && styles.chipTextSelected]}>{status || 'all'}</Text>
									</Pressable>
								))}
							</View>
							<SecondaryButton label={busy ? 'Searching...' : 'Search projects'} disabled={busy} onPress={searchProjects} />
							{!projectRequired ? (
								<Pressable style={[styles.option, projectId === '' && styles.optionSelected]} onPress={() => setProjectId('')}>
									<Text style={styles.optionTitle}>No project / company-level</Text>
								</Pressable>
							) : null}
							{projects.map((project) => (
								<Pressable key={project.id} style={[styles.option, projectId === project.id && styles.optionSelected]} onPress={() => setProjectId(project.id)}>
									<Text style={styles.optionTitle}>{project.name}</Text>
									<Text style={styles.meta}>{project.customerName ?? 'No customer'} · {project.status}</Text>
								</Pressable>
							))}
							<View style={styles.buttonRow}>
								<SecondaryButton label="Back" onPress={() => setStep('fields')} />
								<PrimaryButton label={busy ? 'Working...' : 'Confirm'} disabled={busy || !canConfirm} onPress={confirm} />
							</View>
						</View>
					) : null}
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

function InboxSection({
	title,
	empty,
	items,
	onOpen,
	passive = false
}: {
	title: string;
	empty: string;
	items: DocumentArtifactView[];
	onOpen: (item: DocumentArtifactView) => void;
	passive?: boolean;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			{items.length === 0 ? <Text style={styles.empty}>{empty}</Text> : null}
			{items.map((item) => (
				<Pressable key={item.id} style={styles.card} onPress={() => onOpen(item)} disabled={passive}>
					<View style={styles.cardHeader}>
						<Text style={styles.cardTitle} numberOfLines={1}>{item.originalFile.fileName}</Text>
						<Text style={[styles.badge, passive ? styles.badgeBlue : styles.badgeGreen]}>{formatStatus(item.processingStatus)}</Text>
					</View>
					<Text style={styles.meta}>{item.documentType ?? 'unknown'} · {formatDate(item.updatedAt)}</Text>
					{item.suggestedCategoryId ? <Text style={styles.meta}>Suggested: {item.suggestedCategoryId}</Text> : null}
				</Pressable>
			))}
		</View>
	);
}

function LabeledInput({
	label,
	value,
	onChangeText,
	multiline = false,
	...props
}: {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	multiline?: boolean;
	placeholder?: string;
	autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
	keyboardType?: 'default' | 'email-address' | 'decimal-pad';
	secureTextEntry?: boolean;
}) {
	return (
		<View style={styles.inputGroup}>
			<Text style={styles.label}>{label}</Text>
			<TextInput
				style={[styles.input, multiline && styles.textarea]}
				value={value}
				onChangeText={onChangeText}
				multiline={multiline}
				placeholderTextColor="#94a3b8"
				{...props}
			/>
		</View>
	);
}

function Notice({ message, error }: { message?: string; error?: string }) {
	if (!message && !error) return null;
	return (
		<View style={[styles.notice, error ? styles.noticeError : styles.noticeOk]}>
			<Text style={[styles.noticeText, error ? styles.noticeErrorText : styles.noticeOkText]}>{error || message}</Text>
		</View>
	);
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
	return (
		<Pressable style={[styles.primaryButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
			<Text style={styles.primaryButtonText}>{label}</Text>
		</Pressable>
	);
}

function SecondaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
	return (
		<Pressable style={[styles.secondaryButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
			<Text style={styles.secondaryButtonText}>{label}</Text>
		</Pressable>
	);
}

function StepPill({ label, active }: { label: string; active: boolean }) {
	return (
		<View style={[styles.stepPill, active && styles.stepPillActive]}>
			<Text style={[styles.stepPillText, active && styles.stepPillTextActive]}>{label}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safe: {
		flex: 1,
		backgroundColor: '#f8fafc'
	},
	flex: {
		flex: 1
	},
	authShell: {
		padding: 20,
		paddingTop: 54,
		gap: 14
	},
	shell: {
		padding: 18,
		paddingBottom: 48,
		gap: 16
	},
	brand: {
		fontSize: 13,
		fontWeight: '700',
		color: '#387234',
		textTransform: 'uppercase',
		letterSpacing: 0
	},
	title: {
		marginTop: 4,
		fontSize: 28,
		lineHeight: 34,
		fontWeight: '800',
		color: '#0f172a'
	},
	copy: {
		fontSize: 14,
		lineHeight: 20,
		color: '#64748b'
	},
	meta: {
		fontSize: 12,
		lineHeight: 18,
		color: '#64748b'
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 12
	},
	capturePanel: {
		borderWidth: 1,
		borderColor: '#d9e5d7',
		backgroundColor: '#f3faf2',
		borderRadius: 8,
		padding: 16,
		gap: 10
	},
	panel: {
		borderWidth: 1,
		borderColor: '#e2e8f0',
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 16,
		gap: 12
	},
	panelTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#0f172a'
	},
	inputGroup: {
		gap: 6
	},
	label: {
		fontSize: 13,
		fontWeight: '700',
		color: '#334155'
	},
	input: {
		minHeight: 44,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		backgroundColor: '#ffffff',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
		color: '#0f172a'
	},
	textarea: {
		minHeight: 92,
		textAlignVertical: 'top'
	},
	buttonRow: {
		flexDirection: 'row',
		gap: 10,
		alignItems: 'center',
		flexWrap: 'wrap'
	},
	primaryButton: {
		minHeight: 44,
		borderRadius: 8,
		backgroundColor: '#387234',
		paddingHorizontal: 16,
		paddingVertical: 11,
		alignItems: 'center',
		justifyContent: 'center'
	},
	primaryButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '800'
	},
	secondaryButton: {
		minHeight: 44,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		backgroundColor: '#ffffff',
		paddingHorizontal: 16,
		paddingVertical: 11,
		alignItems: 'center',
		justifyContent: 'center'
	},
	secondaryButtonText: {
		color: '#334155',
		fontSize: 14,
		fontWeight: '800'
	},
	ghostButton: {
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: '#ffffff'
	},
	ghostButtonText: {
		color: '#334155',
		fontWeight: '700',
		fontSize: 13
	},
	disabled: {
		opacity: 0.5
	},
	notice: {
		borderRadius: 8,
		borderWidth: 1,
		padding: 12
	},
	noticeOk: {
		borderColor: '#bbf7d0',
		backgroundColor: '#f0fdf4'
	},
	noticeError: {
		borderColor: '#fecdd3',
		backgroundColor: '#fff1f2'
	},
	noticeText: {
		fontSize: 13,
		lineHeight: 18
	},
	noticeOkText: {
		color: '#166534'
	},
	noticeErrorText: {
		color: '#be123c'
	},
	loader: {
		marginTop: 4
	},
	section: {
		gap: 10
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: '#0f172a'
	},
	empty: {
		borderWidth: 1,
		borderColor: '#e2e8f0',
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 14,
		fontSize: 13,
		color: '#64748b'
	},
	card: {
		borderWidth: 1,
		borderColor: '#e2e8f0',
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 14,
		gap: 6
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 10
	},
	cardTitle: {
		flex: 1,
		fontSize: 15,
		fontWeight: '800',
		color: '#0f172a'
	},
	badge: {
		overflow: 'hidden',
		borderRadius: 999,
		paddingHorizontal: 8,
		paddingVertical: 4,
		fontSize: 11,
		fontWeight: '800'
	},
	badgeGreen: {
		backgroundColor: '#dcfce7',
		color: '#166534'
	},
	badgeBlue: {
		backgroundColor: '#e0f2fe',
		color: '#075985'
	},
	stepRow: {
		flexDirection: 'row',
		gap: 8
	},
	stepPill: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#cbd5e1',
		backgroundColor: '#ffffff',
		borderRadius: 999,
		paddingVertical: 8,
		alignItems: 'center'
	},
	stepPillActive: {
		borderColor: '#387234',
		backgroundColor: '#edf7ec'
	},
	stepPillText: {
		fontSize: 12,
		fontWeight: '800',
		color: '#64748b'
	},
	stepPillTextActive: {
		color: '#2f5e2c'
	},
	option: {
		borderWidth: 1,
		borderColor: '#e2e8f0',
		backgroundColor: '#ffffff',
		borderRadius: 8,
		padding: 12,
		gap: 4
	},
	optionSelected: {
		borderColor: '#387234',
		backgroundColor: '#f0fdf4'
	},
	optionTitle: {
		fontSize: 14,
		fontWeight: '800',
		color: '#0f172a'
	},
	smallLabel: {
		marginTop: 4,
		fontSize: 12,
		fontWeight: '800',
		color: '#64748b',
		textTransform: 'uppercase',
		letterSpacing: 0
	},
	horizontalList: {
		marginHorizontal: -2
	},
	statusRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8
	},
	chip: {
		borderWidth: 1,
		borderColor: '#cbd5e1',
		backgroundColor: '#ffffff',
		borderRadius: 999,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginRight: 8
	},
	chipSelected: {
		borderColor: '#387234',
		backgroundColor: '#387234'
	},
	chipText: {
		color: '#334155',
		fontWeight: '700',
		fontSize: 12
	},
	chipTextSelected: {
		color: '#ffffff'
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 8
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#94a3b8',
		backgroundColor: '#ffffff'
	},
	checkboxOn: {
		backgroundColor: '#387234',
		borderColor: '#387234'
	}
});
