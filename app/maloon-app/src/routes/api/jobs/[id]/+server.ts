import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

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

export const PATCH: RequestHandler = apiHandler(async ({ params, request }) => {
	const data = await request.json();

	const updateData: any = {};

	if (data.clientName !== undefined) updateData.clientName = data.clientName;
	if (data.clientPhone !== undefined) updateData.clientPhone = data.clientPhone;
	if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
	if (data.clientId !== undefined) updateData.clientId = data.clientId;
	if (data.address !== undefined) updateData.address = data.address;
	if (data.status !== undefined) updateData.status = data.status;
	if (data.notes !== undefined) updateData.notes = data.notes;
	if (data.scheduledDate !== undefined) {
		updateData.scheduledDate = data.scheduledDate ? new Date(data.scheduledDate) : null;
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
