import { PrismaClient } from '../src/generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting comprehensive database seeding process...');

  // Cascade deletes everything down automatically
  await prisma.room.deleteMany();

  // Create Solo Pod with minimal amenities
  await prisma.room.create({
    data: {
      name: "Solo Pod 101",
      capacity: 1,
      category: "solo",
      location: "Library First Floor - Wing A",
      facilities: {
        create: [
          { name: "WiFi" },
          { name: "Power Outlet" }
        ]
      }
    }
  });

  // Create an elite Group Room containing all facilities
  await prisma.room.create({
    data: {
      name: "Group Room Alpha",
      capacity: 4,
      category: "group",
      location: "Student Center - 2nd Floor",
      facilities: {
        create: [
          { name: "WiFi" },
          { name: "Whiteboard" },
          { name: "Smartboard" },
          { name: "Projector" },
          { name: "Air Conditioning" }
        ]
      }
    }
  });

  // Create a standard Group Room with intermediate tools
  await prisma.room.create({
    data: {
      name: "Group Room Beta",
      capacity: 6,
      category: "group",
      location: "Student Center - 2nd Floor",
      facilities: {
        create: [
          { name: "WiFi" },
          { name: "Whiteboard" },
          { name: "Power Outlet" }
        ]
      }
    }
  });

  console.log('🏁 Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error encountered:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });