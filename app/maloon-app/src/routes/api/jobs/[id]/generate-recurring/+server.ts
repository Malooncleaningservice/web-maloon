import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

const INTERVAL_DAYS: Record<string, number> = {
	weekly: 7,
	biweekly: 14,
	fourWeekly: 28,
};

function addMonths(date: Date, months: number): Date {
	const d = new Date(date);
	d.setMonth(d.getMonth() + months);
	return d;
}

export const POST: RequestHandler = apiHandler(async ({ params }) => {
	const template = await prisma.job.findUnique({
		where: { id: params.id },
		include: {
			sections: {
				include: { tasks: true }
			},
			startWithTasks: true,
			childJobs: { select: { scheduledDate: true } }
		}
	});

	if (!template) return json({ error: 'Job not found' }, { status: 404 });
	if (!template.isRecurring || !template.recurrencePattern) {
		return json({ error: 'Job is not set up as recurring' }, { status: 400 });
	}

	const startDate = template.scheduledDate ? new Date(template.scheduledDate) : new Date();
	const endDate = template.recurrenceEndDate ? new Date(template.recurrenceEndDate) : null;
	if (!endDate) {
		return json({ error: 'Recurrence end date is required' }, { status: 400 });
	}

	const existingDates = new Set(
		template.childJobs
			.map(c => c.scheduledDate ? new Date(c.scheduledDate).toISOString().slice(0, 10) : '')
			.filter(Boolean)
	);

	const intervalDays = INTERVAL_DAYS[template.recurrencePattern];
	const generated: string[] = [];
	let cursor = new Date(startDate);

	while (cursor <= endDate) {
		if (intervalDays) {
			cursor = new Date(cursor.getTime() + intervalDays * 24 * 60 * 60 * 1000);
		} else if (template.recurrencePattern === 'monthly') {
			cursor = addMonths(cursor, 1);
		} else {
			break;
		}

		if (cursor > endDate) break;

		const dateKey = cursor.toISOString().slice(0, 10);
		if (existingDates.has(dateKey)) continue;

		await prisma.job.create({
			data: {
				businessId: template.businessId,
				clientId: template.clientId,
				clientName: template.clientName,
				clientPhone: template.clientPhone,
				clientEmail: template.clientEmail,
				address: template.address,
				latitude: template.latitude,
				longitude: template.longitude,
				total: template.total,
				status: 'pending',
				scheduledDate: new Date(cursor),
				notes: template.notes,
				recurringTemplateId: template.id,
				sections: {
					create: template.sections.map((s, si) => ({
						name: s.name,
						sortOrder: si,
						tasks: {
							create: s.tasks.map((t, ti) => ({
								description: t.description,
								sortOrder: ti,
								requiredPhoto: t.requiredPhoto,
							}))
						}
					}))
				},
				startWithTasks: {
					create: template.startWithTasks.map((sw, i) => ({
						description: sw.description,
						sortOrder: i,
					}))
				}
			}
		});

		generated.push(dateKey);
	}

	return json({ generated: generated.length, dates: generated }, { status: 201 });
});
