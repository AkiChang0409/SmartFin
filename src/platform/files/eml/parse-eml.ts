/**
 * Minimal RFC 2822 / MIME parser for .eml files.
 *
 * Produces readable plain text for AI classification + field extraction:
 *   - Email metadata: From, To, Subject, Date
 *   - Body text (text/plain preferred over text/html)
 *   - Attachment manifest (names + types, no binary content)
 *   - Recursive: handles multipart/*, message/rfc822, nested structures
 *
 * Works in Cloudflare Workers and browsers (no Node.js APIs).
 */

const MAX_RECURSION = 5;
const MAX_ATTACHMENTS = 20;

type HeaderMap = Map<string, string>;

function splitHeadersAndBody(raw: string): [headers: string, body: string] {
	const crlfIdx = raw.indexOf('\r\n\r\n');
	if (crlfIdx >= 0) return [raw.slice(0, crlfIdx), raw.slice(crlfIdx + 4)];
	const lfIdx = raw.indexOf('\n\n');
	if (lfIdx >= 0) return [raw.slice(0, lfIdx), raw.slice(lfIdx + 2)];
	return [raw, ''];
}

function unfoldHeaders(block: string): string {
	return block.replace(/\r?\n[ \t]+/g, ' ');
}

function parseHeaderBlock(block: string): HeaderMap {
	const map: HeaderMap = new Map();
	for (const line of unfoldHeaders(block).split(/\r?\n/)) {
		const colon = line.indexOf(':');
		if (colon < 1) continue;
		const name = line.slice(0, colon).trim().toLowerCase();
		const value = line.slice(colon + 1).trim();
		if (!map.has(name)) map.set(name, value);
	}
	return map;
}

interface ParsedContentType {
	type: string;
	params: Map<string, string>;
}

function parseContentType(raw: string): ParsedContentType {
	const parts = raw.split(';').map((s) => s.trim());
	const type = (parts[0] || 'text/plain').toLowerCase();
	const params = new Map<string, string>();
	for (let i = 1; i < parts.length; i++) {
		const eq = parts[i].indexOf('=');
		if (eq < 0) continue;
		const k = parts[i].slice(0, eq).trim().toLowerCase();
		let v = parts[i].slice(eq + 1).trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
			v = v.slice(1, -1);
		}
		params.set(k, v);
	}
	return { type, params };
}

function decodeQPToBytes(input: string): Uint8Array {
	const joined = input.replace(/=\r?\n/g, '');
	const bytes: number[] = [];
	let i = 0;
	while (i < joined.length) {
		if (joined[i] === '=' && i + 2 < joined.length) {
			const code = parseInt(joined.slice(i + 1, i + 3), 16);
			if (!isNaN(code)) {
				bytes.push(code);
				i += 3;
				continue;
			}
		}
		bytes.push(joined.charCodeAt(i) & 0xff);
		i++;
	}
	return new Uint8Array(bytes);
}

function decodeQP(input: string, charset = 'utf-8'): string {
	return new TextDecoder(charset, { fatal: false }).decode(decodeQPToBytes(input));
}

function decodeBase64Text(b64: string, charset = 'utf-8'): string {
	try {
		const binary = atob(b64.replace(/\s/g, ''));
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		return new TextDecoder(charset, { fatal: false }).decode(bytes);
	} catch {
		return b64;
	}
}

function decodeEncodedWord(word: string): string {
	const m = /^=\?([^?]+)\?([BQbq])\?([^?]*)\?=$/.exec(word);
	if (!m) return word;
	const [, charset, enc, text] = m;
	try {
		if (enc.toLowerCase() === 'b') {
			return decodeBase64Text(text, charset);
		}
		if (enc.toLowerCase() === 'q') {
			return decodeQP(text.replace(/_/g, ' '), charset);
		}
	} catch {
		// fall through
	}
	return word;
}

function decodeHeaderValue(value: string): string {
	return value.replace(/=\?[^?]+\?[BQbq]\?[^?]*\?=/g, (m) => decodeEncodedWord(m));
}

function stripHtml(html: string): string {
	return html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(?:p|div|h[1-6]|li|tr)>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/\r?\n\s*\r?\n\s*\r?\n/g, '\n\n')
		.trim();
}

/**
 * Split a multipart MIME body into raw part strings.
 * Lines before the first boundary delimiter (preamble) are discarded.
 */
function splitMultipartBody(body: string, boundary: string): string[] {
	const delim = '--' + boundary;
	const terminator = delim + '--';
	const parts: string[] = [];
	let current: string[] | null = null;

	for (const rawLine of body.split(/\r?\n/)) {
		const line = rawLine.trimEnd();
		if (line === terminator) {
			if (current !== null) parts.push(current.join('\n'));
			break;
		}
		if (line === delim) {
			if (current !== null) parts.push(current.join('\n'));
			current = [];
			continue;
		}
		if (current !== null) current.push(rawLine);
	}
	return parts;
}

function getAttachmentName(headers: HeaderMap): string | null {
	for (const h of ['content-disposition', 'content-type']) {
		const val = headers.get(h) || '';
		const m = /(?:filename\*?|name)=(?:"([^"]+)"|([^\s;]+))/i.exec(val);
		if (m) return (m[1] || m[2] || '').trim() || null;
	}
	return null;
}

function extractPartText(raw: string, depth: number, attachments: string[]): string {
	if (depth > MAX_RECURSION) return '';

	const [headerBlock, body] = splitHeadersAndBody(raw);
	const headers = parseHeaderBlock(headerBlock);
	const ctRaw = headers.get('content-type') || 'text/plain';
	const { type, params } = parseContentType(ctRaw);
	const cte = (headers.get('content-transfer-encoding') || '7bit').toLowerCase().trim();
	const charset = params.get('charset') || 'utf-8';

	// Multipart: recurse into sub-parts
	if (type.startsWith('multipart/')) {
		const boundary = params.get('boundary');
		if (!boundary) return '';
		const subParts = splitMultipartBody(body, boundary);

		// multipart/alternative: prefer text/plain over text/html
		if (type === 'multipart/alternative') {
			let plain = '';
			let html = '';
			for (const part of subParts) {
				const [ph] = splitHeadersAndBody(part);
				const { type: pt } = parseContentType(parseHeaderBlock(ph).get('content-type') || '');
				if (pt === 'text/plain') plain = extractPartText(part, depth + 1, attachments);
				else if (pt === 'text/html') html = extractPartText(part, depth + 1, attachments);
				else extractPartText(part, depth + 1, attachments); // collect nested attachments
			}
			return plain || html;
		}

		return subParts
			.map((p) => extractPartText(p, depth + 1, attachments))
			.filter(Boolean)
			.join('\n\n');
	}

	// Nested RFC 2822 message
	if (type === 'message/rfc822') {
		return extractPartText(body, depth + 1, attachments);
	}

	// Non-text content types (attachments or inline binary)
	if (!type.startsWith('text/')) {
		if (attachments.length < MAX_ATTACHMENTS) {
			const name = getAttachmentName(headers) ?? `[${type.split('/')[1] ?? 'file'}]`;
			attachments.push(`${name} (${type})`);
		}
		return '';
	}

	// Text attachment (e.g. Content-Disposition: attachment for a .txt)
	const cd = (headers.get('content-disposition') || '').toLowerCase();
	if (cd.startsWith('attachment')) {
		if (attachments.length < MAX_ATTACHMENTS) {
			const name = getAttachmentName(headers) ?? `[text/${type.split('/')[1]}]`;
			attachments.push(`${name} (${type})`);
		}
		return '';
	}

	// Decode text content
	let text: string;
	if (cte === 'base64') {
		text = decodeBase64Text(body, charset);
	} else if (cte === 'quoted-printable') {
		text = decodeQP(body, charset);
	} else {
		try {
			const bytes = Uint8Array.from(body, (c) => c.charCodeAt(0) & 0xff);
			text = new TextDecoder(charset, { fatal: false }).decode(bytes);
		} catch {
			text = body;
		}
	}

	return type === 'text/html' ? stripHtml(text) : text.trim();
}

export interface EmlParseResult {
	subject: string;
	from: string;
	to: string;
	date: string;
	bodyText: string;
	attachments: string[];
}

export function parseEml(rawText: string): EmlParseResult {
	const [headerBlock] = splitHeadersAndBody(rawText);
	const headers = parseHeaderBlock(headerBlock);

	const subject = decodeHeaderValue(headers.get('subject') || '');
	const from = decodeHeaderValue(headers.get('from') || '');
	const to = decodeHeaderValue(headers.get('to') || '');
	const date = headers.get('date') || '';

	const attachments: string[] = [];
	const bodyText = extractPartText(rawText, 0, attachments);

	return { subject, from, to, date, bodyText, attachments };
}

/**
 * Convert raw EML bytes to structured plain text for AI extraction.
 *
 * Output format:
 *   From: sender@example.com
 *   To: recipient@example.com
 *   Subject: Invoice INV-001
 *   Date: Thu, 15 Jan 2026 10:00:00 +0800
 *
 *   [body text]
 *
 *   Attachments:
 *   - INV-001.pdf (application/pdf)
 */
export function emlToPlainText(rawBytes: Uint8Array): string {
	const raw = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes);
	const { subject, from, to, date, bodyText, attachments } = parseEml(raw);

	const lines: string[] = [];
	if (from) lines.push(`From: ${from}`);
	if (to) lines.push(`To: ${to}`);
	if (subject) lines.push(`Subject: ${subject}`);
	if (date) lines.push(`Date: ${date}`);
	if (lines.length) lines.push('');
	if (bodyText) lines.push(bodyText);
	if (attachments.length > 0) {
		lines.push('');
		lines.push('Attachments:');
		for (const att of attachments) lines.push(`- ${att}`);
	}

	return lines.join('\n').trim();
}
