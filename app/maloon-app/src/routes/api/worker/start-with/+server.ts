import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const PATCH: RequestHandler = apiHandler(async ({ request, locals }) => {
	const workerId = locals.user?.workerId;
	if (!workerId) {
		return json({ error: 'Worker not found' }, { status: 403 });
	}

	const { taskId, completed } = await request.json();

	const task = await prisma.startWithTask.update({
		where: { id: taskId },
		data: {
			completed,
			completedBy: completed ? workerId : null,
			completedAt: completed ? new Date() : null,
		}
	});

	return json(task);
});
