import "dotenv/config";
import { randomBytes } from "node:crypto";
import { Role, UserStatus, TaskStatus, TaskSource } from "../src/generated/prisma/client";
// Seeds reuse the single Prisma client constructed in src/server/db (docs/architecture.md §3).
import { basePrisma as prisma } from "../src/server/db/client";
import { hashPassword } from "../src/lib/password";

// Dev-only manager email; the password comes from SEED_PASSWORD, or a random one printed once.
const OWNER_EMAIL = "owner@acme.test";

/**
 * Seed one organisation, one owner, two members, and a few tasks in different statuses
 * so the dashboard has something to render (scaffolding task 12). Idempotent enough to
 * re-run against a fresh/branch database; not meant for production.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run seed with NODE_ENV=production");
  }
  const ownerPassword = process.env.SEED_PASSWORD ?? randomBytes(12).toString("base64url");
  const generatedPassword = !process.env.SEED_PASSWORD;

  const org = await prisma.organization.create({
    data: { name: "Acme Trading PLC" },
  });

  const owner = await prisma.user.create({
    data: {
      orgId: org.id,
      name: "Selamawit",
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
      email: OWNER_EMAIL,
      passwordHash: await hashPassword(ownerPassword),
    },
  });

  const abebe = await prisma.user.create({
    data: { orgId: org.id, name: "Abebe", role: Role.MEMBER, status: UserStatus.ACTIVE },
  });

  const sara = await prisma.user.create({
    data: { orgId: org.id, name: "Sara", role: Role.MEMBER, status: UserStatus.ACTIVE },
  });

  const day = 24 * 60 * 60 * 1000;
  await prisma.task.createMany({
    data: [
      {
        orgId: org.id,
        title: "Finish the Bole site report",
        assigneeId: abebe.id,
        createdById: owner.id,
        status: TaskStatus.IN_PROGRESS,
        source: TaskSource.MANUAL,
        dueAt: new Date(Date.now() + 2 * day),
      },
      {
        orgId: org.id,
        title: "Follow up with the supplier",
        assigneeId: sara.id,
        createdById: owner.id,
        status: TaskStatus.PENDING,
        dueAt: new Date(Date.now() + day),
      },
      {
        orgId: org.id,
        title: "Submit the monthly VAT filing",
        assigneeId: abebe.id,
        createdById: owner.id,
        status: TaskStatus.DONE,
        completedAt: new Date(),
        dueAt: new Date(Date.now() - day),
      },
      {
        orgId: org.id,
        title: "Repair the office generator",
        assigneeId: sara.id,
        createdById: owner.id,
        status: TaskStatus.BLOCKED,
      },
    ],
  });

  console.log(`Seeded org ${org.id}: 1 owner, 2 members, 4 tasks.`);
  console.log(`Manager login: ${OWNER_EMAIL} / ${ownerPassword}`);
  if (generatedPassword) {
    console.log("(password randomly generated — set SEED_PASSWORD to choose your own)");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
