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
      data: {
        roomId,
        facility,
        description,
        status: "OPEN"
      }
    });

    const criticalKeywords = ['broken down', 'broken', 'shattered', 'flooded', 'unusable', 'out of service', 'no power'];
    const lowerCaseDesc = description.toLowerCase();
    
    const isCriticalFailure = criticalKeywords.some(keyword => lowerCaseDesc.includes(keyword));

    let roomStatusUpdated = false;

    if (isCriticalFailure) {
      await prisma.room.update({
        where: { id: roomId },
        data: { isOutOfService: true }
      });
      roomStatusUpdated = true;
    }

    res.status(201).json({
      message: "Maintenance ticket logged successfully.",
      ticket: newTicket,
      roomStatusHookTriggered: roomStatusUpdated,
      roomStatus: roomStatusUpdated ? "Taken Out of Service Automatically" : "Remains Operational"
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to compile maintenance report: " + (error as Error).message });
  }
});

export default router;