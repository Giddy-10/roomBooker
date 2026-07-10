import { Response } from 'express';
import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/users/bookings', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.userId;

    if (!currentUserId) {
      res.status(400).json({ error: "User identity could not be verified." });
      return;
    }

    const userWithBookings = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: {
        bookings: {
          include: {
            room: true
          },
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    });

    if (!userWithBookings) {
      res.status(404).json({ error: "User account records not found." });
      return;
    }

    const currentTime = new Date();

    const pastBookings = [];
    const upcomingBookings = [];

    for (const booking of userWithBookings.bookings) {
      if (new Date(booking.endTime) < currentTime) {
        pastBookings.push({
          id: booking.id,
          startTime: booking.startTime,
          endTime: booking.endTime,
          groupSize: booking.groupSize,
          room: {
            id: booking.room.id,
            name: booking.room.name,
            category: booking.room.category,
            location: booking.room.location
          }
        });
      } else {
        upcomingBookings.push({
          id: booking.id,
          startTime: booking.startTime,
          endTime: booking.endTime,
          groupSize: booking.groupSize,
          room: {
            id: booking.room.id,
            name: booking.room.name,
            category: booking.room.category,
            location: booking.room.location
          }
        });
      }
    }

    res.json({
      studentId: userWithBookings.id,
      email: userWithBookings.email,
      pastBookings,
      upcomingBookings
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to gather tracking history: " + (error as Error).message });
  }
});

export default router;