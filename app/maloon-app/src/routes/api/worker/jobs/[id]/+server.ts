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

export const PATCH: RequestHandler = apiHandler(async ({ params, locals, request }) => {
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

	const { status } = await request.json();
	if (status !== 'in_progress' && status !== 'completed') {
		return json({ error: 'Invalid status' }, { status: 400 });
	}

	const job = await prisma.job.findUnique({
		where: { id: params.id },
		include: {
			sections: { include: { tasks: { include: { photos: true } } } },
			startWithTasks: true
		}
	});
	if (!job) return json({ error: 'Job not found' }, { status: 404 });

	const allowed: Record<string, string> = { pending: 'in_progress', in_progress: 'completed' };
	if (allowed[job.status] !== status) {
		return json({ error: `Cannot move job from "${job.status}" to "${status}"` }, { status: 400 });
	}

	if (status === 'completed') {
		const tasks = job.sections.flatMap((s: any) => s.tasks);
		const incompleteTasks = tasks.filter((t: any) => !t.completed).length;
		const incompleteStartWith = job.startWithTasks.filter((t: any) => !t.completed).length;
		const missingPhotos = tasks.filter((t: any) => t.requiredPhoto && t.photos.length === 0).length;
		if (incompleteTasks > 0 || incompleteStartWith > 0 || missingPhotos > 0) {
			return json({
				error: 'Job cannot be completed yet',
				incompleteTasks: incompleteTasks + incompleteStartWith,
				missingPhotos
			}, { status: 400 });
		}
	}

	const updated = await prisma.job.update({
		where: { id: params.id },
		data: { status }
	});
	return json(updated);
});
