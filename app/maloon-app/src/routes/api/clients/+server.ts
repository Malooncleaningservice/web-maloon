import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const clients = await prisma.client.findMany({
		include: {
			_count: { select: { quotes: true, jobs: true } }
		},
		orderBy: { name: 'asc' }
	});
	return json(clients);
};

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

	const client = await prisma.client.create({
		data: {
			businessId,
			name: data.name,
			phone: data.phone ?? null,
			email: data.email ?? null,
			address: data.address ?? null,
			notes: data.notes ?? null,
		}
	});

	return json(client, { status: 201 });
};
