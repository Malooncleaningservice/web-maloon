import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

// Update a task photo's comment (and future photo fields).
// - Admins may edit any photo.
// - Workers may edit comments only on photos they took, on jobs they're assigned to.
export const PATCH: RequestHandler = apiHandler(async ({ params, request, locals }) => {
	const photo = await prisma.taskPhoto.findUnique({
		where: { id: params.id },
		include: {
			task: { select: { section: { select: { jobId: true } } } },
		},
	});
	if (!photo) return json({ error: 'Photo not found' }, { status: 404 });

	const isAdmin = locals.user?.role === 'admin';
	const workerId = locals.user?.workerId ?? null;

	if (!isAdmin) {
		if (!workerId) {
			return json({ error: 'Worker account required' }, { status: 403 });
		}
		// Workers may only edit their own photos, on jobs they're still assigned to.
		if (photo.takenBy !== workerId) {
			return json({ error: 'You can only edit your own photos' }, { status: 403 });
		}
		const assignment = await prisma.jobAssignment.findFirst({
			where: { jobId: photo.task.section.jobId, workerId },
			select: { id: true },
		});
		if (!assignment) {
			return json({ error: 'You are not assigned to this job' }, { status: 403 });
		}
	}

	const body = await request.json();
	if (typeof body !== 'object' || body === null) {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const updateData: { comment?: string | null } = {};
	if (body.comment !== undefined) {
		const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
		updateData.comment = comment.length > 0 ? comment : null;
	}

	if (Object.keys(updateData).length === 0) {
		return json({ error: 'Nothing to update' }, { status: 400 });
	}

	const updated = await prisma.taskPhoto.update({
		where: { id: params.id },
		data: updateData,
	});
	return json(updated);
});
