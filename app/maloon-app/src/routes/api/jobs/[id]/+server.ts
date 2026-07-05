import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/jobs/[id] — get a single job with full detail
export const GET: RequestHandler = async ({ params }) => {
	const job = await prisma.job.findUnique({
		where: { id: params.id },
		include: {
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
};

// PATCH /api/jobs/[id] — update a job
export const PATCH: RequestHandler = async ({ params, request }) => {
	const data = await request.json();
	const job = await prisma.job.update({
		where: { id: params.id },
		data: {
			clientName: data.clientName,
			clientPhone: data.clientPhone,
			clientEmail: data.clientEmail,
			address: data.address,
			scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
			status: data.status,
			notes: data.notes,
		}
	});
	return json(job);
};

// DELETE /api/jobs/[id] — delete a job and all related data
export const DELETE: RequestHandler = async ({ params }) => {
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
};
