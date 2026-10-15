const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5224";

export type Priority = "Low" | "Normal" | "High" | "Critical";
export type Status = "Open" | "In Progress" | "Resolved" | "Cancelled";

export type MaintenanceRequest = {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: number;
  status: number;
  createdAtUtc: string;
};

export type CreateMaintenanceRequest = {
  title: string;
  description: string;
  location: string;
  priority: number;
};

const priorities: Priority[] = ["Low", "Normal", "High", "Critical"];
const statuses: Status[] = ["Open", "In Progress", "Resolved", "Cancelled"];

export function priorityLabel(value: number): Priority {
  return priorities[value] ?? "Normal";
}

export function statusLabel(value: number): Status {
  return statuses[value] ?? "Open";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot reach the Maintenance Desk API. Is the .NET server running?");
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export function getRequests() {
  return request<MaintenanceRequest[]>("/api/maintenance-requests");
}

export function createRequest(input: CreateMaintenanceRequest) {
  return request<MaintenanceRequest>("/api/maintenance-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRequestStatus(id: string, status: number) {
  return request<MaintenanceRequest>(`/api/maintenance-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}