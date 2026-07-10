const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
    console.log("Seeding database...");
    
    // 1. Create a dummy user (Gideon will build the real auth later)
    const user = await prisma.user.create({
        data: {
            email: "student@usiu.ac.ke",
            name: "Test Student",
            password: "dummy_password" 
        }
    });

    // 2. Create study rooms
    const soloRoom = await prisma.room.create({
        data: { name: "Library Pod A", capacity: 1, isGroupRoom: false }
    });

    const groupRoom = await prisma.room.create({
        data: { name: "Discussion Room 1", capacity: 8, isGroupRoom: true }
    });

    console.log("✅ SEED SUCCESSFUL! Copy these IDs for your testing:");
    console.log("--------------------------------------------------");
    console.log(`Test User ID:  ${user.id}`);
    console.log(`Group Room ID: ${groupRoom.id}`);
    console.log(`Solo Room ID:  ${soloRoom.id}`);
    console.log("--------------------------------------------------");
}

seed()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());