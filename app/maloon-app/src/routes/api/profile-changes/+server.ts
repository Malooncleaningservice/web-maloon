import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

// Workers submit profile-change requests via /api/worker/profile-changes.
// This admin-only endpoint lists all pending/approved/rejected changes.

export const GET: RequestHandler = apiHandler(async ({ locals, url }) => {
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
});