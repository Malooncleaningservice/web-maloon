import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import { createAdminNotification } from '$lib/auth';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

// Submit a critical field change (firstName, lastName, w9*) for admin approval.
export const POST: RequestHandler = apiHandler(async ({ request, locals }) => {
	const workerId = locals.user?.workerId;
	if (!workerId) {
		return json({ error: 'Worker not found' }, { status: 403 });
	}

	const data = await request.json();
	const { field, newValue, oldValue } = data;

	const APPROVED_FIELDS = new Set([
		'firstName', 'lastName',
		'w9ParsedName', 'w9ParsedTin', 'w9ParsedAddress',
	]);

	if (!field || newValue === undefined) {
		return json({ error: 'field and newValue are required' }, { status: 400 });
	}
	if (!APPROVED_FIELDS.has(field)) {
		return json({ error: `Field "${field}" is not editable` }, { status: 400 });
	}

	const change = await prisma.profileChange.create({
		data: {
			workerId,
			field,
			oldValue: oldValue ?? null,
			newValue,
			requestedBy: locals.user!.id,
		}
	});

	// Notify all admins
	const worker = await prisma.worker.findUnique({ where: { id: workerId } });
	const wn = worker ? `${worker.firstName} ${worker.lastName}` : 'A worker';
	await createAdminNotification(
		`${wn} requested a change to "${field}"`,
		`/personnel/${workerId}`
	);

	return json(change, { status: 201 });
});

// List the requesting worker's own profile-change history (any status).
export const GET: RequestHandler = apiHandler(async ({ locals }) => {
	const workerId = locals.user?.workerId;
	if (!workerId) {
		return json({ error: 'Worker not found' }, { status: 403 });
	}

	const changes = await prisma.profileChange.findMany({
		where: { workerId },
		include: { worker: true },
		orderBy: { requestedAt: 'desc' },
		take: 100
	});
	return json(changes);
});
