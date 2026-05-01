import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type ParsedRow = {
  id: number;
  name: string;
  parentId: number | null;
};

function parseLocationDump(sql: string): ParsedRow[] {
  const marker = "INSERT INTO `locations`";
  const idx = sql.indexOf(marker);
  if (idx === -1) {
    throw new Error(`"${marker}" not found in SQL dump`);
  }

  const valuesIdx = sql.indexOf("VALUES", idx);
  if (valuesIdx === -1) {
    throw new Error("VALUES clause not found");
  }

  let chunk = sql.slice(valuesIdx + "VALUES".length);
  const semiIdx = chunk.indexOf(";");
  if (semiIdx === -1) {
    throw new Error("Could not find end of INSERT statement");
  }
  chunk = chunk.slice(0, semiIdx);

  const rows: ParsedRow[] = [];
  const tupleRe =
    /\((\d+),\s*'((?:[^'\\]|'')*)'\s*,\s*(NULL|\d+)\)/g;
  let match = tupleRe.exec(chunk);
  while (match !== null) {
    const id = Number(match[1]);
    const name = match[2].replace(/''/g, "'");
    const parentId = match[3] === "NULL" ? null : Number(match[3]);
    rows.push({ id, name, parentId });
    match = tupleRe.exec(chunk);
  }

  if (rows.length === 0) {
    throw new Error("No location rows parsed — check prisma/data/locations.sql format");
  }

  return rows;
}

async function main() {
  const filePath = path.join(process.cwd(), "prisma/data/locations.sql");
  if (!fs.existsSync(filePath)) {
    console.error(`Missing ${filePath}`);
    console.error("Copy your locations.sql dump into prisma/data/locations.sql");
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, "utf8");
  const rows = parseLocationDump(sql);

  const existing = await prisma.location.count();
  if (existing > 0) {
    console.log(`Skipping: locations table already has ${existing} rows.`);
    return;
  }

  const inserted = new Set<number>();
  let remaining = [...rows];

  await prisma.$transaction(async (tx) => {
    while (remaining.length > 0) {
      const batch = remaining.filter(
        (row) => row.parentId === null || inserted.has(row.parentId),
      );
      if (batch.length === 0) {
        throw new Error("Cannot resolve parent order — possible cycle or broken parent_id");
      }

      await tx.location.createMany({
        data: batch.map((row) => ({
          id: row.id,
          name: row.name,
          parentId: row.parentId,
        })),
      });

      batch.forEach((row) => inserted.add(row.id));
      remaining = remaining.filter((row) => !inserted.has(row.id));
    }
  });

  console.log(`Seeded ${rows.length} locations.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
