# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack web application for Aquifer PE (Private Equity firm) internal business applications. It includes:
- **Frontend**: React 19 + TypeScript SPA with Vite, Tailwind CSS, React Router v7
- **Backend**: Express.js API server with PostgreSQL, Elasticsearch, and Google Drive integration
- **Applications**: Company database browser, client management, email campaign generator, freelancer search

## Development Commands

### Core Development
```bash
npm run dev           # Start frontend dev server (port 8080)
npm run dev:api       # Start backend API server (port 3000)
npm run dev:full      # Start both servers concurrently (recommended)
npm run server        # Alias for dev:api
```

### Build and Lint
```bash
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Run ESLint
```

### Testing and Utilities
No formal test framework configured. Use script-based testing and migrations:
```bash
npx tsx scripts/test-db.ts              # Test database connections
npx tsx scripts/test-api.ts             # Test API queries
npx tsx scripts/test-network.ts         # Test network connectivity
npx tsx scripts/migrate-auth.ts         # Migration script for auth schema
npx tsx scripts/migrate-verified.ts     # Migration script for verification
```

**Important**: Tests requiring network access to internal hosts (192.168.86.100) must be run in local terminal, not within Claude Code sandbox.

## Architecture Patterns

### Frontend Structure
- **Routing**: React Router v7 with protected routes and auth guard (`src/App.tsx:1-35`)
- **Authentication**: Context-based auth with token management (`src/context/AuthContext.tsx`)
- **Components**: Reusable UI components in `src/components/` (TopBar, Sidebar, Forms, Popups)
- **Pages**: Feature pages in `src/pages/` (CompanyPage, ClientPage, FreelancerPage, EmailCampaignPage, DashboardPage, LoginPage)
- **Types**: TypeScript definitions in `src/types/` (company, client, communication)
- **Utilities**: Database and search utilities in `src/lib/`

### Backend Structure
- **Server**: Express.js with middleware (CORS, morgan, JSON parsing) (`server/index.ts:39-41`)
- **Authentication**: JWT-based token auth with OTP verification (`server/index.ts:44-59, 64-100+`)
- **Database**: PostgreSQL connection pool singleton (`src/lib/database.ts`)
- **External Services**:
  - Elasticsearch for freelancer search (`server/index.ts:22-30`)
  - Google Drive/Sheets API for email campaigns (`server/lib/google-drive.ts`)
  - Email delivery via nodemailer (for OTP codes)
- **Security**: Encryption utilities for sensitive data (`server/lib/crypto.ts`)
- **File Upload**: Multer for CSV processing (`server/index.ts:35`)

### Data Flow
1. User logs in via OTP email verification at `/login`
2. Backend generates JWT token and sends OTP code via email
3. Frontend stores token in localStorage and sets Authorization header for API calls
4. Frontend makes authenticated API calls to `/api/*` endpoints
5. Vite proxy routes `/api` to `localhost:3000` (`vite.config.ts:16-20`)
6. Backend validates JWT token on protected endpoints using middleware
7. Backend queries PostgreSQL database using connection pool
8. Elasticsearch used for freelancer search functionality
9. React Query (TanStack) manages client-side data caching

### Database Design
- **Company table**: Core business entity with company details, linkedin URL, status, internal notes
- **Client table**: Individual contacts with company relationships, verified status, internal notes
- **Communication table**: Tracks client interactions (email/phone) with timestamps
- **verification_codes table**: OTP codes for email-based authentication
- Foreign key relationships and indexes for performance

## Environment Configuration

### Required Environment Variables
Copy `.env.example` to `.env` and configure:
```bash
# Database
DB_HOST=192.168.86.100          # Internal PostgreSQL host
DB_PORT=5432                    # PostgreSQL port
DB_NAME=aquiferpe               # Database name
DB_USER=aquifer_app             # Database user
DB_PASSWORD=...                 # Database password

# Frontend
VITE_API_URL=http://localhost:3000  # Backend API URL

# External Services
ELASTICSEARCH_NODE=http://192.168.86.100:9200  # Elasticsearch
GOOGLE_DRIVE_FOLDER_ID=...      # Google Drive folder for campaigns

# Authentication & Security
JWT_SECRET=...                  # Secret key for JWT token signing
ALLOWED_EMAILS=email1@domain;email2@domain  # Semicolon-separated allowed emails
ENCRYPTION_KEY=...              # Key for encrypting sensitive data (optional)

# Email Service
EMAIL_SERVICE=...               # Email provider (e.g., Gmail)
EMAIL_USER=...                  # Sender email address
EMAIL_PASSWORD=...              # Email service password or app-specific password
```

### Database Connection Notes
- PostgreSQL runs on internal host `192.168.86.100:5432`
- Connection pool configured with 20 max connections (`src/lib/database.ts:41`)
- Health check endpoint at `/api/health` (`server/index.ts:41-49`)

## API Endpoints

All endpoints (except auth) require JWT authentication via `Authorization: Bearer <token>` header.

### Authentication
```
POST   /api/auth/request-otp    # Request OTP code (body: {email})
POST   /api/auth/verify-otp     # Verify OTP and get JWT token (body: {email, code})
```

### Company Management
```
GET    /api/companies           # List with pagination (?page=1&limit=25)
GET    /api/companies/:id       # Get single company
GET    /api/companies/search    # Search companies (?q=term)
POST   /api/companies           # Create new company (authenticated)
PUT    /api/companies/:id       # Update company (authenticated)
```

### Client Management
```
GET    /api/clients             # List with pagination
GET    /api/clients/:id         # Get single client
POST   /api/clients             # Create new client (authenticated)
PUT    /api/clients/:id         # Update client (authenticated)
POST   /api/clients/:id/communication  # Add communication record
```

### Health Check
```
GET    /api/health              # Database connection status
```

### Email Campaigns
```
POST   /api/campaigns/upload    # Upload prospect CSV
GET    /api/campaigns/files     # List campaign files
POST   /api/campaigns/create    # Create campaign sheet
```

### Freelancer Search
```
GET    /api/freelancers/search  # Search freelancers (?q=term)
```

## Key Implementation Patterns

### Authentication Flow
- Email-based OTP verification: user enters email → backend sends OTP → user verifies code
- JWT token issued on successful verification, stored in localStorage
- Token included in Authorization header for all authenticated requests
- `ALLOWED_EMAILS` env var controls access (optional, if not set all emails allowed)

### Database Utility
- Singleton pattern with connection pooling (`src/lib/database.ts`)
- Transaction support with `db.transaction()` method
- Health check method for monitoring
- Used by all backend API endpoints for data persistence

### Frontend Authentication Guard
- `AuthContext` manages authentication state globally (`src/context/AuthContext.tsx`)
- `ProtectedRoute` component guards authenticated pages (`src/components/ProtectedRoute.tsx`)
- `useAuth()` hook provides access to auth state and methods throughout app

### API Error Handling
- Protected endpoints return 401 for missing/invalid tokens, 403 for invalid tokens
- Frontend captures auth errors and redirects to login page

### TypeScript Configuration
- Path alias `@/*` maps to `./src/*` (`vite.config.ts:10`)
- Strict TypeScript configuration with modern settings
- Type definitions for all major entities (Company, Client, Communication)

### Styling
- Tailwind CSS with custom color palette
- Responsive layout with top bar and sidebar
- Inter font family for typography

## Development Notes

### Network Access
- Internal services (PostgreSQL, Elasticsearch) at `192.168.86.100`
- Claude Code sandbox may not have network access to internal hosts
- Run network-dependent tests in local terminal

### File Structure Conventions
- Frontend components: `src/components/ComponentName.tsx`
- Page components: `src/pages/PageName.tsx`
- Type definitions: `src/types/resource.ts`
- Server utilities: `server/lib/utility.ts`
- Database schema: `database/*.sql`

### Recent Features (from git history)
1. Email-based OTP authentication system with JWT tokens
2. Allowed emails list for access control
3. Freelancer search capability (Elasticsearch integration)
4. Communication records tracking
5. Email campaign feature with Google Sheets
6. Client/company management with status and internal notes
7. LinkedIn URLs stored on companies and clients
8. Verified status tracking for clients