import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/jobs/[id]/start-with — add a "start with" prep task
export const POST: RequestHandler = async ({ params, request }) => {
	const data = await request.json();

	const maxOrder = await prisma.startWithTask.findFirst({
		where: { jobId: params.id },
		orderBy: { sortOrder: 'desc' },
		select: { sortOrder: true }
	});

	const task = await prisma.startWithTask.create({
		data: {
			jobId: params.id,
			description: data.description,
			sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
		}
	});

	return json(task, { status: 201 });
};

// PATCH /api/jobs/[id]/start-with — update a start-with task
export const PATCH: RequestHandler = async ({ request }) => {
	const data = await request.json();
	const task = await prisma.startWithTask.update({
		where: { id: data.taskId },
		data: {
			completed: data.completed,
			completedBy: data.completedBy,
			completedAt: data.completed ? new Date() : null,
		}
	});
	return json(task);
};
