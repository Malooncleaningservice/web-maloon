import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import { verifyPassword, createSession } from '$lib/auth';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const POST: RequestHandler = apiHandler(async ({ request, cookies }) => {
	const data = await request.json();
	const { email, password, identifierToken } = data;

	// --- Identifier token login ---
	if (identifierToken) {
		const user = await prisma.user.findUnique({
			where: { identifierToken },
			include: { worker: true }
		});

		if (!user) {
			return json({ error: 'Invalid identifier token' }, { status: 401 });
		}

		const token = await createSession(user.id);
		cookies.set('session', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({ success: true, mustResetPassword: user.mustResetPassword });
	}

	// --- Email + password login ---
	if (!email || !password) {
		return json({ error: 'Email and password are required' }, { status: 400 });
	}

	const user = await prisma.user.findUnique({
		where: { email },
		include: { worker: true }
	});

	if (!user || !user.passwordHash) {
		return json({ error: 'Invalid email or password' }, { status: 401 });
	}

	if (!verifyPassword(password, user.passwordHash)) {
		return json({ error: 'Invalid email or password' }, { status: 401 });
	}

	const token = await createSession(user.id);
	cookies.set('session', token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24 * 7
	});

	return json({ success: true, mustResetPassword: user.mustResetPassword });
});