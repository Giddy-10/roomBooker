import { Router, Request, Response } from "express"
import prisma from "../db.js"
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js"

const router = Router()

export const getRooms = async (req: Request, res: Response): Promise<void> => {
	try {
		const rooms = await prisma.room.findMany({
			include: {
				facilities: true,
			},
		})

		const soloRooms = rooms.filter((room: any) => room.category === "solo")
		const groupRooms = rooms.filter((room: any) => room.category === "group")

		res.status(200).json({
			totalRoomsCount: rooms.length,
			soloRooms,
			groupRooms,
		})
	} catch (error) {
		res.status(500).json({
			error:
				"Failed to fetch dashboard rooms: " + (error as Error).message,
		})
	}
}

export const getAvailableRooms = async (
	req: Request,
	res: Response,
): Promise<void> => {
	try {
		const { date, time, durationHours } = req.query

		if (!date || !time || !durationHours) {
			res.status(400).json({
				error: "Missing time allocation filter values.",
			})
			return
		}

		const startSearch = new Date(`${date}T${time}`)
		const endSearch = new Date(
			startSearch.getTime() + Number(durationHours) * 60 * 60 * 1000,
		)

		const openRooms = await prisma.room.findMany({
			where: {
				isOutOfService: false,
				bookings: {
					none: {
						NOT: {
							OR: [
								{ endTime: { lte: startSearch } },
								{ startTime: { gte: endSearch } },
							],
						},
					},
				},
			},
			include: { facilities: true },
		})

		res.status(200).json(openRooms)
	} catch (error) {
		res.status(500).json({
			error: "Discovery processing failure: " + (error as Error).message,
		})
	}
}

export const createBooking = async (
	req: AuthenticatedRequest,
	res: Response,
): Promise<void> => {
	try {
		const { roomId, groupSize, startTime, endTime } = req.body
		const userId = req.userId

		if (!userId || !roomId || !groupSize || !startTime || !endTime) {
			res.status(400).json({
				error: "Missing mandatory reservation payload parameters.",
			})
			return
		}

		const start = new Date(startTime)
		const end = new Date(endTime)

		const durationHours =
			(end.getTime() - start.getTime()) / (1000 * 60 * 60)
		if (durationHours < 1) {
			res.status(400).json({
				error: "Booking must be at least 1 hour long.",
			})
			return
		}

		const room = await prisma.room.findUnique({ where: { id: roomId } })
		if (!room || room.isOutOfService) {
			res.status(404).json({
				error: "Target room structure is unavailable or does not exist.",
			})
			return
		}

		if (room.category === "group") {
			const threshold = room.capacity * 0.5
			if (groupSize < threshold) {
				const smallerRoomAvailable = await prisma.room.findFirst({
					where: {
						category: "group",
						isOutOfService: false,
						capacity: { lt: room.capacity },
					},
				})

				if (smallerRoomAvailable) {
					res.status(400).json({
						error: `This group room requires a minimum party size of ${Math.ceil(threshold)}. Smaller rooms are currently available.`,
					})
					return
				}
			}
		}

		const newBooking = await prisma.$transaction(async (tx: any) => {
			const conflict = await tx.booking.findFirst({
				where: {
					roomId: roomId,
					NOT: {
						OR: [
							{ endTime: { lte: start } },
							{ startTime: { gte: end } },
						],
					},
				},
			})

			if (conflict) {
				throw new Error("CONFLICT")
			}

			return await tx.booking.create({
				data: {
					userId,
					roomId,
					groupSize: Number(groupSize),
					startTime: start,
					endTime: end,
				},
			})
		})

		res.status(201).json({
			message: "Booking successful!",
			booking: newBooking,
		})
	} catch (error) {
		const err = error as Error
		if (err.message === "CONFLICT") {
			res.status(409).json({
				error: "This specific time slot is already booked.",
			})
			return
		}
		res.status(500).json({
			error:
				"Internal server error during booking creation: " + err.message,
		})
	}
}

export const getUserBookings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId; 

    if (!userId) {
      res.status(401).json({ error: "Unauthorized access: Missing user session token identifiers." });
      return;
    }

    const allBookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        room: {
          include: { facilities: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    const now = new Date();

    const pastBookings = allBookings.filter((booking: any) => new Date(booking.endTime) < now);
    const upcomingBookings = allBookings.filter((booking: any) => new Date(booking.endTime) >= now);

    res.status(200).json({
      userId,
      summary: {
        totalBookedSlots: allBookings.length,
        pastCount: pastBookings.length,
        upcomingCount: upcomingBookings.length
      },
      pastBookings,
      upcomingBookings
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to compile booking history matrix: " + (error as Error).message });
  }
};

router.get("/rooms", getRooms)
router.get("/rooms/available", getAvailableRooms)
router.post("/bookings", authenticateToken, createBooking)
router.get('/users/bookings', authenticateToken, getUserBookings);

export default router
