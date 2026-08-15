import { prisma } from './prisma';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// Password helpers (scrypt — purpose-built for password hashing)
// Uses Node's built-in scrypt with a per-password salt. This is resistant to
// GPU/ASIC brute-force attacks, unlike plain SHA-256.
// ---------------------------------------------------------------------------

function salt(): string {
	return randomBytes(16).toString('hex');
}

export function hashPassword(password: string): string {
	const s = salt();
	const hash = scryptHash(password, s);
	return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [s, expected] = stored.split(':');
	if (!s || !expected) return false;
	const actual = scryptHash(password, s);
	// Constant-time comparison to prevent timing attacks.
	return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function scryptHash(data: string, salt: string): string {
	// scrypt with N=2^15, r=8, p=1 — reasonable strength for a web app.
	return scryptSync(data, salt, 64).toString('hex');
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
	// Clean up expired sessions for this user
	await prisma.session.deleteMany({
		where: { userId, expiresAt: { lt: new Date() } }
	});

	const token = generateSessionToken();
	await prisma.session.create({
		data: {
			userId,
			token,
			expiresAt: new Date(Date.now() + SESSION_TTL_MS),
		}
	});
	return token;
}

export async function validateSession(token: string) {
	const session = await prisma.session.findUnique({
		where: { token },
		include: {
			user: {
				include: { worker: true }
			}
		}
	});

	if (!session || session.expiresAt < new Date()) {
		if (session) {
			await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
		}
		return null;
	}

	return session.user;
}

export async function deleteSession(token: string) {
	await prisma.session.deleteMany({ where: { token } });
}

// ---------------------------------------------------------------------------
// Identifier token generation (for workers without emails)
// ---------------------------------------------------------------------------

export function generateIdentifierToken(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I for clarity
	let token = '';
	const bytes = randomBytes(6);
	for (let i = 0; i < 6; i++) {
		token += chars[bytes[i] % chars.length];
	}
	return `MLN-${token}`;
}

// ---------------------------------------------------------------------------
// Notifications helper
// ---------------------------------------------------------------------------

export async function createAdminNotification(message: string, link?: string) {
	const admins = await prisma.user.findMany({ where: { role: 'admin' } });
	await prisma.notification.createMany({
		data: admins.map((a: { id: string }) => ({ userId: a.id, message, link }))
	});
}