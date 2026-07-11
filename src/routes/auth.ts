import { Router, Request, Response } from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import prisma from "../db.js"
import { OAuth2Client } from "google-auth-library"

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || "39386e81b07f11608add48082603a961d192ca3a12b55f3c65bbe8fcc1794fc8"

router.post("/register", async (req: Request, res: Response): Promise<void> => {
	try {
		const { email, password, name } = req.body

		if (!email || !password) {
			res.status(400).json({
				error: "Email and password are required fields.",
			})
			return
		}

		// if (!email.endsWith("@usiu.ac.ke")) {
		// 	res.status(400).json({
		// 		error: "Registration is restricted to valid school emails.",
		// 	})
		// 	return
		// }

		const existingUser = await prisma.user.findUnique({ where: { email } })
		if (existingUser) {
			res.status(400).json({
				error: "An account with this email already exists.",
			})
			return
		}

		const hashedPassword = await bcrypt.hash(password, 10)

		const newUser = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name,
			},
		})

		const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
			expiresIn: "24h",
		})

		res.status(201).json({
			message: "Registration successful",
			token,
			user: { id: newUser.id, email: newUser.email, name: newUser.name },
		})
	} catch (error) {
		res.status(500).json({ error: (error as Error).message })
	}
})

router.post("/login", async (req: Request, res: Response): Promise<void> => {
	try {
		const { email, password } = req.body

		if (!email || !password) {
			res.status(400).json({
				error: "Email and password are required fields.",
			})
			return
		}

		const user = await prisma.user.findUnique({ where: { email } })

		if (!user || !user.password) {
			res.status(401).json({
				error: "Invalid credentials configuration.",
			})
			return
		}

		const isPasswordValid = await bcrypt.compare(password, user.password)
		if (!isPasswordValid) {
			res.status(401).json({
				error: "Invalid credentials configuration.",
			})
			return
		}

		const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
			expiresIn: "24h",
		})

		res.json({
			message: "Login successful",
			token,
			user: { id: user.id, email: user.email, name: user.name },
		})
	} catch (error) {
		res.status(500).json({ error: (error as Error).message })
	}
})

router.post("/google", async (req: Request, res: Response): Promise<void> => {
	try {
		const { idToken } = req.body

		if (!idToken) {
			res.status(400).json({ error: "Google ID Token is required." })
			return
		}

		const ticket = await client.verifyIdToken({
			idToken,
			audience: process.env.GOOGLE_CLIENT_ID,
		})

		const payload = ticket.getPayload()
		if (!payload || !payload.email) {
			res.status(400).json({
				error: "Invalid token payload received from Google.",
			})
			return
		}

		const { email, sub: googleId, name } = payload

		const user = await prisma.user.upsert({
			where: { email },
			update: {
				googleId,
			},
			create: {
				email,
				googleId,
				name,
				password: null,
			},
		})

		const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
			expiresIn: "24h",
		})

		res.json({
			message: "Google authentication successful",
			token,
			user: { id: user.id, email: user.email, name: user.name },
		})
	} catch (error) {
		res.status(401).json({
			error:
				"Google token verification failed: " + (error as Error).message,
		})
	}
})

export default router;