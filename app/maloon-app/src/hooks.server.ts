import { validateSession } from '$lib/auth';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';

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

// Worker-accessible API routes — allow both workers and admins
const WORKER_API_ROUTES = [
	'/api/worker',
	'/api/auth/me',
	'/api/upload',
];

function isWorkerApiRoute(pathname: string): boolean {
	return WORKER_API_ROUTES.some(r => pathname.startsWith(r));
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

	// Worker API routes — accessible by any authenticated user
	if (isWorkerApiRoute(pathname)) {
		return resolve(event);
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

export const handleError: HandleServerError = async ({ error, event }) => {
	const err = error instanceof Error ? error : new Error(String(error));
	console.error('[handleError]', err.message, err.stack);

	if (event.url.pathname.startsWith('/api/')) {
		return {
			message: err.message || 'Internal Server Error',
			code: err.name ?? 'UNKNOWN',
		};
	}

	return {
		message: 'An unexpected error occurred',
	};
};