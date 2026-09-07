import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import { hashPassword, isLegacyHash, verifyLegacyPassword, verifyPassword, createSession } from '$lib/auth';
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

	let verified = verifyPassword(password, user.passwordHash);

	// Transparently migrate accounts whose hash predates scrypt so they can
	// keep signing in; re-hash to scrypt on first successful login.
	if (!verified && isLegacyHash(user.passwordHash) && verifyLegacyPassword(password, user.passwordHash)) {
		await prisma.user.update({
			where: { id: user.id },
			data: { passwordHash: hashPassword(password) },
		});
		verified = true;
	}

	if (!verified) {
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