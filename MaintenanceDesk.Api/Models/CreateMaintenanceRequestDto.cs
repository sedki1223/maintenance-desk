
namespace MaintenanceDesk.Api.Models;

public sealed class CreateMaintenanceRequestDto
{
    public string Title { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    public string Location { get; init; } = string.Empty;

    public MaintenancePriority Priority { get; init; }
        = MaintenancePriority.Normal;
}
