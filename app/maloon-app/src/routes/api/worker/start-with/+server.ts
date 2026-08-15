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

	// Verify the start-with task belongs to a job this worker is assigned to.
	const swTask = await prisma.startWithTask.findUnique({
		where: { id: taskId },
		select: { jobId: true },
	});
	if (!swTask) return json({ error: 'Task not found' }, { status: 404 });

	if (locals.user?.role !== 'admin') {
		const assignment = await prisma.jobAssignment.findFirst({
			where: { jobId: swTask.jobId, workerId },
			select: { id: true },
		});
		if (!assignment) {
			return json({ error: 'Not assigned to this job' }, { status: 403 });
		}
	}

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
