import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const PATCH: RequestHandler = apiHandler(async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	// Verify ownership before updating.
	const notification = await prisma.notification.findUnique({
		where: { id: params.id },
		select: { userId: true },
	});
	if (!notification) return json({ error: 'Not found' }, { status: 404 });
	if (notification.userId !== locals.user.id) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	await prisma.notification.update({
		where: { id: params.id },
		data: { read: true }
	});
	return json({ success: true });
});