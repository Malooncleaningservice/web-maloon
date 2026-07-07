import { prisma } from '$lib/prisma';
import { json } from '@sveltejs/kit';
import { hashPassword } from '$lib/auth';
import type { RequestHandler } from './$types';

// POST /api/auth/setup — complete first-time account setup
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !locals.user.mustResetPassword) {
		return json({ error: 'Not allowed' }, { status: 403 });
	}

	const data = await request.json();
	const { email, password } = data;

	if (!password || password.length < 8) {
		return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
	}

	// Worker accounts must set email on first setup
	if (locals.user.role === 'worker' && !email) {
		return json({ error: 'Email is required' }, { status: 400 });
	}

	const passwordHash = hashPassword(password);

	const updated = await prisma.user.update({
		where: { id: locals.user.id },
		data: {
			passwordHash,
			...(email ? { email } : {}),
			mustResetPassword: false,
			// Clear identifier token after setup — they now use email + password
			identifierToken: null,
		},
		include: { worker: true }
	});

	return json({ success: true });
};