type ExternalOcrResponse = {
	text: string;
	confidence?: number;
	provider: 'external_api' | 'external_api_mock';
};

type OcrApiOptions = {
	ocrProvider: 'mock' | 'external';
	ocrApiUrl?: string;
	ocrApiKey?: string;
};

export async function extractWithExternalOcr(
	imageBytes: ArrayBuffer,
	options: OcrApiOptions
): Promise<ExternalOcrResponse> {
	if (options.ocrProvider === 'external' && options.ocrApiUrl) {
		const response = await fetch(options.ocrApiUrl, {
			method: 'POST',
			headers: {
				'content-type': 'application/octet-stream',
				...(options.ocrApiKey ? { authorization: `Bearer ${options.ocrApiKey}` } : {})
			},
			body: imageBytes
		});

		if (response.ok) {
			const payload = (await response.json()) as { text?: string; confidence?: number };
			return {
				text: payload.text ?? '',
				confidence: payload.confidence ?? 0,
				provider: 'external_api'
			};
		}
	}

	return {
		text: '',
		confidence: 0,
		provider: 'external_api_mock'
	};
}
