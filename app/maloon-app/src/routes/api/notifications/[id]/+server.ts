import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const PATCH: RequestHandler = apiHandler(async ({ params }) => {
	await prisma.notification.update({
		where: { id: params.id },
		data: { read: true }
	});
	return json({ success: true });
});