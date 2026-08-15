import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const PATCH: RequestHandler = apiHandler(async ({ request, locals }) => {
	const workerId = locals.user?.workerId;
	if (!workerId) {
		return json({ error: 'Worker not found' }, { status: 403 });
	}

	const { taskId, completed, comment } = await request.json();

	// Verify the task belongs to a job this worker is assigned to.
	const task = await prisma.jobTask.findUnique({
		where: { id: taskId },
		select: { section: { select: { job: { select: { id: true } } } } },
	});
	if (!task) return json({ error: 'Task not found' }, { status: 404 });

	// Admins may update any task; workers must be assigned to the job.
	if (locals.user?.role !== 'admin') {
		const assignment = await prisma.jobAssignment.findFirst({
			where: { jobId: task.section.job.id, workerId },
			select: { id: true },
		});
		if (!assignment) {
			return json({ error: 'Not assigned to this job' }, { status: 403 });
		}
	}

	const updated = await prisma.jobTask.update({
		where: { id: taskId },
		data: {
			completed,
			completedBy: completed ? workerId : null,
			completedAt: completed ? new Date() : null,
			comment: comment !== undefined ? comment : undefined,
		}
	});

	return json(updated);
});
