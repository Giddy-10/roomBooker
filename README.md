# API Integration Guide

- Base URL: https://roombooker-rm88.onrender.com

- Content-Type: application/json

- Protected Routes: Routes requiring authentication expect an HTTP header formatted as follows:

```
Authorization: Bearer <your_jwt_token>
```

# 1. Authentication Endpoints (`/api/auth`)

## Register Account

Allows registration using institutional credentials.

- Method: POST

- Endpoint: /api/auth/register

- Authentication: None

- Request Body:

``` JSON
{
  "email": "student@usiu.ac.ke",
  "password": "SecurePassword123!",
  "name": "Mystical Adams"
}
```
Success Response (201 Created):

``` JSON
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
## Login

Logs in an established user and returns a session JWT.

- Method: POST
- Endpoint: /api/auth/login
- Authentication: None
- Request Body:

``` JSON
{
  "email": "student@usiu.ac.ke",
  "password": "SecurePassword123!"
}
```
Success Response (200 OK):

``` JSON
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u-1234-5678",
    "name": "Mystical Adams",
    "email": "student@usiu.ac.ke"
  }
}
```

# 2. Room Discovery Endpoints (`/api/rooms`)

## Fetch Main Dashboard Rooms

Retrieves all rooms categorized by type, along with the up-to-date health/service status of their individual sub-facilities.

- Method: GET
- Endpoint: /api/rooms
- Authentication: None
- Request Body: None

Success Response (200 OK):

``` JSON
{
  "totalRoomsCount": 3,
  "soloRooms": [
    {
      "id": "room-solo-101",
      "name": "Solo Pod 101",
      "capacity": 1,
      "category": "solo",
      "location": "Library Wing A",
      "isOutOfService": false,
      "facilities": [
        { "name": "WiFi", "isOutOfService": false },
        { "name": "Power Outlet", "isOutOfService": false }
      ]
    }
  ],
  "groupRooms": [
    {
      "id": "room-group-alpha",
      "name": "Group Room Alpha",
      "capacity": 4,
      "category": "group",
      "location": "Student Center 2nd Floor",
      "isOutOfService": false,
      "facilities": [
        { "name": "WiFi", "isOutOfService": false },
        { "name": "Smartboard", "isOutOfService": true }
      ]
    }
  ]
}
```

## Fetch Available Rooms (Filtered Search)

Retrieves a list of non-conflicting rooms matching a specific time parameter block.

- Method: GET
- Endpoint: /api/rooms/available
- Authentication: Required (Bearer Token)
- Query Parameters:
  - date (format: YYYY-MM-DD)
  - time (format: HH:mm:ss)
  - durationHours (number)
  - Example URL: /api/rooms/available?date=2026-07-15&time=10:00:00&durationHours=2
- Request Body: None

Success Response (200 OK): Returns an array of functional rooms matching the parameters.

# 3. Booking Engine Endpoints (`/api/bookings`)

## Create Room Reservation
Books a room while executing overlap protection checks, group capacity thresholds, and duration enforcement parameters (minimum 1 hour).

- Method: POST
- Endpoint: /api/bookings
- Authentication: Required (Bearer Token)
- Request Body:

``` JSON
{
  "roomId": "room-group-alpha",
  "groupSize": 4,
  "startTime": "2026-07-15T10:00:00.000Z",
  "endTime": "2026-07-15T12:00:00.000Z"
}
```
Common Error Statuses:

`400 Bad Request`: Group capacity density falls under 50% threshold while smaller options are available, or duration is under 1 hour.

`409 Conflict`: The room is already booked during this time interval.

## Get User Booking History

Fetches a user's reservations, partitioned into past (used) and upcoming slots.

- Method: GET
- Endpoint: /api/users/bookings
- Authentication: Required (Bearer Token)
- Request Body: None

Success Response (200 OK):

``` JSON
{
  "userId": "u-1234-5678",
  "summary": { "totalBookedSlots": 2, "pastCount": 1, "upcomingCount": 1 },
  "pastBookings": [ /* Array of closed booking models */ ],
  "upcomingBookings": [ /* Array of pending/active booking models */ ]
}
```

# 4. Facility Maintenance Endpoints (`/api/tickets`)

## Log Facility Issue Ticket

Logs a broken item. If a critical room keyword is matched, the engine triggers an automated room isolation sequence.

- Method: POST
- Endpoint: /api/tickets
- Authentication: Required (Bearer Token)
- Request Body:

``` JSON
{
  "roomId": "room-group-alpha",
  "facility": "Smartboard",
  "description": "Screen will not turn on and glass panel is cracked."
}
```
Success Response (201 Created):

``` JSON
{
  "message": "Maintenance ticket logged successfully.",
  "ticket": {
    "id": "ticket-999",
    "roomId": "room-group-alpha",
    "facility": "Smartboard",
    "status": "OPEN"
  },
  "facilityTargeted": "Smartboard",
  "facilityStatusUpdated": "Marked OUT OF SERVICE"
}
```