import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PATCH /api/notifications/[id] — mark single notification as read
export const PATCH: RequestHandler = async ({ params }) => {
	await prisma.notification.update({
		where: { id: params.id },
		data: { read: true }
	});
	return json({ success: true });
};