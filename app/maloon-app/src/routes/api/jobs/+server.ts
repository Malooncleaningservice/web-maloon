import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/jobs — list all jobs, optional ?date= filter
export const GET: RequestHandler = async ({ url }) => {
	const dateParam = url.searchParams.get('date');
	const statusParam = url.searchParams.get('status');

	const where: any = {};

	if (dateParam) {
		const date = new Date(dateParam);
		date.setHours(0, 0, 0, 0);
		const nextDay = new Date(date);
		nextDay.setDate(nextDay.getDate() + 1);
		where.scheduledDate = { gte: date, lt: nextDay };
	}

	if (statusParam) {
		where.status = statusParam;
	}

	const jobs = await prisma.job.findMany({
		where,
		include: {
			client: { select: { id: true, name: true } },
			quote: { select: { id: true, total: true, status: true } },
			sections: { include: { tasks: { include: { photos: true } } } },
			startWithTasks: true,
			assignments: { include: { worker: true } }
		},
		orderBy: { createdAt: 'desc' }
	});
	return json(jobs);
};

// POST /api/jobs — create a new job
export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();

	// For MVP: get or create business
	const business = await prisma.business.findFirst();
	let businessId = business?.id;
	if (!businessId) {
		const newBusiness = await prisma.business.create({
			data: { name: 'Maloon Service', slug: 'maloon-services' }
		});
		businessId = newBusiness.id;
	}

	let clientName = data.clientName;
	let address = data.address;

	if (data.clientId) {
		const client = await prisma.client.findUnique({ where: { id: data.clientId } });
		if (client) {
			clientName = client.name;
			address = data.address || client.address || '';
		}
	}

	const job = await prisma.job.create({
		data: {
			businessId,
			quoteId: data.quoteId ?? null,
			clientId: data.clientId ?? null,
			clientName,
			clientPhone: data.clientPhone,
			clientEmail: data.clientEmail,
			address,
			scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
			status: data.status ?? 'pending',
			notes: data.notes,
		}
	});

	// If this was converted from a quote, update quote status
	if (data.quoteId) {
		await prisma.quote.update({
			where: { id: data.quoteId },
			data: { status: 'accepted' }
		});
	}

	return json(job, { status: 201 });
};
