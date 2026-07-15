import { prisma } from '$lib/prisma';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw redirect(302, '/login');
	if (user.role === 'worker') throw redirect(302, '/worker');

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	const [
		activeJobs,
		pendingJobs,
		completedToday,
		totalWorkers,
		activeWorkers,
		upcomingJobs,
		todayJobs,
		jobsNeedingAttention,
	] = await Promise.all([
		prisma.job.count({ where: { status: 'in_progress' } }),
		prisma.job.count({ where: { status: 'pending' } }),
		prisma.job.count({
			where: {
				status: 'completed',
				updatedAt: { gte: today, lt: tomorrow }
			}
		}),
		prisma.worker.count({ where: { status: 'active' } }),
		prisma.jobAssignment.findMany({
			where: { job: { status: 'in_progress' } },
			select: { workerId: true },
			distinct: ['workerId']
		}),
		prisma.job.findMany({
			where: {
				status: { in: ['pending', 'in_progress'] },
				scheduledDate: { not: null }
			},
			include: {
				assignments: { include: { worker: true } },
				sections: {
					include: {
						_count: { select: { tasks: true } }
					}
				}
			},
			orderBy: { scheduledDate: 'asc' },
			take: 10
		}),
		prisma.job.findMany({
			where: {
				scheduledDate: { gte: today, lt: tomorrow }
			},
			include: {
				assignments: { include: { worker: true } }
			},
			orderBy: { scheduledDate: 'asc' }
		}),
		prisma.job.findMany({
			where: { status: 'in_progress' },
			include: {
				sections: {
					include: {
						tasks: { select: { id: true, completed: true } }
					}
				}
			}
		}),
	]);

	let totalTasks = 0;
	let completedTasks = 0;
	for (const job of jobsNeedingAttention) {
		for (const section of job.sections) {
			totalTasks += section.tasks.length;
			completedTasks += section.tasks.filter(t => t.completed).length;
		}
	}

	const stats = {
		activeJobs,
		pendingJobs,
		completedToday,
		totalWorkers,
		workersOnJob: activeWorkers.length,
		totalTasks,
		completedTasks,
		completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
		todayJobs: todayJobs.map(j => ({
			...j,
			scheduledDate: j.scheduledDate?.toISOString() ?? null,
		})),
		upcomingJobs: upcomingJobs.map(j => ({
			...j,
			scheduledDate: j.scheduledDate?.toISOString() ?? null,
		})),
	};

	return {
		user: {
			id: user.id,
			email: user.email,
			role: user.role,
			displayName: user.displayName,
			worker: user.worker,
		},
		stats,
	};
};
