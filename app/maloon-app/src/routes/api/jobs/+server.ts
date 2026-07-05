import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/jobs — list all jobs
export const GET: RequestHandler = async () => {
	const jobs = await prisma.job.findMany({
		include: {
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

	const job = await prisma.job.create({
		data: {
			businessId,
			quoteId: data.quoteId ?? null,
			clientName: data.clientName,
			clientPhone: data.clientPhone,
			clientEmail: data.clientEmail,
			address: data.address,
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
