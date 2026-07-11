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

		const conflict = await prisma.jobAssignment.findFirst({
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

		if (conflict) {
			return json({
				error: 'Worker already assigned to another job on this date',
				conflict: conflict.job
			}, { status: 409 });
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
	await prisma.jobAssignment.delete({ where: { id: assignmentId } });
	return json({ success: true });
});
