import { deleteSession } from '$lib/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiHandler } from '$lib/api-error';

export const POST: RequestHandler = apiHandler(async ({ cookies }) => {
	const token = cookies.get('session');
	if (token) {
		await deleteSession(token);
	}
	cookies.delete('session', { path: '/' });
	return json({ success: true });
});