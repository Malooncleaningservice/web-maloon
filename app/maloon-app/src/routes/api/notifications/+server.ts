import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const GET: RequestHandler = apiHandler(async ({ locals }) => {
	if (!locals.user) return json([]);
	const list = await prisma.notification.findMany({
		where: { userId: locals.user.id },
		orderBy: { createdAt: 'desc' },
		take: 50
	});
	return json(list);
});

export const POST: RequestHandler = apiHandler(async ({ locals, request }) => {
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
});