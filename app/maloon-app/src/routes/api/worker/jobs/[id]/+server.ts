import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const GET: RequestHandler = apiHandler(async ({ params, locals }) => {
	const workerId = locals.user?.workerId;
	if (!workerId) {
		return json({ error: 'Worker not found' }, { status: 403 });
	}

	const assignment = await prisma.jobAssignment.findFirst({
		where: { jobId: params.id, workerId },
	});
	if (!assignment) {
		return json({ error: 'Not found or not assigned to you' }, { status: 404 });
	}

	const job = await prisma.job.findUnique({
		where: { id: params.id },
		include: {
			client: true,
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

	if (!job) return json({ error: 'Job not found' }, { status: 404 });
	return json(job);
});
