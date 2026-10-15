# Maintenance Desk

A full-stack maintenance request tracker built with ASP.NET Core Minimal APIs, Entity Framework Core, PostgreSQL, and Next.js.

## What it does

- Create maintenance requests with a title, description, location, and priority.
- Browse requests, newest first.
- View a single request by ID.
- Update request status while preventing changes after a request is resolved or cancelled.
- Validate incoming data and return useful HTTP responses.

## Stack

- **API:** .NET 10, ASP.NET Core Minimal APIs
- **Data:** Entity Framework Core 10, PostgreSQL, Npgsql
- **Web:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Tests:** xUnit and ASP.NET Core integration-test infrastructure

## Repository layout

```text
MaintenanceDesk.Api/         API, EF Core context, models, migrations
MaintenanceDesk.Api.Tests/   API tests
maintenancedesk-web/         Next.js frontend
```

## Prerequisites

- .NET 10 SDK
- Node.js compatible with the Next.js version in `maintenancedesk-web/package.json`
- PostgreSQL 18 (local or Docker)

The existing local development setup uses PostgreSQL on host port `5433`, database `maintenance_desk`, and user `maintenance_app`. Adjust the connection string if your setup differs.

## Configure the API

The connection string is intentionally not committed. From the repository root, set it with .NET User Secrets:

```powershell
dotnet user-secrets set "ConnectionStrings:MaintenanceDesk" "Host=localhost;Port=5433;Database=maintenance_desk;Username=maintenance_app;Password=YOUR_LOCAL_PASSWORD" --project .\MaintenanceDesk.Api\MaintenanceDesk.Api.csproj
```

Replace `YOUR_LOCAL_PASSWORD` with the password configured for your local PostgreSQL user. Do not commit real credentials.

Apply the EF Core migrations to the configured database:

```powershell
dotnet tool install --global dotnet-ef
dotnet ef database update --project .\MaintenanceDesk.Api\MaintenanceDesk.Api.csproj
```

If `dotnet-ef` is already installed, skip the install command.

## Run locally

Start the API in one terminal:

```powershell
dotnet run --project .\MaintenanceDesk.Api\MaintenanceDesk.Api.csproj --urls http://localhost:5224
```

The API endpoints are:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/maintenance-requests` | List requests |
| `GET` | `/api/maintenance-requests/{id}` | Get one request |
| `POST` | `/api/maintenance-requests` | Create a request |
| `PATCH` | `/api/maintenance-requests/{id}/status` | Update status |

Start the frontend in another terminal:

```powershell
cd .\maintenancedesk-web
npm ci
```

Create `maintenancedesk-web/.env.local` with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5224
```

Then run:

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests and quality checks

From the repository root:

```powershell
dotnet test .\MaintenanceDesk.Api.Tests\MaintenanceDesk.Api.Tests.csproj
dotnet build .\MaintenanceDesk.Api\MaintenanceDesk.Api.csproj
```

For the frontend:

```powershell
cd .\maintenancedesk-web
npm.cmd run lint
npm.cmd run build
```

## Current scope and next steps

This is a portfolio project, not a production-ready service. Before public deployment, configure production secrets and database hosting, restrict CORS to the deployed frontend origin, add authentication/authorization if requests are not meant to be public, and establish deployment and migration automation.
