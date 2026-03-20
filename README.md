# Aquifer PE Internal Apps

This repo hosts Aquifer PE internal applications.

## Applications

### App 1: Company Database
- A database to browse company records

### App 2: Email Campaign Generator
- Read from a list of prospect records, from a CSV, a spreadsheet, or a database. A prospect record should at the minimum contains prospect first name, company name, and email address
- Generate unique links for the about page based on the email address in order to track which prospect visits the site
- Save the records to a Google sheet

## Development

A skeleton web application has been created with the following features:
- Modern React + TypeScript + Vite frontend
- Tailwind CSS for styling with minimalistic design
- Responsive layout with top navigation bar and sidebar
- Placeholder pages for Company Database and Email Campaign Generator
- Inter font family for modern typography

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:8080`

### Project Structure

- `/src/components/` - Reusable UI components (Layout, TopBar, Sidebar)
- `/src/pages/` - Page components (CompanyPage, EmailCampaignPage)
- `/public/` - Static assets (logo, favicon)
- Configuration files in root (vite, TypeScript, Tailwind, ESLint)

### Design Features

- **Top Bar**: Contains Aquifer PE logo and application title
- **Sidebar**: Left-aligned navigation with Company and Email Campaign menu items
- **Responsive**: Adapts to different screen sizes
- **Modern UI**: Clean, minimalistic design with consistent spacing and typography
- **Placeholder Content**: Demonstrates the intended functionality for both applications

### Database Setup

The application includes a PostgreSQL database utility class for connecting to the Aquifer PE database.

1. **Copy environment variables template:**
   ```bash
   cp .env.example .env
   ```

2. **Update the `.env` file with your database credentials:**
   - Set `DB_PASSWORD` to the database password (provided separately)
   - Adjust other database settings if needed (host, port, etc.)

3. **Install database dependencies:**
   ```bash
   npm install
   ```

4. **Database utility usage:**
   ```typescript
   import { db } from './src/lib/database'

   // Execute a query
   const result = await db.query('SELECT * FROM company')

   // Use transactions
   await db.transaction(async (client) => {
     await client.query('INSERT INTO company (...) VALUES (...)')
   })

   // Check database health
   const isHealthy = await db.healthCheck()
   ```

The database utility provides connection pooling, transaction management, and health checks.

### Database Connection Troubleshooting

If you encounter connection errors:

**Note:** Tests run within Claude Code may not have network access to internal hosts. Run tests in your local terminal instead.

1. **Verify PostgreSQL is running on 192.168.86.100:5432**
   ```bash
   # Check if the host is reachable (run in local terminal)
   ping 192.168.86.100

   # Check if port 5432 is open (requires netcat)
   nc -zv 192.168.86.100 5432
   ```

2. **Check PostgreSQL configuration**
   - Ensure PostgreSQL is listening on the correct interface (`postgresql.conf`: `listen_addresses = '*'`)
   - Verify `pg_hba.conf` allows connections from your IP
   - Restart PostgreSQL after configuration changes

3. **Test connection manually with psql**
   ```bash
   PGPASSWORD="aquiferpe1Success11!" psql -h 192.168.86.100 -p 5432 -U aquifer_app -d aquiferpe
   ```

4. **Run the database test script (in local terminal)**
   ```bash
   # Run from project root in your local terminal (not in Claude Code)
   npx tsx scripts/test-db.ts
   ```

5. **Common error messages:**
   - `EHOSTUNREACH`: Host is not reachable (check network/firewall, or run test locally)
   - `ECONNREFUSED`: PostgreSQL not running or not listening on port
   - `password authentication failed`: Incorrect password
   - `database "aquiferpe" does not exist`: Database needs to be created

### Database Schema Note

The `database/db.sql` file contains MySQL syntax. For PostgreSQL, you'll need to:
- Change `AUTO_INCREMENT` to `SERIAL` or `BIGSERIAL`
- Adjust data types as needed

### API Documentation

A backend API has been implemented for the company database with pagination support.

#### Running the API Server

```bash
# Start the API server only
npm run dev:api

# Start both frontend and API servers
npm run dev:full
```

The API server runs on `http://localhost:3000` by default.

#### Environment Variables

The frontend needs to know the API URL. This is configured via the `VITE_API_URL` environment variable in `.env`:

```bash
# .env file
VITE_API_URL=http://localhost:3000
```

If you change the API server port, update this variable accordingly.

#### API Endpoints

##### Health Check
```
GET /api/health
```
Returns database connection status.

##### List Companies (with pagination)
```
GET /api/companies?page=1&limit=25
```
**Parameters:**
- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 25, max: 100

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "company_name": "Example Corp",
      "location": "San Francisco, CA",
      "size": 500,
      "overview": "Example company overview",
      "website": "https://example.com",
      "industry": "Technology",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1247,
    "totalPages": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

##### Get Single Company
```
GET /api/companies/:id
```

##### Search Companies
```
GET /api/companies/search?q=searchTerm&page=1&limit=25
```
Searches company_name and industry fields (case-insensitive).

#### Testing the API

```bash
# Test database queries used by the API
npx tsx scripts/test-api.ts

# Start the server and test endpoints
npm run dev:api
# Then in another terminal:
curl http://localhost:3000/api/companies
curl http://localhost:3000/api/companies?page=2&limit=10
curl http://localhost:3000/api/companies/search?q=tech
```

**Note:** Tests requiring network access to internal hosts should be run in your local terminal, not within Claude Code.

### Next Steps

- Add Google Sheets integration for email campaigns
- Implement prospect list upload and processing
- Add authentication and user management
- Deploy to production environment