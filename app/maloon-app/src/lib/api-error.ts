import { json, type RequestHandler } from '@sveltejs/kit';

export function apiHandler(handler: RequestHandler): RequestHandler {
	return async (event) => {
		try {
			return await handler(event);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Internal Server Error';
			const code = err instanceof Error ? err.name : 'UNKNOWN';
			console.error(`[API] ${event.request.method} ${event.url.pathname}:`, message);
			return json({ error: message, code }, { status: 500 });
		}
	};
}
