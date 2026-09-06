import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getMariaDbConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const url = new URL(databaseUrl.replace(/^mysql:/, "http:"));

  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 10,
    // Required for MySQL 8 `caching_sha2_password` over non-TLS local connections.
    allowPublicKeyRetrieval: true,
  };
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaMariaDb(getMariaDbConfig()),
  });
}

function isClientCurrent(client: PrismaClient): boolean {
  // After `prisma generate`, HMR can keep a stale singleton without new models.
  const contracts = (client as { tenderContract?: { updateMany?: unknown } })
    .tenderContract;
  return typeof contracts?.updateMany === "function";
}

function resolvePrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && isClientCurrent(existing)) {
    return existing;
  }
  const created = createPrismaClient();
  globalForPrisma.prisma = created;
  return created;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = resolvePrismaClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
