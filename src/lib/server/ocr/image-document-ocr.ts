export type WorkersVisionOcrResult = { ok: true; text: string; model: string } | { ok: false; error: string };

/**
 * Image → text OCR.
 * Workers AI vision and PaddleOCR integrations are pending.
 * Returns a "not yet implemented" result so the API endpoint surfaces a clear message.
 */
export async function runImageDocumentOcr(
	_env: Env,
	_input: { imageBytes: Uint8Array; mimeType: string; fileName: string }
): Promise<WorkersVisionOcrResult> {
	return { ok: false, error: 'Image OCR is not implemented yet' };
}
