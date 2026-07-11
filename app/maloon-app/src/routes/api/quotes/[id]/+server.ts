import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const GET: RequestHandler = apiHandler(async ({ params }) => {
	const quote = await prisma.quote.findUnique({
		where: { id: params.id },
		include: { quoteLineItems: true, quoteAddons: true }
	});
	if (!quote) return json({ error: 'Not found' }, { status: 404 });
	return json(quote);
});

export const PATCH: RequestHandler = apiHandler(async ({ params, request }) => {
	const data = await request.json();

	const updateData: any = {};

	if (data.clientName !== undefined) updateData.clientName = data.clientName;
	if (data.clientPhone !== undefined) updateData.clientPhone = data.clientPhone;
	if (data.clientId !== undefined) updateData.clientId = data.clientId;
	if (data.address !== undefined) updateData.address = data.address;
	if (data.squareFootage !== undefined) updateData.squareFootage = data.squareFootage;
	if (data.ratePerSqFt !== undefined) updateData.ratePerSqFt = data.ratePerSqFt;
	if (data.workerCount !== undefined) updateData.workerCount = data.workerCount;
	if (data.status !== undefined) updateData.status = data.status;
	if (data.total !== undefined) updateData.total = data.total;
	if (data.notes !== undefined) updateData.notes = data.notes;

	const quote = await prisma.quote.update({
		where: { id: params.id },
		data: updateData,
		include: { quoteLineItems: true, quoteAddons: true }
	});
	return json(quote);
});

export const DELETE: RequestHandler = apiHandler(async ({ params }) => {
	await prisma.job.updateMany({ where: { quoteId: params.id }, data: { quoteId: null } });
	await prisma.quoteAddon.deleteMany({ where: { quoteId: params.id } });
	await prisma.quoteLineItem.deleteMany({ where: { quoteId: params.id } });
	await prisma.quote.delete({ where: { id: params.id } });
	return json({ success: true });
});
