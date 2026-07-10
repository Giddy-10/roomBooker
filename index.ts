import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './db.js'; // Note the .js extension if using NodeNext

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check route verifying DB connection
app.get('/status', async (req, res) => {
  try {
    // Just a quick query to ensure DB is responsive
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "OK", database: "Connected" });
  } catch (error) {
    res.status(500).json({ status: "Error", message: (error as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});