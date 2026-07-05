import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/quotes/[id] — get a single quote
export const GET: RequestHandler = async ({ params }) => {
	const quote = await prisma.quote.findUnique({
		where: { id: params.id },
		include: { quoteLineItems: true, quoteAddons: true }
	});
	if (!quote) return json({ error: 'Not found' }, { status: 404 });
	return json(quote);
};

// PATCH /api/quotes/[id] — update a quote
export const PATCH: RequestHandler = async ({ params, request }) => {
	const data = await request.json();
	const quote = await prisma.quote.update({
		where: { id: params.id },
		data: {
			clientName: data.clientName,
			clientPhone: data.clientPhone,
			address: data.address,
			squareFootage: data.squareFootage,
			ratePerSqFt: data.ratePerSqFt,
			workerCount: data.workerCount,
			status: data.status,
			total: data.total,
			notes: data.notes,
		},
		include: { quoteLineItems: true, quoteAddons: true }
	});
	return json(quote);
};

// DELETE /api/quotes/[id] — delete a quote and its line items
export const DELETE: RequestHandler = async ({ params }) => {
	await prisma.job.updateMany({ where: { quoteId: params.id }, data: { quoteId: null } });
	await prisma.quoteAddon.deleteMany({ where: { quoteId: params.id } });
	await prisma.quoteLineItem.deleteMany({ where: { quoteId: params.id } });
	await prisma.quote.delete({ where: { id: params.id } });
	return json({ success: true });
};
