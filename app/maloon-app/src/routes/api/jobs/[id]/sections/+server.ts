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

export const PATCH: RequestHandler = apiHandler(async ({ params, request }) => {
	const { sections } = await request.json();
	// sections: [{ id, sortOrder }, ...]
	for (const s of sections) {
		await prisma.jobSection.update({
			where: { id: s.id },
			data: { sortOrder: s.sortOrder }
		});
	}
	return json({ success: true });
});
