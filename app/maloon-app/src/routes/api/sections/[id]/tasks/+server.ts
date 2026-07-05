import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/sections/[id]/tasks — add a task to a section
export const POST: RequestHandler = async ({ params, request }) => {
	const data = await request.json();

	const maxOrder = await prisma.jobTask.findFirst({
		where: { sectionId: params.id },
		orderBy: { sortOrder: 'desc' },
		select: { sortOrder: true }
	});

	const task = await prisma.jobTask.create({
		data: {
			sectionId: params.id,
			description: data.description,
			sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
			requiredPhoto: data.requiredPhoto ?? false,
		}
	});

	return json(task, { status: 201 });
};

// PATCH /api/sections/[id]/tasks — update task completion
export const PATCH: RequestHandler = async ({ request }) => {
	const data = await request.json();
	// data: { taskId, completed, completedBy?, comment? }
	const task = await prisma.jobTask.update({
		where: { id: data.taskId },
		data: {
			completed: data.completed,
			completedBy: data.completed ? data.completedBy : undefined,
			completedAt: data.completed ? new Date() : undefined,
			comment: data.comment,
		}
	});
	return json(task);
};
