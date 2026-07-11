import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

function dateRange(dateStr: string, days = 1) {
	const start = new Date(dateStr + 'T00:00:00');
	if (isNaN(start.getTime())) return null;
	const end = new Date(start);
	end.setDate(end.getDate() + days);
	return { start, end };
}

function dayOfWeek(dateStr: string) {
	const d = new Date(dateStr + 'T00:00:00');
	return isNaN(d.getTime()) ? null : d.getDay();
}

export const GET: RequestHandler = apiHandler(async ({ url }) => {
	const dateParam = url.searchParams.get('date');
	const weekStart = url.searchParams.get('weekStart');
	const statusFilter = url.searchParams.get('status');

	const isWeekView = !!weekStart;
	const anchorDate = weekStart || dateParam || new Date().toISOString().slice(0, 10);
	const range = isWeekView ? dateRange(anchorDate, 7) : dateRange(anchorDate, 1);
	if (!range) return json({ error: 'Invalid date' }, { status: 400 });

	const jobWhere: any = {
		scheduledDate: { gte: range.start, lt: range.end },
	};
	if (statusFilter && statusFilter !== 'all') {
		jobWhere.status = statusFilter;
	}

	const jobInclude = {
		assignments: {
			include: { worker: { select: { id: true, firstName: true, lastName: true } } }
		}
	};

	const [jobs, activeWorkers] = await Promise.all([
		prisma.job.findMany({
			where: jobWhere,
			include: jobInclude,
			orderBy: { scheduledDate: 'asc' },
		}),
		prisma.worker.findMany({
			where: { status: 'active' },
			include: {
				availability: true,
				assignments: {
					where: {
						job: { scheduledDate: { gte: range.start, lt: range.end } },
					},
					include: {
						job: { select: { id: true, clientName: true, address: true, scheduledDate: true, status: true } }
					}
				}
			},
		}),
	]);

	const dow = dayOfWeek(anchorDate);

	const summary = {
		totalJobs: jobs.length,
		pendingCount: jobs.filter(j => j.status === 'pending').length,
		inProgressCount: jobs.filter(j => j.status === 'in_progress').length,
		completedCount: jobs.filter(j => j.status === 'completed').length,
		assignedCount: jobs.filter(j => j.assignments.length > 0).length,
		unassignedCount: jobs.filter(j => j.assignments.length === 0).length,
		estimatedRevenue: jobs.reduce((sum, j) => sum + (j.total || 0), 0),
	};

	const workers = activeWorkers.map(w => ({
		id: w.id,
		firstName: w.firstName,
		lastName: w.lastName,
		assignments: w.assignments.map(a => ({
			id: a.id,
			jobId: a.job.id,
			clientName: a.job.clientName,
			address: a.job.address,
			status: a.job.status,
			scheduledDate: a.scheduledDate || a.job.scheduledDate,
		})),
		availability: w.availability
			.filter(a => isWeekView || a.dayOfWeek === dow)
			.map(a => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime })),
	}));

	let days: Array<{ date: string; label: string; jobs: typeof jobs }> | undefined;
	if (isWeekView) {
		const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		days = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(range.start);
			d.setDate(d.getDate() + i);
			const dateStr = d.toISOString().slice(0, 10);
			const dayStart = new Date(d);
			dayStart.setHours(0, 0, 0, 0);
			const dayEnd = new Date(d);
			dayEnd.setHours(23, 59, 59, 999);

			days.push({
				date: dateStr,
				label: `${dayLabels[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`,
				jobs: jobs.filter(j => {
					if (!j.scheduledDate) return false;
					const t = new Date(j.scheduledDate).getTime();
					return t >= dayStart.getTime() && t <= dayEnd.getTime();
				}),
			});
		}
	}

	return json({
		view: isWeekView ? 'week' : 'day',
		date: anchorDate,
		weekRange: isWeekView
			? { start: range.start.toISOString().slice(0, 10), end: range.end.toISOString().slice(0, 10) }
			: undefined,
		jobs,
		workers,
		summary,
		days,
	});
});
