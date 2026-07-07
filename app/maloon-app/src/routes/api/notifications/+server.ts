import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/notifications — list notifications for current user
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json([]);
	const list = await prisma.notification.findMany({
		where: { userId: locals.user.id },
		orderBy: { createdAt: 'desc' },
		take: 50
	});
	return json(list);
};

// POST /api/notifications/mark-all-read
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const data = await request.json();

	if (data.markAllRead) {
		await prisma.notification.updateMany({
			where: { userId: locals.user.id, read: false },
			data: { read: true }
		});
		return json({ success: true });
	}

	return json({ error: 'Unknown action' }, { status: 400 });
};