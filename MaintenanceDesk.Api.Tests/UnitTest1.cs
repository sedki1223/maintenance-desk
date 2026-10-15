
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MaintenanceDesk.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MaintenanceDesk.Api.Tests;


public sealed class MaintenanceDeskApiFactory
    : WebApplicationFactory<Program>
{
    private readonly string _databaseName =
        $"MaintenanceDeskTests_{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<
                IDbContextOptionsConfiguration<MaintenanceDeskDbContext>>();

            services.RemoveAll<DbContextOptions<MaintenanceDeskDbContext>>();
            services.RemoveAll<MaintenanceDeskDbContext>();

            services.AddDbContext<MaintenanceDeskDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));
        });
    }
}


public class MaintenanceRequestsTests
{
    [Fact]
    public async Task CreateRequest_WithValidInput_ReturnsCreated()
    {
        using var factory = new MaintenanceDeskApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/maintenance-requests",
            new
            {
                title = "  Workshop AC inspection  ",
                description = "  Unit is making unusual noise.  ",
                location = "  Workshop A  ",
                priority = 2
            });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal("Workshop AC inspection",
            json.GetProperty("title").GetString());
        Assert.Equal("Unit is making unusual noise.",
            json.GetProperty("description").GetString());
        Assert.Equal("Workshop A",
            json.GetProperty("location").GetString());
        Assert.Equal(2, json.GetProperty("priority").GetInt32());
        Assert.Equal(0, json.GetProperty("status").GetInt32());

        Assert.True(Guid.TryParse(json.GetProperty("id").GetString(), out _));
    }

    [Theory]
    [InlineData("   ", "Valid description", "Workshop A")]
    [InlineData("Valid title", "   ", "Workshop A")]
    [InlineData("Valid title", "Valid description", "   ")]
    public async Task CreateRequest_WithBlankRequiredField_ReturnsBadRequest(
        string title,
        string description,
        string location)
    {
        using var factory = new MaintenanceDeskApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/maintenance-requests",
            new { title, description, location, priority = 1 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateRequest_WithInvalidPriority_ReturnsBadRequest()
    {
        using var factory = new MaintenanceDeskApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/maintenance-requests",
            new
            {
                title = "Inspect machine",
                description = "Unusual vibration.",
                location = "Workshop B",
                priority = 99
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetRequest_WithUnknownId_ReturnsNotFound()
    {
        using var factory = new MaintenanceDeskApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync(
            $"/api/maintenance-requests/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetRequest_WithExistingId_ReturnsRequest()
    {
        using var factory = new MaintenanceDeskApiFactory();
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync(
            "/api/maintenance-requests",
            new
            {
                title = "Inspect compressor",
                description = "Pressure is fluctuating.",
                location = "Workshop E",
                priority = 1
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content
            .ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetString();

        var response = await client.GetAsync(
            $"/api/maintenance-requests/{id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var request = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Inspect compressor",
            request.GetProperty("title").GetString());
    }

    [Fact]
    public async Task GetRequests_ReturnsCreatedRequests()
    {
        using var factory = new MaintenanceDeskApiFactory();
        using var client = factory.CreateClient();

        foreach (var title in new[] { "Inspect pump", "Repair conveyor" })
        {
            var createResponse = await client.PostAsJsonAsync(
                "/api/maintenance-requests",
                new
                {
                    title,
                    description = "Routine maintenance check.",
                    location = "Workshop F",
                    priority = 1
                });

            Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        }

        var response = await client.GetAsync("/api/maintenance-requests");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var requests = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(2, requests.GetArrayLength());
    }

    [Fact]
    public async Task UpdateStatus_WithUnknownId_ReturnsNotFound()
    {
        using var factory = new MaintenanceDeskApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PatchAsJsonAsync(
            $"/api/maintenance-requests/{Guid.NewGuid()}/status",
            new { status = 1 });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateStatus_AfterResolution_ReturnsBadRequest()
    {
        using var factory = new MaintenanceDeskApiFactory();
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync(
            "/api/maintenance-requests",
            new
            {
                title = "Repair conveyor",
                description = "Conveyor belt is jammed.",
                location = "Workshop C",
                priority = 2
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content
            .ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetString();

        var resolveResponse = await client.PatchAsJsonAsync(
            $"/api/maintenance-requests/{id}/status",
            new { status = 2 });

        Assert.Equal(HttpStatusCode.OK, resolveResponse.StatusCode);

        var reopenResponse = await client.PatchAsJsonAsync(
            $"/api/maintenance-requests/{id}/status",
            new { status = 1 });

        Assert.Equal(HttpStatusCode.BadRequest, reopenResponse.StatusCode);
    }

    [Fact]
    public async Task UpdateStatus_WithInvalidStatus_ReturnsBadRequest()
    {
        using var factory = new MaintenanceDeskApiFactory();
        using var client = factory.CreateClient();

        var createResponse = await client.PostAsJsonAsync(
            "/api/maintenance-requests",
            new
            {
                title = "Inspect pump",
                description = "Pressure is unstable.",
                location = "Workshop D",
                priority = 1
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var created = await createResponse.Content
            .ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetString();

        var response = await client.PatchAsJsonAsync(
            $"/api/maintenance-requests/{id}/status",
            new { status = 99 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
