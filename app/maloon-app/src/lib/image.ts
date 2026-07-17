// Server-side image processing for task photos.
// Resizes, JPEG-compresses, and stamps a bottom-right overlay with
// time, day, and approximate address (street, city, state ZIP).
import sharp from 'sharp';

export interface StampInfo {
	/** Full Date to display (default: now, server time). */
	timestamp?: Date;
	/** One-line address from reverse geocoding. */
	addressLine: string;
}

const MAX_DIMENSION = 1600; // longest edge in px
const JPEG_QUALITY = 82;

// SVG overlay font scales with image width so it stays readable on any resolution.
function buildOverlay(width: number, height: number, info: StampInfo): Buffer {
	const ts = info.timestamp ?? new Date();
	const day = ts.toLocaleDateString(undefined, { weekday: 'long' });
	// 2026-07-17 · 3:45 PM  (locale-aware)
	const time = ts.toLocaleString(undefined, {
		year: 'numeric', month: 'short', day: 'numeric',
		hour: 'numeric', minute: '2-digit',
	});

	// Font ~2.4% of image width, clamped so it's never tiny/huge.
	const fontSize = Math.max(14, Math.round(width * 0.024));
	const pad = Math.max(10, Math.round(fontSize * 0.7));
	const lineHeight = Math.round(fontSize * 1.35);

	// Truncate long addresses to avoid running off the image.
	const maxChars = Math.max(20, Math.floor((width - pad * 2) / (fontSize * 0.55)));
	const addr = info.addressLine.length > maxChars
		? info.addressLine.slice(0, maxChars - 1) + '…'
		: info.addressLine;

	const lines = [`${day}, ${time}`, addr];
	const blockHeight = pad * 2 + lines.length * lineHeight;

	// SVG text uses HTML entities for safety; single quotes are fine in double-quoted SVG.
	const esc = (s: string) => s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

	const textLines = lines.map((line, i) => {
		const y = pad + (i + 1) * lineHeight - Math.round(fontSize * 0.3);
		return `<text x="${width - pad}" y="${y}" font-size="${fontSize}" fill="#ffffff" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-weight="600">${esc(line)}</text>`;
	}).join('');

	const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${height - blockHeight}" width="${width}" height="${blockHeight}" fill="url(#g)"/>
  ${textLines}
</svg>`;

	return Buffer.from(svg);
}

/**
 * Process an uploaded task photo:
 *   1. Decode from any input format sharp understands (JPEG/HEIC/PNG/WebP).
 *   2. Resize so the longest edge is <= MAX_DIMENSION (preserving aspect).
 *   3. Strip EXIF/ICC/etc. metadata (privacy + smaller payloads).
 *   4. Composite the bottom-right stamp overlay.
 *   5. Re-encode as JPEG at JPEG_QUALITY.
 * Returns a base64 data URL ready to store in TaskPhoto.url.
 */
export async function processTaskPhoto(input: Buffer, info: StampInfo): Promise<string> {
	// 1. Resize + strip metadata into a buffer, then read the real dimensions.
	// sharp strips EXIF/ICC/XMP by default in this version, so nothing extra needed.
	const resized = await sharp(input, { failOn: 'truncated' })
		.rotate() // honor EXIF orientation before stripping it
		.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
		.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
		.toBuffer();

	const meta = await sharp(resized).metadata();
	const width = meta.width ?? MAX_DIMENSION;
	const height = meta.height ?? MAX_DIMENSION;

	// 2. Build the overlay at the exact output dimensions, then composite.
	const overlay = buildOverlay(width, height, info);

	const finalBuf = await sharp(resized)
		.composite([{ input: overlay, top: 0, left: 0 }])
		.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
		.toBuffer();

	return `data:image/jpeg;base64,${finalBuf.toString('base64')}`;
}
