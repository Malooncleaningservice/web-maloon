import { prisma } from './prisma';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

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
	return safeEqualHex(actual, expected);
}

// Constant-time comparison of two hex strings. Returns false (instead of
// throwing) when the buffers differ in length — which happens for legacy
// SHA-256 hashes (32 bytes) vs. scrypt output (64 bytes).
function safeEqualHex(a: string, b: string): boolean {
	const bufA = Buffer.from(a, 'hex');
	const bufB = Buffer.from(b, 'hex');
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}

function scryptHash(data: string, salt: string): string {
	// scrypt with N=2^15, r=8, p=1 — reasonable strength for a web app.
	return scryptSync(data, salt, 64).toString('hex');
}

// ---------------------------------------------------------------------------
// Legacy password-hash support (pre-scrypt: iterated SHA-256, 32 bytes)
// Accounts created before the scrypt migration still store a 64-char hex
// SHA-256 hash. We verify those so existing users can sign in, and the login
// route transparently re-hashes them to scrypt.
// ---------------------------------------------------------------------------

export function isLegacyHash(stored: string): boolean {
	const [s, expected] = stored.split(':');
	return !!s && !!expected && expected.length === 64;
}

export function verifyLegacyPassword(password: string, stored: string): boolean {
	const [s, expected] = stored.split(':');
	if (!s || !expected) return false;
	return legacyHash(password, s) === expected;
}

function legacyHash(data: string, salt: string): string {
	let h = salt + data;
	for (let i = 0; i < 100_000; i++) {
		h = createHash('sha256').update(h).digest('hex');
	}
	return h;
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