import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/jobs/[id]/sections — add a section to a job
export const POST: RequestHandler = async ({ params, request }) => {
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
};

// PATCH /api/jobs/[id]/sections — reorder sections
export const PATCH: RequestHandler = async ({ params, request }) => {
	const { sections } = await request.json();
	// sections: [{ id, sortOrder }, ...]
	for (const s of sections) {
		await prisma.jobSection.update({
			where: { id: s.id },
			data: { sortOrder: s.sortOrder }
		});
	}
	return json({ success: true });
};
