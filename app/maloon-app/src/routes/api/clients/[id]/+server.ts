import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const client = await prisma.client.findUnique({
		where: { id: params.id },
		include: {
			quotes: {
				orderBy: { createdAt: 'desc' },
				include: { quoteLineItems: true, quoteAddons: true }
			},
			jobs: {
				orderBy: { createdAt: 'desc' },
				include: {
					assignments: { include: { worker: true } },
					_count: { select: { sections: true } }
				}
			}
		}
	});
	if (!client) return json({ error: 'Not found' }, { status: 404 });
	return json(client);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const data = await request.json();
	const client = await prisma.client.update({
		where: { id: params.id },
		data: {
			name: data.name,
			phone: data.phone,
			email: data.email,
			address: data.address,
			notes: data.notes,
		}
	});
	return json(client);
};

export const DELETE: RequestHandler = async ({ params }) => {
	await prisma.client.delete({ where: { id: params.id } });
	return json({ success: true });
};
