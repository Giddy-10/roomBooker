import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import ticketRoutes from './routes/tickets.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); 

app.use('/api/auth', authRoutes);
app.use('/api', bookingRoutes);
app.use('/api', ticketRoutes);

app.get('/status', (req, res) => {
  res.json({
    status: "ONLINE",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 RoomBooker Backend Server running cleanly!`);
  console.log(`⚡ URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});