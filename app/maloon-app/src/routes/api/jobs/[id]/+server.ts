import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';
import { geocodeAddress } from '$lib/geo';

export const GET: RequestHandler = apiHandler(async ({ params }) => {
	const job = await prisma.job.findUnique({
		where: { id: params.id },
		include: {
			client: true,
			quote: true,
			sections: {
				orderBy: { sortOrder: 'asc' },
				include: {
					tasks: {
						orderBy: { sortOrder: 'asc' },
						include: { photos: true }
					}
				}
			},
			startWithTasks: { orderBy: { sortOrder: 'asc' } },
			assignments: { include: { worker: true } }
		}
	});
	if (!job) return json({ error: 'Not found' }, { status: 404 });
	return json(job);
});

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
	pending: ['in_progress', 'cancelled'],
	in_progress: ['completed', 'cancelled'],
	completed: [],
	cancelled: ['pending'],
};

export const PATCH: RequestHandler = apiHandler(async ({ params, request }) => {
	const data = await request.json();

	const updateData: any = {};

	if (data.clientName !== undefined) updateData.clientName = data.clientName;
	if (data.clientPhone !== undefined) updateData.clientPhone = data.clientPhone;
	if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
	if (data.clientId !== undefined) updateData.clientId = data.clientId;
	if (data.address !== undefined) {
		updateData.address = data.address;
		// Re-geocode when the address changes so the geofence stays accurate.
		// Soft-fail: leaves lat/long as-is if geocoding returns nothing, but we
		// null them so we don't geofence against the wrong spot.
		const coords = await geocodeAddress(data.address || '');
		updateData.latitude = coords ? coords.lat : null;
		updateData.longitude = coords ? coords.lon : null;
	}
	if (data.notes !== undefined) updateData.notes = data.notes;
	if (data.total !== undefined) updateData.total = data.total;
	if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
	if (data.recurrencePattern !== undefined) updateData.recurrencePattern = data.recurrencePattern;
	if (data.recurrenceEndDate !== undefined) {
		updateData.recurrenceEndDate = data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null;
	}
	if (data.scheduledDate !== undefined) {
		updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
	}

	if (data.status !== undefined) {
		const current = await prisma.job.findUnique({
			where: { id: params.id },
			select: { status: true }
		});
		if (!current) return json({ error: 'Job not found' }, { status: 404 });

		const allowed = VALID_STATUS_TRANSITIONS[current.status] ?? [];
		if (!allowed.includes(data.status)) {
			return json({
				error: `Cannot transition from "${current.status}" to "${data.status}"`,
				allowed
			}, { status: 400 });
		}

		if (data.status === 'completed') {
			const sections = await prisma.jobSection.findMany({
				where: { jobId: params.id },
				select: {
					tasks: { select: { completed: true } }
				}
			});
			const allDone = sections.every(s => s.tasks.every(t => t.completed));
			if (!allDone) {
				return json({ error: 'All tasks must be completed before marking the job as complete' }, { status: 400 });
			}
		}

		updateData.status = data.status;
	}

	const job = await prisma.job.update({
		where: { id: params.id },
		data: updateData
	});
	return json(job);
});

export const DELETE: RequestHandler = apiHandler(async ({ params }) => {
	await prisma.jobAssignment.deleteMany({ where: { jobId: params.id } });
	await prisma.startWithTask.deleteMany({ where: { jobId: params.id } });
	const sections = await prisma.jobSection.findMany({ where: { jobId: params.id }, select: { id: true } });
	for (const s of sections) {
		await prisma.taskPhoto.deleteMany({ where: { task: { sectionId: s.id } } });
		await prisma.jobTask.deleteMany({ where: { sectionId: s.id } });
	}
	await prisma.jobSection.deleteMany({ where: { jobId: params.id } });
	await prisma.job.delete({ where: { id: params.id } });
	return json({ success: true });
});
