import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const PATCH: RequestHandler = apiHandler(async ({ params, request }) => {
	const data = await request.json();
	const updateData: any = {};
	if (data.name !== undefined) updateData.name = data.name;
	if (data.description !== undefined) updateData.description = data.description;
	if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
	if (data.hasSizeMod !== undefined) updateData.hasSizeMod = data.hasSizeMod;
	if (data.sizeSmall !== undefined) updateData.sizeSmall = data.sizeSmall;
	if (data.sizeMedium !== undefined) updateData.sizeMedium = data.sizeMedium;
	if (data.sizeLarge !== undefined) updateData.sizeLarge = data.sizeLarge;
	if (data.isActive !== undefined) updateData.isActive = data.isActive;

	const item = await prisma.lineItem.update({
		where: { id: params.id },
		data: updateData,
	});
	return json(item);
});

export const DELETE: RequestHandler = apiHandler(async ({ params }) => {
	// Soft-delete: deactivate instead of removing so historical quotes/jobs
	// keep a reference to the catalog item's name.
	await prisma.lineItem.update({
		where: { id: params.id },
		data: { isActive: false },
	});
	return json({ success: true });
});
