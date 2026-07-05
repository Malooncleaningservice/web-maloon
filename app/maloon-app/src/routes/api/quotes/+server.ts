import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/quotes — list all quotes
export const GET: RequestHandler = async () => {
	const quotes = await prisma.quote.findMany({
		include: { quoteLineItems: true, quoteAddons: true },
		orderBy: { createdAt: 'desc' }
	});
	return json(quotes);
};

// POST /api/quotes — create a new quote
export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();

	// For MVP, hardcode businessId. Later this comes from auth.
	const business = await prisma.business.findFirst();
	let businessId = business?.id;

	if (!businessId) {
		const newBusiness = await prisma.business.create({
			data: { name: 'Maloon Service', slug: 'maloon-services' }
		});
		businessId = newBusiness.id;
	}

	const quote = await prisma.quote.create({
		data: {
			businessId,
			clientName: data.clientName,
			clientPhone: data.clientPhone,
			address: data.address,
			squareFootage: data.squareFootage ?? 0,
			ratePerSqFt: data.ratePerSqFt ?? 0.15,
			workerCount: data.workerCount ?? 1,
			status: 'draft',
			total: data.total ?? 0,
			quoteLineItems: {
				create: (data.lineItems ?? []).map((item: any) => ({
					name: item.name,
					price: item.price,
					size: item.size ?? null,
					quantity: item.quantity ?? 1,
				}))
			},
			quoteAddons: {
				create: (data.addons ?? []).map((item: any) => ({
					name: item.name,
					price: item.price,
				}))
			}
		},
		include: { quoteLineItems: true, quoteAddons: true }
	});

	return json(quote, { status: 201 });
};
