import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const POST: RequestHandler = apiHandler(async ({ params, request }) => {
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
});

export const PATCH: RequestHandler = apiHandler(async ({ request }) => {
	const data = await request.json();
	const updateData: Record<string, unknown> = {};

	if ('completed' in data) {
		updateData.completed = data.completed;
		if (data.completed) {
			updateData.completedBy = data.completedBy;
			updateData.completedAt = new Date();
		}
	}
	if ('comment' in data) updateData.comment = data.comment;
	if ('requiredPhoto' in data) updateData.requiredPhoto = data.requiredPhoto;

	const task = await prisma.jobTask.update({
		where: { id: data.taskId },
		data: updateData,
	});
	return json(task);
});
