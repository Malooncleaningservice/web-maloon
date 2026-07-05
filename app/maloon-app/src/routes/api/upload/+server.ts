import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/prisma';

// POST /api/upload?type=w9|task-photo&workerId=...&taskId=...
export const POST: RequestHandler = async ({ request, url }) => {
	const formData = await request.formData();
	const file = formData.get('file') as File | null;

	if (!file) return json({ error: 'No file provided' }, { status: 400 });

	const type = url.searchParams.get('type') ?? 'generic';
	const workerId = url.searchParams.get('workerId');
	const taskId = url.searchParams.get('taskId');

	// Convert file to base64 data URL
	const buffer = Buffer.from(await file.arrayBuffer());
	const mimeType = file.type || 'application/octet-stream';
	const base64 = buffer.toString('base64');
	const dataUrl = `data:${mimeType};base64,${base64}`;

	if (type === 'w9' && workerId) {
		// Update worker with W-9 file info
		await prisma.worker.update({
			where: { id: workerId },
			data: {
				w9Uploaded: true,
				w9FileName: file.name,
				w9FileUrl: dataUrl,
			}
		});
		return json({ success: true, url: dataUrl, fileName: file.name });
	}

	if (type === 'task-photo' && taskId) {
		// Create a TaskPhoto record
		const photo = await prisma.taskPhoto.create({
			data: {
				taskId,
				url: dataUrl,
			}
		});
		return json({ success: true, photo });
	}

	// Generic upload — just return the data URL
	return json({ success: true, url: dataUrl, fileName: file.name });
};