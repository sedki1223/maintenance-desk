# Maintenance Desk

A full-stack maintenance request management app for tracking workshop and facility issues. The project pairs a **.NET 10 Minimal API** with **PostgreSQL** and a **Next.js** dashboard.

## What it does

- Create maintenance requests with a title, description, location, and priority.
- Track request status: Open, In Progress, Resolved, or Cancelled.
- View request counts and workload summaries.
- Search requests and filter them by status.
- Validate required fields and reject invalid priority/status values.
- Prevent resolved or cancelled requests from being changed again.
- Persist requests in PostgreSQL through Entity Framework Core.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | .NET 10, ASP.NET Core Minimal API, C# |
| Database | PostgreSQL, Entity Framework Core, Npgsql |
| Tests | xUnit, ASP.NET Core integration testing, EF Core InMemory provider |

## Repository structure

```text
maintenance-desk/
├── MaintenanceDesk.Api/           # .NET API, data context, models, migrations
├── MaintenanceDesk.Api.Tests/     # API integration tests
└── maintenancedesk-web/            # Next.js dashboard
```

## Requirements

Install the following before running the project:

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (use a version compatible with the Next.js version in `maintenancedesk-web/package.json`)
- [PostgreSQL](https://www.postgresql.org/) running locally or on a reachable server

## Run locally

Run the API and frontend in separate terminals.

### 1. Configure PostgreSQL

Create a database named `maintenance_desk` (or choose another name) and configure the API connection string using .NET User Secrets from the API project directory:

```bash
cd MaintenanceDesk.Api
dotnet user-secrets set "ConnectionStrings:MaintenanceDesk" "Host=localhost;Port=5432;Database=maintenance_desk;Username=postgres;Password=YOUR_PASSWORD"
```

Replace `YOUR_PASSWORD` and the username/host values with your local PostgreSQL credentials. The connection string is stored in your local User Secrets, not in the repository.

### 2. Apply database migrations

From the `MaintenanceDesk.Api` directory:

```bash
dotnet tool install --global dotnet-ef
dotnet ef database update
```

If `dotnet-ef` is already installed, skip the install command.

### 3. Start the API

From the repository root:

```bash
dotnet run --project MaintenanceDesk.Api --launch-profile http
```

The API runs at [http://localhost:5224](http://localhost:5224). In Development, the OpenAPI document is available at [http://localhost:5224/openapi/v1.json](http://localhost:5224/openapi/v1.json).

### 4. Start the frontend

In a second terminal:

```bash
cd maintenancedesk-web
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The frontend defaults to `http://localhost:5224` for the API. To use a different API URL, set `NEXT_PUBLIC_API_URL` in a local `.env.local` file inside `maintenancedesk-web`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5224
```

The API's current CORS policy allows the local frontend origin `http://localhost:3000`. Update that policy before using a different frontend origin.

## API endpoints

Base URL: `http://localhost:5224`

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/maintenance-requests` | List requests, newest first |
| `GET` | `/api/maintenance-requests/{id}` | Get one request by GUID |
| `POST` | `/api/maintenance-requests` | Create a request |
| `PATCH` | `/api/maintenance-requests/{id}/status` | Update a request's status |

### Example: create a request

```json
{
  "title": "Inspect workshop air conditioning",
  "description": "The unit is making an unusual noise.",
  "location": "Workshop A",
  "priority": 2
}
```

Priority values are numeric enum values: `0 = Low`, `1 = Normal`, `2 = High`, `3 = Critical`. Status values are `0 = Open`, `1 = InProgress`, `2 = Resolved`, and `3 = Cancelled`.

## Tests and quality checks

Run the backend integration tests from the repository root:

```bash
dotnet test
```

Run frontend checks from `maintenancedesk-web`:

```bash
npm run lint
npm run build
```

The API tests cover request creation, required-field and enum validation, retrieval, and status update rules. These commands are documented for local verification; run them in your environment to confirm the current checkout passes.

## Current scope

This is an evolving portfolio project. The implemented workflow focuses on creating, listing, searching, filtering, and updating maintenance requests. Authentication, role-based access, asset management, notifications, and reporting beyond the current dashboard summaries are not yet part of the implemented scope.

## Configuration and security

- Do not commit database passwords, API keys, or local `.env` files.
- Use .NET User Secrets for local backend connection strings.
- Use `.env.local` for local frontend configuration; it is intended to stay out of version control.
- The included CORS policy is configured for local development. Review it before deployment.
