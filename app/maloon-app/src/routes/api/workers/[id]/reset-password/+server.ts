import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import { generateIdentifierToken, hashPassword } from '$lib/auth';
import { randomBytes } from 'node:crypto';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const POST: RequestHandler = apiHandler(async ({ params }) => {
	const worker = await prisma.worker.findUnique({
		where: { id: params.id },
		include: { user: true }
	});

	if (!worker) return json({ error: 'Not found' }, { status: 404 });
	if (!worker.user) return json({ error: 'No login account linked to this worker' }, { status: 400 });

	const token = generateIdentifierToken();
	const tempPassword = randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12) + 'A1!';

	await prisma.user.update({
		where: { id: worker.user.id },
		data: {
			passwordHash: hashPassword(tempPassword),
			identifierToken: token,
			mustResetPassword: true,
		}
	});

	return json({
		success: true,
		identifierToken: token,
		message: `A new access code has been generated: ${token}. Give this to the worker so they can log in and set a new password.`
	});
});