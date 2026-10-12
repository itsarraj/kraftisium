# 🚀 Universal Auth Service (UAS)

A **production-ready, enterprise-grade authentication microservice** built with **Rust**, **PostgreSQL**, and **Redis**. Designed for microservices architectures with JWT-based authentication, role-based access control, and comprehensive security features.

[![Rust](https://img.shields.io/badge/Rust-1.85+-000000?style=for-the-badge&logo=rust)](https://www.rust-lang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-6+-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=json-web-tokens)](https://jwt.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

## ✅ What this service gives you (in plain words)

UAS is a **central authentication service** you run once and reuse across all your applications/services.

- **Your apps stop storing passwords or issuing tokens** — they call UAS for auth flows (register/login/refresh/logout) and then use the returned **JWT access token** to protect their own APIs.
- **PostgreSQL stores permanent identity data** (users, refresh token fingerprints, token blacklist rows).
- **Redis handles fast/temporary auth data** (login rate limiting, user profile cache, blacklist cache for revoked refresh tokens).

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🔧 Prerequisites](#-prerequisites)
- [⚡ Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🚀 Usage](#-usage)
- [📚 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🐳 Docker Deployment](#-docker-deployment)
- [🔒 Security](#-security)
- [📊 Monitoring & Health Checks](#-monitoring--health-checks)
- [🔧 Development](#-development)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## ✨ Features

### 🔐 Core Authentication
- ✅ **User registration** with **Resend**-sent verification email (and token returned in API response today)
- ✅ **JWT access tokens** + **opaque refresh tokens** (stored as fingerprints; rotation on refresh)
- ✅ **Password reset** request + confirm (reset link points at `frontend_base_url`)
- ✅ **Email verification** via link to this service (`GET /api/v1/auth/verify-email/{token}`)
- ✅ **Logout** revokes the presented refresh token (blacklist + delete); access JWT relies on TTL unless you extend blacklisting

### 👥 User Management
- ✅ **Profile management** (view/update profile; optional `name` / `email` in PUT body)
- ✅ **Password change** with current password verification
- ✅ **Roles** stored on the user row (`user`, `admin`, `moderator`, `recruiter` per DB check); JWT carries `role`; admin route checks `role == "admin"`
- ✅ **Redis caching** of user profile payloads (`user:{uuid}`) plus optional session helpers in `cache.rs` (not exposed as HTTP routes yet)

### 🛡️ Security Features
- ✅ **bcrypt** password hashing
- ✅ **JWT** access tokens (expiry from config) + **one-time refresh** rotation
- ✅ **Login rate limiting** (Redis; 5 failures / 15 minutes per email)
- ✅ **Refresh token blacklist** on logout (Postgres + Redis)
- ✅ **CORS** middleware (permissive defaults — tighten for production)
- ✅ **Parameterized SQL** via sqlx

### 🚀 Performance & Scalability
- ✅ **Redis Caching** for high performance
- ✅ **Connection Pooling** (PostgreSQL + Redis)
- ✅ **Horizontal Scaling** ready
- ✅ **Stateless Design** for microservices
- ✅ **Health Monitoring** with detailed metrics

### 🏢 Production Ready
- ✅ **Structured configuration** (`configuration.yaml` + `APP_*` environment overrides)
- ✅ **SQL schema** in `migrations/` (apply with `psql` or your migration runner)
- ✅ **API Documentation** (Postman collection in repo root)
- ✅ **Dockerfile** for container builds (`binary: uas`)
- ⚠️ **Automated tests** are not present in this tree yet; verify flows manually or add `cargo test` coverage as you extend the service

## 🏗️ Architecture

### 3-Layer Architecture Pattern

```
┌─────────────────┐  ← HTTP Layer
│   Handlers      │  • HTTP request/response
│   (actix-web)   │  • Input validation
│                 │  • Error formatting
└─────────────────┘

         ↓ (calls)

┌─────────────────┐  ← Business Logic Layer
│   Services      │  • Authentication logic
│                 │  • Business rules
│                 │  • Orchestration
└─────────────────┘

         ↓ (uses)

┌─────────────────┬─────────────────┐  ← Data Layer
│  Repository     │   Cache         │  • PostgreSQL: persistence
│  (PostgreSQL)   │   (Redis)       │  • Redis: performance
│                 │                 │  • Connection pooling
└─────────────────┴─────────────────┘
```

### Technology Stack

- **Backend**: Rust (edition 2024, **actix-web**)
- **Database**: PostgreSQL 13+ via **sqlx** (data persistence)
- **Cache**: Redis 6+ (**redis** crate, async connection manager)
- **Security**: JWT access tokens (HS256) + **bcrypt** password hashes; opaque refresh tokens stored as keyed SHA-256 fingerprints
- **Email**: [**Resend**](https://resend.com/) HTTP API (**resend-rs**); verification links hit this service; reset links use `email.frontend_base_url` when set
- **Container**: multi-stage **Dockerfile** (Debian bookworm slim runtime)

## 🔧 Prerequisites

### System Requirements
- **Rust**: **1.85 or higher** (project uses **edition 2024**)
- **PostgreSQL**: 13 or higher
- **Redis**: 6 or higher
- **Docker**: Optional (for containerized deployment)

**Why you need these:**
- **Rust** compiles and runs the service.
- **PostgreSQL** is the source of truth for user accounts and refresh tokens (permanent data).
- **Redis** keeps auth fast and safe under load (rate limiting + caching + blacklist).

### Install Dependencies

#### macOS (using Homebrew)
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install PostgreSQL
brew install postgresql
brew services start postgresql

# Install Redis
brew install redis
brew services start redis

# Verify installations
rustc --version
psql --version
redis-cli --version
```

#### Ubuntu/Debian
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server

# Start services
sudo systemctl start postgresql
sudo systemctl start redis-server

# Verify installations
rustc --version
psql --version
redis-cli --version
```

#### Arch Linux
```bash
# Rust (recommended: rustup; keeps a current toolchain)
sudo pacman -S --needed base-devel curl
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# PostgreSQL and Redis
sudo pacman -S postgresql redis

# First-time PostgreSQL data directory (skip if /var/lib/postgres/data already exists)
sudo -u postgres initdb -D /var/lib/postgres/data

# Start and enable on boot
sudo systemctl enable --now postgresql
sudo systemctl enable --now redis

# Verify installations
rustc --version
psql --version
redis-cli --version
```

On Arch, the PostgreSQL superuser is the system user `postgres`. Create your app DB user/database with `sudo -u postgres psql` (or use `createuser` / `createdb` as that user) instead of assuming a Debian-style `postgres` UNIX socket login as your normal user.

## ⚡ Quick Start

If you do only one section, do this one. It gets you from zero → running API.

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd universal-auth-service

# Copy environment configuration
cp example.configuration.yaml configuration.yaml
# Edit configuration.yaml: database user/password, jwt.secret, email.api_key (Resend), etc.
```

**What this does:** downloads the code and creates your local `configuration.yaml`.  
**Expected result:** you have a config file in the repo root that the service reads on startup (overridable with `APP_*` env vars — see **Configuration** below).

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb uas

# Apply schema (canonical — matches the Rust repositories)
psql -U YOUR_USER -d uas -f migrations/001_initial_schema.sql
```

**What this does:** creates the DB schema (tables + indexes) for users, refresh token hashes, and token blacklist.  
**Expected result:** migration finishes without errors and tables `users`, `refresh_tokens`, and `token_blacklist` exist.

**Note:** `database_migration.sql` in the repo root is an older, broader script (extra optional tables such as `user_sessions`). The running code is aligned with **`migrations/001_initial_schema.sql`** — use that for new deployments unless you intentionally maintain the legacy script.

### 3. Start Services
```bash
# Make sure PostgreSQL and Redis are running
brew services start postgresql  # macOS
brew services start redis       # macOS

# OR for Linux (Debian/Ubuntu)
sudo systemctl start postgresql
sudo systemctl start redis-server

# OR for Arch Linux
sudo systemctl start postgresql
sudo systemctl start redis
```

**What this does:** starts your dependencies (PostgreSQL + Redis).  
**Expected result:** `psql` can connect and `redis-cli ping` returns `PONG`.

### 4. Run the Application
```bash
# Development mode
cargo run

# Production mode
cargo build --release
./target/release/uas
```

**What this does:** compiles and starts the HTTP server (default port 8000).  
**Expected result:** logs show successful connections to PostgreSQL + Redis and the server starts.

### 5. Test the API
```bash
# Health check
curl http://127.0.0.1:8000/api/v1/health

# Should return:
# {
#   "status": "Healthy",
#   "timestamp": "...",
#   "version": "0.1.0",
#   "uptime": 0,
#   "components": [...]
# }
```

**What this does:** verifies the whole stack works (HTTP + DB + Redis).  
**Expected result:** HTTP 200 with component statuses (database/redis) and response times.

## 📦 Installation

### Option 1: Local Development
```bash
# Clone repository
git clone <repository-url>
cd universal-auth-service

# Install dependencies
cargo build

# Start development server (binary package name: uas)
cargo run
```

There is **no** `tests/` suite or `#[test]` modules in the current source tree; add tests under `src/` or `tests/` when you extend the service.

### Option 2: Docker Deployment
```bash
# Build Docker image
docker build -t universal-auth-service .

# Run (publish port, mount config if you do not bake secrets into the image)
docker run --rm -p 8000:8000 \
  -v "$(pwd)/configuration.yaml:/app/configuration.yaml:ro" \
  universal-auth-service
```

Docker Compose lives at the repo root: `compose.base.yml` plus `compose.dev.yml`, `compose.prod.yml`, or `compose.host-edge.yml`. See [docker/README.md](../docker/README.md).

### Option 3: Pre-built Binary
```bash
# Download latest release
wget https://github.com/your-org/universal-auth-service/releases/latest/download/uas-linux-x64.tar.gz

# Extract and run
tar -xzf uas-linux-x64.tar.gz
./uas
```

## ⚙️ Configuration

UAS reads **`configuration.yaml`** and merges **environment variable overrides** with prefix **`BFF`**, nested keys use **`__`** (double underscore).

[`dotenvy`](https://docs.rs/dotenvy) loads a **`.env`** file on startup if present, so you can place secrets there locally without committing them.

### Environment variable overrides (`BFF__*`)

Examples (maps to the same fields as `configuration.yaml`):

```bash
# Application
export BFF__APPLICATION_HOST=127.0.0.1
export BFF__APPLICATION_PORT=8000

# Database
export BFF__DATABASE__HOST=127.0.0.1
export BFF__DATABASE__PORT=5432
export BFF__DATABASE__USERNAME=seekers
export BFF__DATABASE__PASSWORD=secret
export BFF__DATABASE__DATABASE_NAME=bff

# Redis
export BFF__REDIS__HOST=127.0.0.1
export BFF__REDIS__PORT=6379

# JWT
export BFF__JWT__SECRET=your-super-secret-jwt-key-change-this-in-production

# Email (Resend) — verification/reset links use frontend_base_url
export BFF__EMAIL__API_KEY=re_...
export BFF__EMAIL__FROM_EMAIL=noreply@yourdomain.com
export BFF__EMAIL__FROM_NAME="Kraftisium"
export BFF__EMAIL__BASE_URL=https://api.kraftisium.xyz
export BFF__EMAIL__FRONTEND_BASE_URL=https://kraftisium.xyz

export RUST_LOG=info
```

Docker Compose sets `DATABASE_URL` for migrations; runtime uses `BFF__*` keys above.

### Configuration File (`configuration.yaml`)

Start from **`example.configuration.yaml`** (Docker-oriented defaults) or match the shape below:

```yaml
application_host: "127.0.0.1"
application_port: 8000

database:
  host: "127.0.0.1"
  port: 5432
  username: "cesium"
  password: ""
  database_name: "uas"

redis:
  host: "127.0.0.1"
  port: 6379
  password: null
  database: null

jwt:
  secret: "your-super-secret-jwt-key-change-this-in-production"
  access_token_expiration_hours: 24
  refresh_token_expiration_days: 30

email:
  api_key: "re_..." # Resend API key
  from_email: "noreply@example.com"
  from_name: "Universal Auth Service"
  base_url: "http://127.0.0.1:8000"           # used for email verification URLs
  frontend_base_url: "http://localhost:5173"  # used for password reset links (optional; defaults to base_url)
```

**How to think about these settings:**
- `database.*` must match your Postgres instance (the app builds a `postgres://…` URL internally).
- `redis.*` must match your Redis instance.
- `jwt.secret` must be the **same across all UAS instances** behind a load balancer (it is also mixed into refresh-token fingerprints — changing it invalidates stored refresh rows).
- `email.*`: without a valid **Resend** API key, registration still succeeds but verification/reset emails may fail (errors are logged).

### Security Notes

- **NEVER** commit JWT secrets to version control
- Use strong, randomly generated secrets in production
- Rotate JWT secrets periodically
- Use environment variables for sensitive configuration

## 🚀 Usage

### Starting the Service

```bash
# Development
cargo run

# Production
cargo build --release
./target/release/uas

# Docker
docker run -p 8000:8000 universal-auth-service
```

### Health Check

```bash
curl http://127.0.0.1:8000/api/v1/health
```

### Basic Authentication Flow

```bash
# 1. Register a new user
curl -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "user"
  }'

# 2. Verify email (use token from registration response)
curl http://127.0.0.1:8000/api/v1/auth/verify-email/YOUR_TOKEN_HERE

# 3. Login
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# 4. Use protected endpoints with JWT token
curl -X GET http://127.0.0.1:8000/api/v1/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**What’s happening in this flow (why it matters):**
- **Register** writes the user into Postgres, sends a verification email via **Resend** (if configured), and returns `email_verification_token` in the JSON response as well (tighten this in production if you do not want the token in the API body).
- **Verify email** flips `email_verified=true` so the account is allowed to log in.
- **Login** returns:
  - an **access token (JWT, HS256)** for `Authorization: Bearer …`
  - an **opaque refresh token** (random string, not a JWT) whose **keyed SHA-256 fingerprint** is stored in Postgres; **refresh** rotates it (one-time use)
- **Protected endpoints** require `Authorization: Bearer <access_token>`.
- **Logout** requires `Authorization: Bearer <access_token>` **and** a JSON body with `refresh_token`; the server revokes that refresh token (Postgres blacklist + Redis) and deletes it from `refresh_tokens`. Immediate revocation of the **access** JWT is not implemented — rely on a short access TTL or extend the service to blacklist access tokens explicitly.

## 📚 API Documentation

### Base URL
```
http://127.0.0.1:8000/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| GET | `/auth/verify-email/{token}` | ❌ | Verify email address |
| POST | `/auth/login` | ❌ | User login |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| POST | `/auth/logout` | ✅ | User logout |
| POST | `/auth/password-reset` | ❌ | Request password reset |
| POST | `/auth/password-reset/confirm` | ❌ | Confirm password reset |

### User Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/user/profile` | ✅ | Get user profile |
| PUT | `/user/profile` | ✅ | Update user profile |
| POST | `/user/change-password` | ✅ | Change password |

### Admin Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/admin/users` | ✅ (JWT, `role: admin`) | **Placeholder** — returns JSON indicating user management is not implemented yet; still enforces `admin` in token claims |

### System Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/health` | ❌ | System health check |

### Complete API Documentation

📋 **Postman Collection**: Import `universal-auth-service.postman_collection.json`

**Tip:** run requests in order (register → verify → login → user endpoints). The collection stores tokens in variables automatically.

### Request/Response Examples

#### Registration Request
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "user"
}
```

#### Login Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "opaqueRandomStringNotAJwt",
  "user": {
    "id": "uuid-here",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user",
    "email_verified": true,
    "created_at": "2024-01-30T10:00:00"
  },
  "expires_in": 86400
}
```

`expires_in` is **seconds** until access token expiry (`access_token_expiration_hours × 3600`). `created_at` is serialized from PostgreSQL `TIMESTAMP` (naive local wall time in DB; format may vary slightly by serializer).

#### Error Response
```json
{
  "error": "InvalidCredentials",
  "message": "Invalid email or password"
}
```

## 🧪 Testing

### Automated tests

There are **no** Rust `#[test]` modules or `tests/*.rs` integration tests in this repository yet. Running `cargo test` will succeed but only exercises the empty default test harness until you add coverage.

### Manual testing

Use the Postman collection (`universal-auth-service.postman_collection.json`) or the `curl` examples in this README.

### Load testing

```bash
# Install hey (load testing tool)
go install github.com/rakyll/hey@latest

# Test health endpoint
hey -n 1000 -c 10 http://127.0.0.1:8000/api/v1/health

# Test authentication endpoint
hey -n 500 -c 5 -m POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  http://127.0.0.1:8000/api/v1/auth/login
```

## 🐳 Docker Deployment

The **`Dockerfile`** builds release binary **`uas`**, copies `configuration.yaml` from the build context, and copies **`migrations/`** for operational reference. The container **healthcheck** calls `GET /api/v1/health`.

### Docker Compose (repo root)

See [docker/README.md](../docker/README.md) and `compose.base.yml` + overlay files. Example BFF service env:

```yaml
services:
  bff:
    build: ./bff
    environment:
      BFF__APPLICATION_HOST: "0.0.0.0"
      BFF__DATABASE__HOST: postgres
      BFF__DATABASE__USERNAME: seekers
      BFF__DATABASE__PASSWORD: ${POSTGRES_PASSWORD}
      BFF__REDIS__HOST: redis
      BFF__JWT__SECRET: ${JWT_SECRET}
      BFF__EMAIL__API_KEY: ${BFF__EMAIL__API_KEY}
      BFF__EMAIL__FRONTEND_BASE_URL: ${PUBLIC_WEB_URL}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: uas
      POSTGRES_USER: uas
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations/001_initial_schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

### Docker commands (if you add compose locally)

```bash
docker compose up --build
docker compose up -d
docker compose logs -f uas
docker compose down
```

## 🔒 Security

### Password security
- **bcrypt** password hashing via the **`bcrypt`** crate using its **default cost** (typically 12 rounds)
- **Minimum password length** of **8** characters on register, reset, and change-password paths
- No additional complexity rules (length-only check in `AuthService`)

### JWT and refresh tokens
- **Access tokens**: JWT, **HS256**, claims include `sub` (user id), `email`, `role`, `exp`, `iat`
- **Refresh tokens**: **opaque** random strings; only a **keyed SHA-256 fingerprint** (secret + token) is persisted
- **Refresh rotates** the refresh token (old DB row deleted, new one inserted)
- **Logout** blacklists the **refresh** token fingerprint (Postgres + Redis TTL) and removes the refresh row; access JWTs are not blacklisted unless you extend the code (see handler comment in `src/module/auth/handler.rs`)

### Rate limiting
- **Failed login attempts** per email: **5** failures within a **15-minute** Redis window (`login_attempts:{email}`)
- No global per-route HTTP rate limiting middleware in this codebase yet

### Input and data access
- **SQL injection**: queries use **sqlx** parameter binding
- **CORS**: `src/middleware/cors.rs` allows local dev origins plus `BFF__EMAIL__FRONTEND_BASE_URL` (set from `PUBLIC_WEB_URL` in Docker)
- Treat **JWT secret**, **database credentials**, and **Resend API keys** as secrets (env or secret store)

### Production Security Checklist

- [ ] **HTTPS only** (SSL/TLS certificates)
- [ ] **Secure JWT secrets** (environment variables)
- [ ] **Database encryption** (at rest)
- [ ] **Network security** (firewalls, VPC)
- [ ] **Regular security audits**
- [ ] **Dependency updates** (cargo audit)
- [ ] **Rate limiting** enabled
- [ ] **CORS properly configured**
- [ ] **Logging and monitoring** active

## 📊 Monitoring & Health Checks

### Health Check Endpoint

```bash
curl http://127.0.0.1:8000/api/v1/health
```

**Response:**
```json
{
  "status": "Healthy",
  "timestamp": "2024-01-30T10:00:00Z",
  "version": "0.1.0",
  "uptime": 3600,
  "components": [
    {
      "name": "database",
      "status": "Healthy",
      "response_time_ms": 5,
      "last_checked": "2024-01-30T10:00:00Z"
    },
    {
      "name": "redis",
      "status": "Healthy",
      "response_time_ms": 1,
      "last_checked": "2024-01-30T10:00:00Z"
    }
  ]
}
```

### Metrics to Monitor

- **Response Time**: API endpoint latency
- **Error Rate**: 5xx error percentage
- **Authentication Success**: Login success rate
- **Token Refresh Rate**: Refresh token usage
- **Database Connections**: Pool utilization
- **Redis Memory**: Cache memory usage
- **Rate Limiting**: Blocked requests

### Logging

```bash
# Enable debug logging
RUST_LOG=debug cargo run

# Production logging
RUST_LOG=info ./target/release/uas
```

## 🔧 Development

### Project structure

```
universal-auth-service/
├── Cargo.toml              # Package name: uas; binary: uas; edition 2024
├── src/
│   ├── main.rs             # Entry → uas::run()
│   ├── lib.rs              # HttpServer, pool wiring, route config
│   ├── configuration.rs    # Settings + APP_* env merge
│   ├── routes/mod.rs       # /api/v1 route table
│   ├── middleware/
│   │   └── cors.rs
│   └── module/
│       ├── auth/           # model, repository, cache, service, handler
│       ├── email/          # Resend client wrapper
│       └── health/         # /api/v1/health aggregation
├── migrations/
│   └── 001_initial_schema.sql   # Canonical Postgres schema (use this)
├── database_migration.sql        # Legacy / alternate schema (optional)
├── example.configuration.yaml    # Copy to configuration.yaml
├── configuration.yaml            # Local config (gitignored if you prefer)
├── universal-auth-service.postman_collection.json
├── Dockerfile
├── LICENSE
└── test_email.rs                 # Standalone helper (not wired into cargo test harness)
```

### Development workflow

```bash
git checkout -b feature/new-auth-endpoint
# Edit source files...
cargo fmt --check
cargo clippy
cargo run
# Exercise flows with Postman or curl (see API sections)
git add .
git commit -m "Add new authentication endpoint"
```

Add **`cargo test`** to your workflow once tests exist.

### Code Quality

```bash
# Format code
cargo fmt

# Run linter
cargo clippy -- -D warnings

# Run security audit
cargo audit

# Generate documentation
cargo doc --open
```

### Adding new features

1. **Database changes**: Add a new file under **`migrations/`** (and apply with `psql` or your migration tool); keep **`database_migration.sql`** in sync only if you still use it operationally.
2. **Models**: `src/module/auth/model.rs` (or a new module)
3. **Repository**: `src/module/auth/repository.rs`
4. **Cache**: `src/module/auth/cache.rs`
5. **Service**: `src/module/auth/service.rs`
6. **Handler**: `src/module/auth/handler.rs`
7. **Routes**: `src/routes/mod.rs`
8. **Tests**: add `#[cfg(test)]` or `tests/*.rs` — none ship with this repo today

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/universal-auth-service.git
   cd universal-auth-service
   ```

3. **Set up development environment**
   ```bash
   cargo build
   cargo run    # manual verification; add tests when contributing features
   ```

4. **Create feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

5. **Make changes and test**
   ```bash
   cargo clippy && cargo run
   # Postman collection or curl
   ```

6. **Submit pull request**

### Guidelines

- **Code Style**: Follow Rust standards (`cargo fmt`, `cargo clippy`)
- **Tests**: Add tests for new features
- **Documentation**: Update README for API changes
- **Security**: Follow security best practices
- **Performance**: Consider performance implications

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Maintenance

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Universal Auth Service

Permission is hereby granted, free of charge, to any person obtaining a copy
of this Software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
```

## 🆘 Troubleshooting

### Common Issues

#### PostgreSQL Connection Failed
```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux

# Create database
createdb uas
```

#### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis       # macOS
sudo systemctl start redis-server # Linux
```

#### Application Won't Start
```bash
# Check configuration
cat configuration.yaml

# Check environment overrides (examples)
echo "$APP_DATABASE__HOST" "$APP_JWT__SECRET"

# Run with debug logging
RUST_LOG=debug cargo run
```

#### Tests / empty harness
```bash
# There are no project tests yet — cargo test runs 0 tests
cargo test

# If build fails, clean and rebuild
cargo clean && cargo build

# Check database state while debugging auth flows
psql -d uas -c "SELECT id, email, email_verified, role FROM users LIMIT 10;"
```

### Performance tuning

PostgreSQL pool sizes are **hardcoded** in `src/lib.rs` (`PgPoolOptions`: `max_connections(100)`, `min_connections(5)`). Adjust there if you need different limits.

Redis: tune **`maxmemory`** / **`maxmemory-policy`** in `redis.conf` for your deployment if cache growth matters.

### Monitoring Queries

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'uas';

-- Slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Cache hit ratio
SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio FROM pg_statio_user_tables;
```

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/universal-auth-service/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/universal-auth-service/discussions)
- **Documentation**: [Wiki](https://github.com/your-org/universal-auth-service/wiki)

## 🎯 Roadmap

### Version 1.1.0
- [ ] OAuth2 integration (Google, GitHub, etc.)
- [ ] Multi-factor authentication (2FA)
- [ ] Social login support
- [ ] Advanced rate limiting
- [ ] API key management

### Version 1.2.0
- [ ] Audit logging enhancements
- [ ] User activity tracking
- [ ] Advanced permissions system
- [ ] Service-to-service authentication
- [ ] Webhook support

### Version 2.0.0
- [ ] Microservices orchestration
- [ ] Distributed tracing
- [ ] Advanced analytics
- [ ] Machine learning integration

---

## Production readiness

This service implements a **solid baseline** for central auth (Postgres + Redis + JWT access / opaque refresh + Resend email + health checks). Before production, review **secrets**, **CORS**, **TLS termination**, **pool sizing** in `lib.rs`, **observability**, and **automated tests** for your threat model.

---

*Rust (actix-web), PostgreSQL, Redis, Resend*