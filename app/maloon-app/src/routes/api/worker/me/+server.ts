import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const GET: RequestHandler = apiHandler(async ({ locals }) => {
	const workerId = locals.user?.workerId;
	if (!workerId) {
		return json({ error: 'Worker not found' }, { status: 403 });
	}

	const worker = await prisma.worker.findUnique({
		where: { id: workerId },
		include: {
			assignments: { include: { job: true } },
			user: { select: { id: true, email: true, identifierToken: true } }
		}
	});
	if (!worker) return json({ error: 'Not found' }, { status: 404 });
	return json(worker);
});

// Workers may only edit non-critical fields (phone, email, notes).
// Critical fields (firstName, lastName, w9*) must go through the
// profile-change approval flow (POST /api/worker/profile-changes).
export const PATCH: RequestHandler = apiHandler(async ({ request, locals }) => {
	const workerId = locals.user?.workerId;
	if (!workerId) {
		return json({ error: 'Worker not found' }, { status: 403 });
	}

	const data = await request.json();

	const worker = await prisma.worker.update({
		where: { id: workerId },
		data: {
			phone: data.phone,
			email: data.email,
			notes: data.notes,
		},
		include: { user: { select: { id: true, email: true, identifierToken: true } } }
	});
	return json(worker);
});
