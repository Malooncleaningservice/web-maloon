import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import { hashPassword, generateIdentifierToken } from '$lib/auth';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const GET: RequestHandler = apiHandler(async () => {
	const workers = await prisma.worker.findMany({
		include: {
			assignments: { include: { job: true } },
			user: { select: { id: true, email: true, identifierToken: true } }
		},
		orderBy: { lastName: 'asc' }
	});
	return json(workers);
});

export const POST: RequestHandler = apiHandler(async ({ request }) => {
	const data = await request.json();

	const business = await prisma.business.findFirst();
	let businessId = business?.id;
	if (!businessId) {
		const newBusiness = await prisma.business.create({
			data: { name: 'Maloon Service', slug: 'maloon-services' }
		});
		businessId = newBusiness.id;
	}

	// Generate temp password and/or identifier token if creating login
	let identifierToken: string | undefined;
	let passwordHash: string | undefined;

	if (data.createLogin) {
		if (data.email) {
			// Has email → create with temp password
			const tempPassword = Math.random().toString(36).slice(2, 10) + 'A1!';
			passwordHash = hashPassword(tempPassword);
		} else {
			// No email → create with identifier token
			identifierToken = generateIdentifierToken();
		}
	}

	const worker = await prisma.worker.create({
		data: {
			businessId,
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email || null,
			phone: data.phone || null,
			role: data.role ?? 'worker',
			notes: data.notes,
		}
	});

	// Create user account if requested
	if (data.createLogin && (data.email || identifierToken)) {
		await prisma.user.create({
			data: {
				email: data.email || null,
				passwordHash: passwordHash || null,
				role: 'worker',
				workerId: worker.id,
				mustResetPassword: true,
				identifierToken: identifierToken || null,
			}
		});
	}

	return json({
		...worker,
		identifierToken: identifierToken || undefined,
	}, { status: 201 });
});