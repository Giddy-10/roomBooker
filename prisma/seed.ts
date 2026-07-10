import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding process...');

  // Clean existing rooms to avoid duplicates during testing resets
  await prisma.room.deleteMany();

  const roomsData = [
    {
      name: "Solo Pod 101",
      capacity: 1,
      category: "solo",
      location: "Library First Floor - Wing A",
      isOutOfService: false,
    },
    {
      name: "Solo Pod 102",
      capacity: 1,
      category: "solo",
      location: "Library First Floor - Wing A",
      isOutOfService: false,
    },
    {
      name: "Group Room Alpha",
      capacity: 4, // 50% threshold is 2 people
      category: "group",
      location: "Student Center - 2nd Floor",
      isOutOfService: false,
    },
    {
      name: "Group Room Beta",
      capacity: 6, // 50% threshold is 3 people
      category: "group",
      location: "Student Center - 2nd Floor",
      isOutOfService: false,
    },
    {
      name: "Mega Lab Omega",
      capacity: 12, // 50% threshold is 6 people
      category: "group",
      location: "Science Complex - Room 302",
      isOutOfService: false,
    },
  ];

  for (const room of roomsData) {
    const createdRoom = await prisma.room.create({ data: room });
    console.log(`✅ Created room: ${createdRoom.name} (${createdRoom.category})`);
  }

  console.log('🏁 Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error encountered:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end(); // Safely disconnect the pg connection pool
  });