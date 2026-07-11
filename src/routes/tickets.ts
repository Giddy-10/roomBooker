import { Router, Response } from 'express';
import prisma from '../db.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.post('/tickets', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId, facility, description } = req.body;

    if (!roomId || !facility || !description) {
      res.status(400).json({ error: "Missing required fields: roomId, facility, and description are mandatory." });
      return;
    }

    const targetRoom = await prisma.room.findUnique({ where: { id: roomId } });
    if (!targetRoom) {
      res.status(404).json({ error: "The designated room structure could not be found." });
      return;
    }

    const newTicket = await prisma.ticket.create({
      data: { roomId, facility, description, status: "OPEN" }
    });

    const matchedFacility = await prisma.facility.findFirst({
      where: { roomId, name: { equals: facility, mode: 'insensitive' } }
    });

    let facilityUpdated = false;
    if (matchedFacility) {
      await prisma.facility.update({
        where: { id: matchedFacility.id },
        data: { isOutOfService: true }
      });
      facilityUpdated = true;
    }

    const criticalKeywords = ['flooded', 'shattered window', 'no power', 'roof leak'];
    const lowerCaseDesc = description.toLowerCase();
    const isRoomCritical = criticalKeywords.some(kw => lowerCaseDesc.includes(kw));

    if (isRoomCritical) {
      await prisma.room.update({
        where: { id: roomId },
        data: { isOutOfService: true }
      });
    }

    res.status(201).json({
      message: "Maintenance ticket logged successfully.",
      ticket: newTicket,
      facilityTargeted: facility,
      facilityStatusUpdated: facilityUpdated ? "Marked OUT OF SERVICE" : "Not Found (No State Change)"
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to compile maintenance report: " + (error as Error).message });
  }
});

export default router;