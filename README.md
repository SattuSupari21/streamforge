# StreamForge

**StreamForge** is a scalable, production-grade backend for secure, adaptive video streaming, designed for modern web platforms and developer teams. It combines robust upload workflows, automated transcoding, manifest generation, signed URL access, and rich observability with a microservice architecture powered by Bun, PostgreSQL, MinIO, Redis, and Nginx.

## Features

- **Adaptive Streaming**: Automatic video transcoding to multiple resolutions, HLS manifest generation.
- **Secure Playback**: Time-limited signed URLs, Nginx proxy security, CORS and rate limiting.
- **Metadata Persistence**: PostgreSQL to track video status, ownership, and metadata.
- **Job Queues**: RabbitMQ manages transcoding workload distribution and reliability.
- **Fast Caching**: Redis for signed URL caching.
- **Centralized Logging**: Pino (app), Nginx (proxy), plus integrated monitoring hooks.
- **Authorization & Roles**: JWT-based authentication and role-based endpoint protections.
- **Containerized**: Docker Compose orchestrates multi-service deployment.
- **Extensible**: Designed for CI/CD, analytics, CDNs, advanced protocol support.

## ⚙️ Technology Stack

| Layer                 | Technologies                           |
| --------------------- | -------------------------------------- |
| **HTTP API**          | Bun, Express.js, TypeScript, Zod       |
| **Storage**           | MinIO (S3-compatible, Docker)          |
| **Queue / Messaging** | RabbitMQ (Docker)                      |
| **Video Processing**  | FFmpeg (Dockerized workers)            |
| **Reverse Proxy**     | Nginx                                  |
| **Auth & Security**   | JWT, Signed URLs                       |
| **Database**          | PostgreSQL (metadata), Redis (caching) |
| **Infra Automation**  | Docker Compose, Makefile               |

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Bun (for local development)
### Setup

1. Clone the repo:
```
git clone https://github.com/SattuSupari21/streamForge.git
cd streamForge
```

2. Configure `.env` files for all services (see `/example.env`), Key variables include: 
	- JWT secret
	- MinIO access/secret key
	- RabbitMQ credentials
	- Database settings
3. Run Migrations:
    - To create/update the database schema, run migrations with:
  ```
    cd db
    bun run migrate
  ```
4. Start using Make file:
```
make up
```
4. Access API Gateway at [http://localhost:3000](http://localhost:3000)
5. Access Nginx Secure Proxy at [http://localhost:8080](http://localhost:8080)

## Swagger API Documentation
This project includes automatically generated OpenAPI (Swagger) documentation for all supported REST API endpoints.

### Accessing the Documentation
```
http://localhost:3000/docs
```
This URL loads the interactive Swagger UI, which lets you:
- Browse all available API endpoints with detailed request and response schemas
- Test the APIs directly from the browser with live request execution
- View authentication requirements and supported operations

## API Gateway Endpoints

### Authentication

- `POST /auth/register` — Create an account (`username`, `password`, `role`)
- `POST /auth/login` — Obtain JWT token
### Video Ingestion & Management

- `POST /ingestion/upload/` — Upload video chunks (JWT required)
- `GET /videos/getVideoById/:videoId` — Get video metadata
- `GET /videos/getAllVideos` — List videos (pagination, search)
- `POST /videos/createVideo` — Register new video metadata
### Playback
- `GET /play/:videoId/manifest` — Signed master playlist URL (role protected)

## Security & Observability

- JWT auth enforced on upload and protected endpoints
- Secure signed URLs for private MinIO files
- Rate limiting and input validation on all key routes
- Logs: Pino (app), access/error logs (Nginx)

## Example CURL Commands
### 1. User Registration
```
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"yourpassword","role":"uploader"}'
```
### 2. User Login
```
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"yourpassword"}'
```
### 3. Video Upload (Authenticated as Uploader/Admin)
```
curl -X POST http://localhost/upload \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -F "file=@/path/to/video.mp4"
```
### 4. Get Manifest URL for Playback (Authenticated)
```
curl -X GET http://localhost:8080/play/my_video_123/manifest \
  -H "Authorization: Bearer {JWT_TOKEN}"
```
