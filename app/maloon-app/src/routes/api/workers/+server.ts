import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import { hashPassword, generateIdentifierToken } from '$lib/auth';
import { randomBytes } from 'node:crypto';
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
			data: { name: 'Indigo', slug: 'indigo' }
		});
		businessId = newBusiness.id;
	}

	// Generate temp password and/or identifier token if creating login
	let identifierToken: string | undefined;
	let passwordHash: string | undefined;
	let tempPassword: string | undefined;

	if (data.createLogin) {
		if (data.email) {
			// Has email → create with temp password
			tempPassword = generateTempPassword();
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
		tempPassword: tempPassword || undefined,
	}, { status: 201 });
});

function generateTempPassword(): string {
	// Cryptographically secure temp password (12 chars, alphanumeric).
	return randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12) + 'A1!';
}