
using MaintenanceDesk.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceDesk.Api.Data;

public class MaintenanceDeskDbContext : DbContext
{
    public MaintenanceDeskDbContext(
        DbContextOptions<MaintenanceDeskDbContext> options)
        : base(options)
    {
    }

    public DbSet<MaintenanceRequest> MaintenanceRequests =>
        Set<MaintenanceRequest>();
}
