# AnimalCare

AnimalCare is a full-stack animal management application built with Node.js, Express.js, PostgreSQL, React, and Vite. The project is designed for local development and AWS deployment, with image uploads stored in Amazon S3 and animal records persisted in Amazon RDS PostgreSQL.

This app is intended for deployment on AWS and can be used as a project submission or learning reference for cloud-based application deployment.

## Stack

- Runtime: Node.js LTS
- Backend: Express.js
- Frontend: React + Vite
- Styling: Tailwind CSS
- Database: PostgreSQL
- Object storage: Amazon S3
- Validation: Zod
- Database driver: `pg`
- Upload handling: `multer`
- AWS SDK: AWS SDK v3

## Project structure

- `server/src` — Express API source
- `server/database` — SQL migration and schema files
- `server/scripts` — migration and seed scripts
- `client/src` — React frontend source
- `.env.example` — example environment variables
- `.env` — local environment (not committed to Git)

## Local development

1. Create a PostgreSQL database locally.
2. Copy `.env.example` to `.env` and update the variable values.
3. Run database migration:

   ```bash
   npm run migrate
   ```

4. Seed sample data:

   ```bash
   npm run seed
   ```

5. Start the app in development mode:

   ```bash
   npm run dev
   ```

The backend runs at `http://localhost:5000`, and the Vite frontend runs on its default development port.

## Available scripts

- `npm run dev` — runs the backend and frontend together
- `npm run dev:server` — runs the Express API with nodemon
- `npm run dev:client` — runs the React frontend with Vite
- `npm run migrate` — executes the SQL migration
- `npm run seed` — inserts demo dataset
- `npm run build` — creates the production frontend bundle
- `npm start` — runs the backend in production mode

## API endpoints

- `GET /api/health`
- `GET /api/animals`
- `GET /api/animals/:id`
- `POST /api/animals`
- `PUT /api/animals/:id`
- `DELETE /api/animals/:id`
- `GET /api/dashboard/stats`

## AWS deployment guide (Amazon Linux 2023 EC2)

This project is intended to run on an Amazon Linux 2023 EC2 instance and use:

- EC2: application host
- Amazon RDS for PostgreSQL: database server
- Amazon S3: image storage
- Nginx: reverse proxy
- Systemd: app process manager

### 1. Create AWS resources

#### EC2 instance

- AMI: Amazon Linux 2023
- Instance type: `t3.small` or larger
- Security group:
  - SSH: port `22` from your IP
  - HTTP: port `80` from `0.0.0.0/0`
  - HTTPS: port `443` from `0.0.0.0/0`

#### Amazon RDS PostgreSQL

- Create a PostgreSQL database in RDS
- Database name: `animalcare`
- Tipe: PostgreSQL
- Make sure the security group allows EC2 access to port `5432`
- Disable public access unless you intentionally need it

#### Amazon S3 bucket

- Create a private S3 bucket for animal images
- Enable Block Public Access
- Enable server-side encryption (SSE-S3 or SSE-KMS)
- Keep bucket private by default
- Use presigned URLs for private image access

### 2. Prepare the EC2 instance

SSH into the EC2 instance:

```bash
ssh -i your-key.pem ec2-user@<PUBLIC_IP>
```

Update the system and install required packages:

```bash
sudo dnf update -y
sudo dnf install -y git nginx curl
```

Install Node.js 20 LTS on Amazon Linux 2023:

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
node -v
npm -v
```

### 3. Clone the project and install dependencies

```bash
cd /home/ec2-user
git clone <YOUR_GITHUB_REPO_URL> animalcare
cd animalcare
npm install
npm --prefix client install
npm --prefix client run build
```

### 4. Configure environment variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
nano .env
```

Use values such as:

```env
PORT=5000
NODE_ENV=production
DB_HOST=<RDS_ENDPOINT>
DB_PORT=5432
DB_NAME=animalcare
DB_USER=animalcare_admin
DB_PASSWORD=<DATABASE_PASSWORD>
DB_SSL=true
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=<YOUR_S3_BUCKET_NAME>
```

Important:

- Do not commit the real `.env` file to GitHub.
- Prefer IAM roles on EC2 over hardcoded AWS credentials when possible.
- Use AWS Secrets Manager if you want a more secure production setup.

### 5. Run database migration and seed data

```bash
npm run migrate
npm run seed
```

### 6. Run the application with systemd

Create the service file:

```bash
sudo nano /etc/systemd/system/animalcare.service
```

Then add:

```ini
[Unit]
Description=AnimalCare backend service
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/animalcare
EnvironmentFile=/home/ec2-user/animalcare/.env
ExecStart=/usr/bin/node /home/ec2-user/animalcare/server/src/index.js
Restart=always
RestartSec=5
StandardOutput=append:/var/log/animalcare.log
StandardError=append:/var/log/animalcare.err

[Install]
WantedBy=multi-user.target
```

Reload and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable animalcare
sudo systemctl start animalcare
sudo systemctl status animalcare
```

Check health:

```bash
curl http://localhost:5000/api/health
```

### 7. Configure Nginx as a reverse proxy

Create a site configuration:

```bash
sudo nano /etc/nginx/conf.d/animalcare.conf
```

Add:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and test Nginx:

```bash
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl restart nginx
```

### 8. Configure SSL (recommended)

Use HTTPS with a domain and certificate:

```bash
sudo dnf install -y epel-release
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

This will automatically configure HTTPS and redirect HTTP to HTTPS.

### 9. Security configuration

- Enable S3 Block Public Access
- Keep S3 bucket private
- Enable encryption at rest
- Use IAM roles instead of static credentials when possible
- Limit RDS access to only the EC2 security group
- Keep `.env` outside Git and outside public directories
- Use AWS Secrets Manager for credentials in production environments

### 10. Production checklist

Before going live, confirm:

- EC2 instance is running Amazon Linux 2023
- `systemctl status animalcare` is active
- `curl http://localhost:5000/api/health` returns success
- Nginx is serving the app on port 80/443
- PostgreSQL is reachable from EC2
- S3 upload works
- Images are deleted correctly when an animal record is removed

## Security notes

- Do not store database passwords or AWS secrets directly in source files.
- Keep the S3 bucket private by default.
- Validate uploaded image format and file size before storing metadata.
- Use parameterized SQL queries to avoid SQL injection.
- Use presigned URLs for private file access.
- Use IAM permissions with the least privilege principle.

## Deployment summary

The recommended production architecture for AnimalCare is:

- EC2 Amazon Linux 2023 with Node.js + systemd
- RDS PostgreSQL managed database
- S3 bucket for private image storage
- Nginx reverse proxy with SSL
- GitHub repository as source control
