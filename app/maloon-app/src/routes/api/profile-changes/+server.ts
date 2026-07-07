import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import { createAdminNotification } from '$lib/auth';
import type { RequestHandler } from './$types';

// POST /api/profile-changes — request a profile field change (worker submits)
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.user.workerId) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const data = await request.json();
	const { field, newValue, oldValue } = data;

	if (!field || newValue === undefined) {
		return json({ error: 'field and newValue are required' }, { status: 400 });
	}

	const change = await prisma.profileChange.create({
		data: {
			workerId: locals.user.workerId,
			field,
			oldValue: oldValue ?? null,
			newValue,
			requestedBy: locals.user.id,
		}
	});

	// Notify all admins
	const worker = await prisma.worker.findUnique({ where: { id: locals.user.workerId } });
	const wn = worker ? `${worker.firstName} ${worker.lastName}` : 'A worker';
	await createAdminNotification(
		`${wn} requested a change to "${field}"`,
		`/personnel/${locals.user.workerId}`
	);

	return json(change, { status: 201 });
};

// GET /api/profile-changes — list pending changes (admin view)
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json([], { status: 403 });
	}

	const workerId = url.searchParams.get('workerId');
	const where: Record<string, unknown> = {};
	if (workerId) {
		where.workerId = workerId;
	}

	const changes = await prisma.profileChange.findMany({
		where,
		include: { worker: true },
		orderBy: { requestedAt: 'desc' },
		take: 100
	});
	return json(changes);
};