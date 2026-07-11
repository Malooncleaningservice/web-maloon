import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const GET: RequestHandler = apiHandler(async () => {
	const items = await prisma.lineItem.findMany({
		where: { isActive: true },
		orderBy: { name: 'asc' }
	});
	return json(items);
});

export const POST: RequestHandler = apiHandler(async ({ request }) => {
	const data = await request.json();

	const business = await prisma.business.findFirst();
	let businessId = business?.id;
	if (!businessId) {
		const newBusiness = await prisma.business.create({
			data: { name: 'Maloon Service', slug: 'maloon-services' }
		});
		businessId = newBusiness.id;
	}

	const item = await prisma.lineItem.create({
		data: {
			businessId,
			name: data.name,
			description: data.description,
			basePrice: data.basePrice ?? 0,
			hasSizeMod: data.hasSizeMod ?? false,
			sizeSmall: data.sizeSmall,
			sizeMedium: data.sizeMedium,
			sizeLarge: data.sizeLarge,
		}
	});
	return json(item, { status: 201 });
});
