import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const POST: RequestHandler = apiHandler(async ({ params, request }) => {
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
});

export const PATCH: RequestHandler = apiHandler(async ({ request }) => {
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
});
