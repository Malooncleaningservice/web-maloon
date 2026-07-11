import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const GET: RequestHandler = apiHandler(async ({ locals }) => {
	const workerId = locals.user?.workerId;
	if (!workerId) {
		return json({ error: 'Worker not found' }, { status: 403 });
	}

	const assignments = await prisma.jobAssignment.findMany({
		where: { workerId },
		include: {
			job: {
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
			}
		},
		orderBy: { assignedAt: 'desc' }
	});

	const jobs = assignments.map((a) => a.job);
	return json(jobs);
});
