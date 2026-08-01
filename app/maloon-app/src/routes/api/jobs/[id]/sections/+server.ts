import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const POST: RequestHandler = apiHandler(async ({ params, request }) => {
	const data = await request.json();

	// Get current max sortOrder
	const maxOrder = await prisma.jobSection.findFirst({
		where: { jobId: params.id },
		orderBy: { sortOrder: 'desc' },
		select: { sortOrder: true }
	});

	const section = await prisma.jobSection.create({
		data: {
			jobId: params.id,
			name: data.name,
			sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
		}
	});

	return json(section, { status: 201 });
});

export const PATCH: RequestHandler = apiHandler(async ({ request }) => {
	const { sections } = await request.json();
	// sections: [{ id, name?, sortOrder? }, ...]
	// `name` is optional (rename); `sortOrder` is optional (reorder).
	for (const s of sections) {
		const data: { name?: string; sortOrder?: number } = {};
		if (s.name !== undefined) data.name = s.name;
		if (s.sortOrder !== undefined) data.sortOrder = s.sortOrder;
		if (Object.keys(data).length === 0) continue;
		await prisma.jobSection.update({
			where: { id: s.id },
			data
		});
	}
	return json({ success: true });
});
