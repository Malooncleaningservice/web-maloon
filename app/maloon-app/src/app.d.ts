declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				email: string | null;
				role: string;
				workerId: string | null;
				mustResetPassword: boolean;
				displayName: string | null;
				worker?: {
					id: string;
					firstName: string;
					lastName: string;
				} | null;
			} | null;
			sessionToken: string | null;
		}
		interface PageData {
			user: Locals['user'];
			flash?: { type: 'success' | 'error'; message: string };
		}
	}
}

export {};