import { validateSession } from '$lib/auth';
import { redirect, type Handle } from '@sveltejs/kit';

// ---------------------------------------------------------------------------
// Public routes – no auth required
// ---------------------------------------------------------------------------
const PUBLIC_ROUTES = [
	'/login',
	'/api/auth/login',
	'/api/auth/setup',
];

// ---------------------------------------------------------------------------
// Worker-only routes (worker portal)
// ---------------------------------------------------------------------------
const WORKER_ROUTES = [
	'/worker',
];

// ---------------------------------------------------------------------------
// Admin-only routes
// ---------------------------------------------------------------------------
const ADMIN_ROUTES = [
	'/personnel',
	'/quotes',
	'/jobs',
	'/clients',
	'/dispatch',
	'/api/workers',
	'/api/jobs',
	'/api/quotes',
	'/api/clients',
	'/api/line-items',
	'/api/sections',
	'/api/notifications',
	'/api/profile-changes',
	'/api/dashboard',
];

// Protected API routes (upload, etc.) — require auth but allow workers too
const PROTECTED_API_ROUTES = [
	'/api/upload',
];

function isProtectedApiRoute(pathname: string): boolean {
	return PROTECTED_API_ROUTES.some(r => pathname.startsWith(r));
}

function isPublic(pathname: string): boolean {
	return PUBLIC_ROUTES.some(r => pathname.startsWith(r));
}

function isWorkerRoute(pathname: string): boolean {
	return WORKER_ROUTES.some(r => pathname.startsWith(r));
}

function isAdminRoute(pathname: string): boolean {
	return ADMIN_ROUTES.some(r => pathname.startsWith(r));
}

export const handle: Handle = async ({ event, resolve }) => {
	const { cookies, url } = event;

	// Read session
	const token = cookies.get('session');
	if (token) {
		const user = await validateSession(token);
		if (user) {
			event.locals.user = {
				id: user.id,
				email: user.email,
				role: user.role,
				workerId: user.workerId,
				mustResetPassword: user.mustResetPassword,
				displayName: user.displayName ?? user.worker?.firstName
					? `${user.worker?.firstName ?? ''} ${user.worker?.lastName ?? ''}`.trim()
					: user.email ?? null,
				worker: user.worker ? {
					id: user.worker.id,
					firstName: user.worker.firstName,
					lastName: user.worker.lastName,
				} : null,
			};
			event.locals.sessionToken = token;
		}
	}

	// --- Route protection ---
	const pathname = url.pathname;

	// Public routes – allow through
	if (isPublic(pathname)) {
		// If already logged in, redirect away from login
		if (pathname === '/login' && event.locals.user) {
			if (event.locals.user.mustResetPassword) {
				// force password setup – handled on login page itself
			} else if (event.locals.user.role === 'worker') {
				throw redirect(302, '/worker');
			} else {
				throw redirect(302, '/');
			}
		}
		return resolve(event);
	}

	// Must be logged in for everything else
	if (!event.locals.user) {
		// For API routes, return 401
		if (pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		throw redirect(302, '/login');
	}

	// Force password reset before anything else
	if (event.locals.user.mustResetPassword && !pathname.startsWith('/api/auth/')) {
		// Redirect to login where they'll see the setup form
		throw redirect(302, '/login?setup=1');
	}

	// Role-based access
	if (isAdminRoute(pathname) && event.locals.user.role !== 'admin') {
		if (pathname.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		throw redirect(302, '/worker');
	}

	if (isWorkerRoute(pathname) && event.locals.user.role === 'admin') {
		throw redirect(302, '/');
	}

	return resolve(event);
};