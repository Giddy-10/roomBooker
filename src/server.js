const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Loads environment variables before initialization

const { getRooms, createBooking } = require('./bookingController');

const app = express();

app.use(cors());
app.use(express.json());

// Collins' Feature Routes
app.get('/api/rooms', getRooms);
app.post('/api/bookings', createBooking);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Booking Engine running securely on port ${PORT}`);
});