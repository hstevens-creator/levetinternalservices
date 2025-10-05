# Levet CMS - Internal Services Platform

A comprehensive central management platform for Levet Media's advertising operations, managing OOH (Out-of-Home) and digital advertising across MiniBoards, DigiBoards, and vending machines.

## Overview

Levet CMS is the operational hub that enables the Levet Media team to:
- Manage clients, contracts, and campaigns in one centralized system
- Schedule and deploy advertisements across digital screens
- Track ad placements and automate status updates
- Control digital screens remotely via real-time web player
- Monitor campaign performance and screen status

## System Architecture

The system consists of three main components:

### 1. Backend Server (Node.js + Express)
- RESTful API with JWT authentication
- PostgreSQL database for data persistence
- Socket.io for real-time screen communication
- Automated cron jobs for placement status updates
- Role-based access control (admin, staff, viewer)

### 2. Web Admin Panel (Next.js + React)
- Modern, responsive dashboard interface
- Client and campaign management
- Placement scheduling and tracking
- Real-time screen monitoring
- Revenue and analytics reporting

### 3. Digital Screen Player (Raspberry Pi Compatible)
- Lightweight web-based player
- Real-time content updates via WebSocket
- Automatic playlist rotation
- Heartbeat monitoring
- Auto-start on boot capability

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, PostgreSQL, Socket.io |
| Frontend | Next.js (React 18), TypeScript, Tailwind CSS |
| Real-time | Socket.io (WebSocket) |
| Authentication | JWT, bcrypt |
| Scheduling | node-cron |
| Deployment | Docker Compose |

## Database Schema

### Core Tables
- **users**: User accounts with role-based permissions
- **clients**: Client information and contact details
- **screens**: Digital screen registry and status
- **placements**: Ad placement scheduling and tracking
- **campaigns**: Campaign content and configuration
- **events**: System event logging

## Features

### Client & Contract Management
- CRUD operations for clients
- Contact information storage
- Notes and contract tracking
- Campaign assignment

### Advert Placement Manager
- Create and manage placements for MiniBoard, DigiBoard, and Vending
- Automatic status updates (upcoming → active → completed)
- Filter by status, client, and region
- Price tracking and revenue reporting

### Digital Screen Control (DigiBoard CMS)
- Register and manage screens
- Real-time content push to screens
- Monitor online/offline status
- Playlist weighting and scheduling
- Instant updates via WebSocket

### Dashboard & Reporting
- Active campaigns and clients overview
- Screen occupancy monitoring
- Monthly revenue tracking
- Upcoming campaign expirations
- Real-time status updates

## Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+
- Docker and Docker Compose (recommended)

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/hstevens-creator/levetinternalservices.git
cd levetinternalservices
```

2. Start all services:
```bash
docker-compose up -d
```

3. Access the applications:
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Health: http://localhost:3000/api/health

### Manual Setup

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/levet_cms
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

5. Start PostgreSQL database

6. Start the backend server:
```bash
npm run dev
```

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

## API Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Clients
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client details
- `POST /api/clients` - Create new client (admin/staff)
- `PUT /api/clients/:id` - Update client (admin/staff)
- `DELETE /api/clients/:id` - Delete client (admin only)

### Placements
- `GET /api/placements` - List placements (with filters)
- `GET /api/placements/:id` - Get placement details
- `POST /api/placements` - Create placement (admin/staff)
- `PUT /api/placements/:id` - Update placement (admin/staff)
- `DELETE /api/placements/:id` - Delete placement (admin only)

### Screens
- `GET /api/screens` - List all screens
- `GET /api/screens/:id` - Get screen details
- `POST /api/screens` - Register new screen (admin/staff)
- `PUT /api/screens/:id` - Update screen (admin/staff)
- `DELETE /api/screens/:id` - Delete screen (admin only)
- `POST /api/screens/:id/heartbeat` - Update screen heartbeat

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign (admin/staff)
- `PUT /api/campaigns/:id` - Update campaign (admin/staff)
- `DELETE /api/campaigns/:id` - Delete campaign (admin only)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

All endpoints (except auth and heartbeat) require JWT authentication via `Authorization: Bearer <token>` header.

## Digital Screen Player Setup

See [screen-player/README.md](screen-player/README.md) for detailed setup instructions for Raspberry Pi and Linux devices.

Quick start:
1. Open `screen-player/index.html` in a web browser
2. Enter Screen ID and Player Key
3. Player will connect and start displaying content

## Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Database Migrations

The database schema is automatically initialized on first startup. To reset:
```bash
docker-compose down -v
docker-compose up -d
```

## Automated Tasks

### Cron Jobs
- **Placement Status Updates**: Runs every minute to update placement statuses based on dates
- **Offline Screen Detection**: Runs every minute to mark screens offline if no heartbeat for 2+ minutes

## Future Integrations

The system is designed to support future integrations:
- **VMR Sync**: Integration with Nayax Core API for vending machine data
- **Invoicing**: QuickFile or Zoho API integration
- **Stock Management**: Automated inventory tracking
- **Client Portal**: Allow clients to view campaigns and analytics

## Security

- JWT-based authentication with token expiry
- Password hashing with bcrypt
- Role-based access control (admin, staff, viewer)
- Environment variable configuration
- CORS protection
- SQL injection protection via parameterized queries

## License

Proprietary - Levet Media

## Support

For issues or questions, contact the development team or create an issue in the repository.

---

**Developed for Levet Media**  
Link to Devin run: https://app.devin.ai/sessions/b53ae2a4f1cf428d8498a80532876dce  
GitHub: @hstevens-creator
