/**
 * React Native / Hermes 通常没有可用的 Web Worker。PDF.js 在 Worker 不可用时会回落到 fake worker，
 * fake worker 会 `import(workerSrc)` 拉取 WorkerMessageHandler；若事先挂上 `globalThis.pdfjsWorker`，
 * 则直接使用主线程 bundled 模块，无需网络或 file URL。
 */
import * as pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

const g = globalThis as typeof globalThis & { pdfjsWorker?: typeof pdfWorker };
if (!g.pdfjsWorker) {
	g.pdfjsWorker = pdfWorker;
}
