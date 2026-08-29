import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';
import type { VersionedSeed, SeedScope } from './seed-types.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const scope = (process.env.SEED_SCOPE ?? 'core,demo').split(',').map((value) => value.trim()) as SeedScope[];

const lockId = 260829;

async function checksum(path: string) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function loadSeeds() {
  const directory = join(currentDir, 'versions');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.ts')).sort();
  const seeds: Array<{ seed: VersionedSeed; path: string }> = [];
  for (const file of files) {
    const imported = await import(pathToFileURL(join(directory, file)).href) as { seed: VersionedSeed };
    seeds.push({ seed: imported.seed, path: join(directory, file) });
  }
  return seeds;
}

async function main() {
  await prisma.$executeRaw`SELECT pg_advisory_lock(${lockId})`;
  try {
    for (const { seed, path } of await loadSeeds()) {
      if (!scope.includes(seed.scope)) continue;
      const hash = await checksum(path);
      const previous = await prisma.seedHistory.findUnique({ where: { version: seed.version } });
      if (previous) {
        if (previous.checksum !== hash) throw new Error(`Seed ${seed.version} checksum changed after it was applied`);
        console.log(`skip seed ${seed.version} ${basename(path)}`);
        continue;
      }
      await prisma.$transaction(async (tx) => {
        await seed.up(tx);
        await tx.seedHistory.create({ data: { version: seed.version, name: seed.name, checksum: hash, scope: seed.scope } });
      });
      console.log(`apply seed ${seed.version} ${seed.name}`);
    }
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockId})`;
  }
}

await main().finally(() => prisma.$disconnect());
