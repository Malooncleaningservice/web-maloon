import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { readFileSync, existsSync } from 'node:fs';
import 'dotenv/config';

const globalForPrisma = globalThis as unknown as {
	prisma: PrismaClient | undefined;
};

const dbUrl = new URL(process.env.DATABASE_URL!);

function getSslConfig() {
	// Railway / production: base64 CA cert in env var
	if (process.env.AIVEN_CA_BASE64) {
		return { ca: Buffer.from(process.env.AIVEN_CA_BASE64, 'base64').toString('utf-8') };
	}
	// Local: read from file
	const caPath = 'prisma/aiven-ca.pem';
	if (existsSync(caPath)) {
		return { ca: readFileSync(caPath) };
	}
	// Fallback for environments where CA isn't needed
	return undefined;
}

const sslConfig = getSslConfig();

const adapter = new PrismaMariaDb({
	host: dbUrl.hostname,
	port: Number(dbUrl.port),
	user: dbUrl.username,
	password: dbUrl.password,
	database: dbUrl.pathname.replace('/', ''),
	...(sslConfig ? { ssl: sslConfig } : {}),
	connectTimeout: 10000,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}
