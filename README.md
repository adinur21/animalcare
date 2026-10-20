# AnimalCare

AnimalCare is a full-stack animal management application built with Node.js, Express, PostgreSQL, React, and Vite. It includes animal CRUD operations, dashboard analytics, and AWS-ready storage integrations for S3 uploads.
This app use for UUK exam.
## Stack

- Runtime: Node.js LTS
- Backend: Express.js
- Frontend: React + Vite
- Styling: Tailwind CSS
- Database: PostgreSQL
- Object storage: Amazon S3
- Validation: Zod
- Database driver: pg
- Upload handling: Multer

## Project structure

- `server/src` — Express API source
- `server/database` — SQL migration and schema files
- `server/scripts` — migration and seed scripts
- `client/src` — React frontend source
- `.env.example` — environment configuration examples

## Local development

1. Copy `.env.example` to `.env` and update values.
2. Create a PostgreSQL database and user for the project.
3. Run the database migration:

   npm run migrate

4. Seed sample data:

   npm run seed

5. Start the app in development mode:

   npm run dev

The backend runs at `http://localhost:5000` by default, and the Vite client runs on the default frontend port.

## Available scripts

- `npm run dev` — starts the backend and frontend together
- `npm run dev:server` — runs Express with nodemon
- `npm run dev:client` — runs Vite client
- `npm run migrate` — applies schema migration
- `npm run seed` — inserts demo data
- `npm run build` — creates production frontend bundle
- `npm start` — runs the production backend

## API endpoints

- `GET /api/health`
- `GET /api/animals`
- `GET /api/animals/:id`
- `POST /api/animals`
- `PUT /api/animals/:id`
- `DELETE /api/animals/:id`
- `GET /api/dashboard/stats`

## AWS deployment notes

- Deploy the React build to an S3 static website or use a reverse proxy in front of the API server.
- Host the backend on EC2 or ECS/EKS with systemd-based process management.
- Place PostgreSQL on Amazon RDS for PostgreSQL.
- Use S3 bucket with Block Public Access enabled and server-side encryption.
- Use presigned URLs for private asset access.
- Keep database credentials and AWS credentials in environment variables or AWS Secrets Manager, not in the source code.

## Security notes

- Do not store database passwords or AWS secrets directly in source files.
- Keep the S3 bucket private by default.
- Validate all uploaded file types and sizes before storing metadata in the database.
- Use parameterized SQL queries to avoid injection.
