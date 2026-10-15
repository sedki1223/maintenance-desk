
namespace MaintenanceDesk.Api.Models;

public class MaintenanceRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public MaintenancePriority Priority { get; set; }
        = MaintenancePriority.Normal;

    public MaintenanceStatus Status { get; set; }
        = MaintenanceStatus.Open;

    public DateTime CreatedAtUtc { get; set; }
        = DateTime.UtcNow;
}

public enum MaintenancePriority
{
    Low,
    Normal,
    High,
    Critical
}

public enum MaintenanceStatus
{
    Open,
    InProgress,
    Resolved,
    Cancelled
}
