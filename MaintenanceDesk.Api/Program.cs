
using MaintenanceDesk.Api.Data;
using MaintenanceDesk.Api.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddDbContext<MaintenanceDeskDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("MaintenanceDesk")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// POST: Create a maintenance request
app.MapPost(
    "/api/maintenance-requests",
    async (
        CreateMaintenanceRequestDto input,
        MaintenanceDeskDbContext db,
        CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(input.Title))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["title"] = ["Title is required."]
        });
    }

    if (string.IsNullOrWhiteSpace(input.Description))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["description"] = ["Description is required."]
        });
    }

    if (string.IsNullOrWhiteSpace(input.Location))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["location"] = ["Location is required."]
        });
    }

    if (!Enum.IsDefined(input.Priority))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["priority"] = ["Priority is invalid."]
        });
    }

    var request = new MaintenanceRequest
    {
        Title = input.Title.Trim(),
        Description = input.Description.Trim(),
        Location = input.Location.Trim(),
        Priority = input.Priority
    };

    db.MaintenanceRequests.Add(request);
    await db.SaveChangesAsync(cancellationToken);

    return Results.Created(
        $"/api/maintenance-requests/{request.Id}",
        request);
})
.WithName("CreateMaintenanceRequest");

// GET: Retrieve all maintenance requests
app.MapGet(
    "/api/maintenance-requests",
    async (MaintenanceDeskDbContext db, CancellationToken cancellationToken) =>
{
    var requests = await db.MaintenanceRequests
        .AsNoTracking()
        .OrderByDescending(request => request.CreatedAtUtc)
        .ToListAsync(cancellationToken);

    return Results.Ok(requests);
})
.WithName("GetMaintenanceRequests");

// GET: Retrieve one maintenance request by ID
app.MapGet(
    "/api/maintenance-requests/{id:guid}",
    async (
        Guid id,
        MaintenanceDeskDbContext db,
        CancellationToken cancellationToken) =>
{
    var request = await db.MaintenanceRequests
        .AsNoTracking()
        .FirstOrDefaultAsync(
            request => request.Id == id,
            cancellationToken);

    if (request is null)
    {
        return Results.NotFound(new
        {
            message = $"Maintenance request '{id}' was not found."
        });
    }

    return Results.Ok(request);
})
.WithName("GetMaintenanceRequestById");

// PATCH: Update a maintenance request's status
app.MapPatch(
    "/api/maintenance-requests/{id:guid}/status",
    async (
        Guid id,
        UpdateMaintenanceStatusDto input,
        MaintenanceDeskDbContext db,
        CancellationToken cancellationToken) =>
{
    var request = await db.MaintenanceRequests
        .FirstOrDefaultAsync(
            request => request.Id == id,
            cancellationToken);

    if (request is null)
    {
        return Results.NotFound(new
        {
            message = $"Maintenance request '{id}' was not found."
        });
    }

    if (!Enum.IsDefined(input.Status))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["status"] = ["Status is invalid."]
        });
    }

    if (request.Status == MaintenanceStatus.Cancelled ||
        request.Status == MaintenanceStatus.Resolved)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["status"] = ["Resolved or cancelled requests cannot be changed."]
        });
    }

    request.Status = input.Status;

    await db.SaveChangesAsync(cancellationToken);

    return Results.Ok(request);
})
.WithName("UpdateMaintenanceRequestStatus");

app.Run();
