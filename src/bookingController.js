const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Initialize the PostgreSQL connection pool using your .env URL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Task 1: Room Discovery (Only show functional rooms)
const getRooms = async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({
            where: { inService: true } 
        });
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
};

// Task 2 & 3: Booking Logic with Thresholds & Overlap Prevention
const createBooking = async (req, res) => {
    const { userId, roomId, partySize, startTime, endTime } = req.body;
    
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 1. Duration Validation (Minimum 1 Hour)
    const durationHours = (end - start) / (1000 * 60 * 60);
    if (durationHours < 1) {
        return res.status(400).json({ error: "Booking must be at least 1 hour long." });
    }

    try {
        // Fetch the target room to verify capacity rules
        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room) return res.status(404).json({ error: "Room not found." });

        // 2. Capacity Threshold Logic for Group Rooms
        if (room.isGroupRoom) {
            const threshold = room.capacity * 0.5; // Requires at least 50% capacity
            if (partySize < threshold) {
                // Check if there are smaller active rooms available before rejecting
                const smallerRoomAvailable = await prisma.room.findFirst({
                    where: {
                        inService: true,
                        capacity: { lt: room.capacity }
                    }
                });

                if (smallerRoomAvailable) {
                    return res.status(400).json({ 
                        error: `Group rooms require a minimum party size of ${Math.ceil(threshold)}. Smaller rooms are available.` 
                    });
                }
            }
        }

        // 3. Transactional Double-Booking Prevention
        const newBooking = await prisma.$transaction(async (tx) => {
            // Check for any overlapping times for this specific room
            const conflict = await tx.booking.findFirst({
                where: {
                    roomId: roomId,
                    OR: [
                        { startTime: { lt: end }, endTime: { gt: start } }
                    ]
                }
            });

            if (conflict) {
                throw new Error("CONFLICT");
            }

            // Create the record if the slot is clear
            return await tx.booking.create({
                data: { userId, roomId, partySize, startTime: start, endTime: end }
            });
        });

        res.status(201).json({ message: "Booking successful!", booking: newBooking });

    } catch (error) {
        if (error.message === "CONFLICT") {
            return res.status(409).json({ error: "This time slot is already booked." });
        }
        res.status(500).json({ error: "Internal server error during booking creation." });
    }
};

module.exports = { getRooms, createBooking };