import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

function isNumericN(code: string, n: number) {
  return new RegExp(`^\\d{${n}}$`).test(code);
}

function countTrailingZeros(code: string) {
  let count = 0;
  for (let i = code.length - 1; i >= 0 && code[i] === '0'; i--) count++;
  return count;
}

type AccountRow = {
  id: string;
  code: string;
  isPosting: boolean;
  parentAccountId: string | null;
};

function computeDepth(id: string, byId: Map<string, AccountRow>, seen = new Set<string>()) {
  let depth = 0;
  let cur = byId.get(id);
  while (cur?.parentAccountId) {
    if (seen.has(cur.id)) return depth; // cycle guard
    seen.add(cur.id);
    depth++;
    cur = byId.get(cur.parentAccountId);
  }
  return depth;
}

async function main() {
  // Prisma doesn't support regex filters cross-db; use Postgres regex via raw SQL.
  const candidates = await prisma.$queryRaw<AccountRow[]>`
    SELECT "id", "code", "isPosting", "parentAccountId"
    FROM "Account"
    WHERE "code" ~ '^[0-9]{6}$'
  `;

  if (!candidates.length) {
    // eslint-disable-next-line no-console
    console.log('No 6-digit numeric account codes found. Nothing to migrate.');
    return;
  }

  const byId = new Map<string, AccountRow>(candidates.map((a) => [a.id, a]));
  const depths = new Map<string, number>();
  for (const a of candidates) depths.set(a.id, computeDepth(a.id, byId));

  // Parents first.
  candidates.sort((a, b) => (depths.get(a.id) ?? 0) - (depths.get(b.id) ?? 0));

  const planned = new Map<string, string>(); // id -> newCode
  const plannedCodes = new Set<string>();

  const planOne = (acc: AccountRow) => {
    if (!isNumericN(acc.code, 6)) return null;

    if (!acc.isPosting) {
      const newCode = `${acc.code}0`;
      return isNumericN(newCode, 7) ? newCode : null;
    }

    if (!acc.parentAccountId) return null;
    const parent = byId.get(acc.parentAccountId);
    if (!parent) return null;

    const parentNew = planned.get(parent.id) ?? parent.code;
    const parentOld = parent.code;

    // Only migrate posting children when the parent is part of the numeric hierarchy.
    if (!isNumericN(parentNew, 7) || !isNumericN(parentOld, 6)) return null;

    const newSuffixLen = countTrailingZeros(parentNew);
    const newPrefixLen = 7 - newSuffixLen;
    const newPrefix = parentNew.slice(0, newPrefixLen);

    const oldSuffixLen = countTrailingZeros(parentOld);
    const oldPrefixLen = 6 - oldSuffixLen;
    const oldPrefix = parentOld.slice(0, oldPrefixLen);

    if (!acc.code.startsWith(oldPrefix)) return null;
    const oldSerial = acc.code.slice(oldPrefixLen);
    const newSerial = oldSerial.padStart(newSuffixLen, '0');

    const newCode = `${newPrefix}${newSerial}`;
    return isNumericN(newCode, 7) ? newCode : null;
  };

  for (const acc of candidates) {
    const next = planOne(acc);
    if (!next) continue;
    if (plannedCodes.has(next)) {
      throw new Error(`Planned duplicate code "${next}" while migrating.`);
    }
    planned.set(acc.id, next);
    plannedCodes.add(next);
  }

  if (!planned.size) {
    // eslint-disable-next-line no-console
    console.log('Found 6-digit numeric codes, but none matched the numeric hierarchy rules for migration.');
    return;
  }

  // Check collisions with existing codes not in the plan.
  const toCodes = Array.from(planned.values());
  const collisions = await prisma.account.findMany({
    where: {
      code: { in: toCodes },
      NOT: { id: { in: Array.from(planned.keys()) } },
    },
    select: { id: true, code: true },
    take: 5,
  });

  if (collisions.length) {
    throw new Error(
      `Migration would collide with existing codes. Example collision: id=${collisions[0].id} code=${collisions[0].code}`,
    );
  }

  // eslint-disable-next-line no-console
  console.log(`Planning to migrate ${planned.size} account codes from 6-digit -> 7-digit numeric hierarchy.`);

  await prisma.$transaction(async (tx) => {
    for (const acc of candidates) {
      const newCode = planned.get(acc.id);
      if (!newCode) continue;
      await tx.account.update({
        where: { id: acc.id },
        data: { code: newCode },
      });
    }
  });

  // eslint-disable-next-line no-console
  console.log('Migration complete.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

