import { Router, Request, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Task 1: Room Discovery (Only show functional rooms)
export const getRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await prisma.room.findMany({
      where: { 
        isOutOfService: false // Maps smoothly to operational rooms
      } 
    });
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rooms: " + (error as Error).message });
  }
};

// Task 2 & 3: Booking Logic with Thresholds & Overlap Prevention
export const createBooking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId, groupSize, startTime, endTime } = req.body;
    const userId = req.userId; // Secure extraction via auth token middleware

    if (!userId || !roomId || !groupSize || !startTime || !endTime) {
      res.status(400).json({ error: "Missing mandatory reservation payload parameters." });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // 1. Duration Validation (Minimum 1 Hour)
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours < 1) {
      res.status(400).json({ error: "Booking must be at least 1 hour long." });
      return;
    }

    // Fetch the target room to verify capacity rules
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.isOutOfService) {
      res.status(404).json({ error: "Target room structure is unavailable or does not exist." });
      return;
    }

    // 2. Capacity Threshold Logic for Group Rooms
    if (room.category === 'group') {
      const threshold = room.capacity * 0.5; // Requires at least 50% capacity density
      if (groupSize < threshold) {
        
        // Check if there are smaller active rooms available before rejecting
        const smallerRoomAvailable = await prisma.room.findFirst({
          where: {
            category: 'group',
            isOutOfService: false,
            capacity: { lt: room.capacity }
          }
        });

        if (smallerRoomAvailable) {
          res.status(400).json({ 
            error: `Group rooms require a minimum party size of ${Math.ceil(threshold)}. Smaller rooms are currently available.` 
          });
          return;
        }
      }
    }

    // 3. Transactional Double-Booking Prevention
    const newBooking = await prisma.$transaction(async (tx) => {
      // Check for any overlapping times for this specific room
      const conflict = await tx.booking.findFirst({
        where: {
          roomId: roomId,
          NOT: {
            OR: [
              { endTime: { lte: start } },
              { startTime: { gte: end } }
            ]
          }
        }
      });

      if (conflict) {
        throw new Error("CONFLICT");
      }

      // Create the record if the slot is clear
      return await tx.booking.create({
        data: { 
          userId, 
          roomId, 
          groupSize: Number(groupSize), 
          startTime: start, 
          endTime: end 
        }
      });
    });

    res.status(201).json({ message: "Booking successful!", booking: newBooking });

  } catch (error) {
    const err = error as Error;
    if (err.message === "CONFLICT") {
      res.status(409).json({ error: "This specific time slot is already booked." });
      return;
    }
    res.status(500).json({ error: "Internal server error during booking creation: " + err.message });
  }
};

router.get('/rooms', getRooms);
router.post('/bookings', authenticateToken, createBooking);

export default router;