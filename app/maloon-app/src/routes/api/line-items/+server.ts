import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

// `?all=true` includes inactive items (admin catalog management).
export const GET: RequestHandler = apiHandler(async ({ url }) => {
	const all = url.searchParams.get('all') === 'true';
	const items = await prisma.lineItem.findMany({
		where: all ? undefined : { isActive: true },
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
			isActive: data.isActive ?? true,
		}
	});
	return json(item, { status: 201 });
});
