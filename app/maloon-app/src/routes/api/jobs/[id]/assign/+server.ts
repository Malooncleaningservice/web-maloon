import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const GET: RequestHandler = apiHandler(async ({ params }) => {
	const assignments = await prisma.jobAssignment.findMany({
		where: { jobId: params.id },
		include: { worker: true }
	});
	return json(assignments);
});

export const POST: RequestHandler = apiHandler(async ({ params, request }) => {
	const { workerId, scheduledDate } = await request.json();

	const job = await prisma.job.findUnique({ where: { id: params.id }, select: { scheduledDate: true } });
	const assignmentDate = scheduledDate ? new Date(scheduledDate) : job?.scheduledDate;

	if (assignmentDate) {
		const date = new Date(assignmentDate);
		date.setHours(0, 0, 0, 0);
		const nextDay = new Date(date);
		nextDay.setDate(nextDay.getDate() + 1);

		const conflicts = await prisma.jobAssignment.findMany({
			where: {
				workerId,
				jobId: { not: params.id },
				job: {
					scheduledDate: { gte: date, lt: nextDay },
					status: { not: 'cancelled' }
				}
			},
			include: { job: { select: { clientName: true, scheduledDate: true } } }
		});

		const jobTime = new Date(assignmentDate);
		const hasTime = jobTime.getHours() > 0 || jobTime.getMinutes() > 0;

		for (const c of conflicts) {
			const conflictTime = c.job.scheduledDate ? new Date(c.job.scheduledDate) : null;
			const conflictHasTime = conflictTime && (conflictTime.getHours() > 0 || conflictTime.getMinutes() > 0);

			if (hasTime && conflictHasTime) {
				const twoHours = 2 * 60 * 60 * 1000;
				const diff = Math.abs(jobTime.getTime() - conflictTime!.getTime());
				if (diff < twoHours) {
					return json({
						error: 'Worker has another job within 2 hours of this time',
						conflict: c.job
					}, { status: 409 });
				}
			} else {
				return json({
					error: 'Worker already assigned to another job on this date',
					conflict: c.job
				}, { status: 409 });
			}
		}
	}

	if (assignmentDate) {
		const ad = new Date(assignmentDate);
		const availability = await prisma.workerAvailability.findMany({
			where: { workerId, dayOfWeek: ad.getDay() }
		});
		if (availability.length > 0) {
			const minutes = ad.getHours() * 60 + ad.getMinutes();
			const inWindow = availability.some(a => {
				const [sh, sm] = a.startTime.split(':').map(Number);
				const [eh, em] = a.endTime.split(':').map(Number);
				return minutes >= (sh * 60 + sm) && minutes <= (eh * 60 + em);
			});
			if (!inWindow) {
				return json({
					error: 'Worker is not available at this time on this day',
					availability
				}, { status: 409 });
			}
		}
	}

	const assignment = await prisma.jobAssignment.create({
		data: {
			jobId: params.id,
			workerId,
			scheduledDate: assignmentDate ?? undefined,
		}
	});
	return json(assignment, { status: 201 });
});

export const DELETE: RequestHandler = apiHandler(async ({ params, request }) => {
	const { assignmentId } = await request.json();

	const assignment = await prisma.jobAssignment.findUnique({
		where: { id: assignmentId },
		select: { jobId: true }
	});
	if (!assignment || assignment.jobId !== params.id) {
		return json({ error: 'Assignment not found' }, { status: 404 });
	}

	await prisma.jobAssignment.delete({ where: { id: assignmentId } });
	return json({ success: true });
});
