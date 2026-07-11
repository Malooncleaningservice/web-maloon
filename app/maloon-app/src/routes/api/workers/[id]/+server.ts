import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const GET: RequestHandler = apiHandler(async ({ params }) => {
	const worker = await prisma.worker.findUnique({
		where: { id: params.id },
		include: {
			assignments: { include: { job: true } },
			user: { select: { id: true, email: true, identifierToken: true } }
		}
	});
	if (!worker) return json({ error: 'Not found' }, { status: 404 });
	return json(worker);
});

export const PATCH: RequestHandler = apiHandler(async ({ params, request }) => {
	const data = await request.json();
	const worker = await prisma.worker.update({
		where: { id: params.id },
		data: {
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			phone: data.phone,
			role: data.role,
			status: data.status,
			notes: data.notes,
			// W-9 fields
			w9Uploaded: data.w9Uploaded,
			w9FileName: data.w9FileName,
			w9ParsedName: data.w9ParsedName,
			w9ParsedTin: data.w9ParsedTin,
			w9ParsedAddress: data.w9ParsedAddress,
			w9Reviewed: data.w9Reviewed,
		},
		include: { user: { select: { id: true, email: true, identifierToken: true } } }
	});
	return json(worker);
});

export const DELETE: RequestHandler = apiHandler(async ({ params }) => {
	// Delete associated user first if exists
	const worker = await prisma.worker.findUnique({
		where: { id: params.id },
		include: { user: true }
	});
	if (worker?.user) {
		await prisma.user.delete({ where: { id: worker.user.id } });
	}
	await prisma.jobAssignment.deleteMany({ where: { workerId: params.id } });
	await prisma.worker.delete({ where: { id: params.id } });
	return json({ success: true });
});