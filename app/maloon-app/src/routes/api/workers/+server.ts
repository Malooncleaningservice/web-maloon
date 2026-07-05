import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/workers — list all workers
export const GET: RequestHandler = async () => {
	const workers = await prisma.worker.findMany({
		include: { assignments: { include: { job: true } } },
		orderBy: { lastName: 'asc' }
	});
	return json(workers);
};

// POST /api/workers — create a new worker
export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();

	const business = await prisma.business.findFirst();
	let businessId = business?.id;
	if (!businessId) {
		const newBusiness = await prisma.business.create({
			data: { name: 'Maloon Service', slug: 'maloon-services' }
		});
		businessId = newBusiness.id;
	}

	const worker = await prisma.worker.create({
		data: {
			businessId,
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			phone: data.phone,
			role: data.role ?? 'worker',
			notes: data.notes,
		}
	});

	return json(worker, { status: 201 });
};
