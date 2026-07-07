import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import { createAdminNotification } from '$lib/auth';
import type { RequestHandler } from './$types';

// PATCH /api/profile-changes/[id] — approve or reject a change
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const data = await request.json();
	const { status } = data; // "approved" or "rejected"

	if (status !== 'approved' && status !== 'rejected') {
		return json({ error: 'Status must be "approved" or "rejected"' }, { status: 400 });
	}

	const change = await prisma.profileChange.findUnique({ where: { id: params.id } });
	if (!change) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	// Update the change record
	const updated = await prisma.profileChange.update({
		where: { id: params.id },
		data: {
			status,
			reviewedBy: locals.user.id,
			reviewedAt: new Date(),
		}
	});

	// If approved, apply the change to the Worker record
	if (status === 'approved') {
		const updateData: Record<string, string> = {};
		updateData[change.field] = change.newValue;
		await prisma.worker.update({
			where: { id: change.workerId },
			data: updateData,
		});
	}

	// Notify the worker who requested the change
	await prisma.notification.create({
		data: {
			userId: change.requestedBy,
			message: `Your change to "${change.field}" was ${status}`,
			link: `/worker/profile`,
		}
	});

	return json(updated);
};