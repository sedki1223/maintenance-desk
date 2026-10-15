
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  createRequest as createApiRequest,
  getRequests,
  priorityLabel,
  statusLabel,
  updateRequestStatus,
  type MaintenanceRequest as ApiMaintenanceRequest,
} from "./lib/api";

type Status = "Open" | "In Progress" | "Resolved" | "Cancelled";
type Priority = "Low" | "Normal" | "High" | "Critical";

type MaintenanceRequest = {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: Priority;
  status: Status;
  createdAt: string;
};

const filters = ["All requests", "Open", "In Progress", "Resolved"] as const;
type Filter = (typeof filters)[number];

const priorities: Priority[] = ["Low", "Normal", "High", "Critical"];

const statusOptions: Status[] = [
  "Open",
  "In Progress",
  "Resolved",
  "Cancelled",
];

function mapApiRequest(request: ApiMaintenanceRequest): MaintenanceRequest {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    location: request.location,
    priority: priorityLabel(request.priority),
    status: statusLabel(request.status),
    createdAt: new Date(request.createdAtUtc).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
  };
}

function displayRequestId(id: string) {
  return `MD-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "grid":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "clipboard":
      return <svg {...common}><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5.5V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M9 11h6M9 15h6" /></svg>;
    case "building":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 21v-4h6v4M8 7h2m4 0h2M8 11h2m4 0h2" /></svg>;
    case "chart":
      return <svg {...common}><path d="M3 3v18h18M8 15l4-4 4 3 5-7" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" transform="translate(-1 -1) scale(1.08)" /></svg>;
    case "search":
      return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>;
    case "bell":
      return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "arrow":
      return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "alert":
      return <svg {...common}><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></svg>;
    case "location":
      return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge status-${status.toLowerCase().replace(" ", "-")}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`priority-badge priority-${priority.toLowerCase()}`}>
      {priority === "Critical" && <Icon name="alert" size={13} />}
      {priority}
    </span>
  );
}

export default function Home() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>("All requests");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dateLabel] = useState(() => {
    const now = new Date();
    return {
      today: now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Africa/Tunis",
      }),
      currentYear: Number(
        new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          timeZone: "Africa/Tunis",
        }).format(now)
      ),
    };
  });
  const today = dateLabel.today;
  const currentYear = dateLabel.currentYear;

  const loadRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const data = await getRequests();
      setRequests(data.map(mapApiRequest));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load maintenance requests."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Defer the initial request until after the effect has committed.
    const timer = window.setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter =
        activeFilter === "All requests" || request.status === activeFilter;

      const matchesSearch =
        !query ||
        [
          displayRequestId(request.id),
          request.id,
          request.title,
          request.description,
          request.location,
          request.priority,
          request.status,
        ].some((value) => value.toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });
  }, [requests, activeFilter, search]);

  const openCount = requests.filter((request) => request.status === "Open").length;
  const inProgressCount = requests.filter(
    (request) => request.status === "In Progress"
  ).length;
  const resolvedCount = requests.filter(
    (request) => request.status === "Resolved"
  ).length;
  const criticalCount = requests.filter(
    (request) =>
      request.priority === "Critical" &&
      request.status !== "Resolved" &&
      request.status !== "Cancelled"
  ).length;

  async function handleCreateRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const created = await createApiRequest({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        priority: priorities.indexOf(priority),
      });

      setRequests((current) => [
        mapApiRequest(created),
        ...current.filter((request) => request.id !== created.id),
      ]);

      setActiveFilter("All requests");
      setSearch("");
      setTitle("");
      setDescription("");
      setLocation("");
      setPriority("Normal");
      setShowForm(false);
      setNotice("Maintenance request created successfully.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the maintenance request."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(
    request: MaintenanceRequest,
    nextStatus: Status
  ) {
    if (
      updatingRequestId ||
      request.status === nextStatus ||
      request.status === "Resolved" ||
      request.status === "Cancelled"
    ) {
      return;
    }

    setError(null);
    setNotice(null);
    setUpdatingRequestId(request.id);

    try {
      const updated = await updateRequestStatus(
        request.id,
        statusOptions.indexOf(nextStatus)
      );

      const mapped = mapApiRequest(updated);

      setRequests((current) =>
        current.map((item) => (item.id === mapped.id ? mapped : item))
      );

      setNotice(
        `${displayRequestId(request.id)} updated to ${mapped.status}.`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update the request status."
      );
    } finally {
      setUpdatingRequestId(null);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Maintenance Desk home">
          <span className="brand-mark"><Icon name="settings" size={23} /></span>
          <span className="brand-copy">
            <strong>maintain<span>desk</span></strong>
            <small>OPERATIONS PLATFORM</small>
          </span>
        </a>

        <div className="workspace-switcher">
          <span className="workspace-icon">W</span>
          <span className="workspace-copy"><strong>Workshop HQ</strong><small>Operations team</small></span>
          <span className="switcher-chevron">⌄</span>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><Icon name="grid" /><span>Overview</span></a>
          <a className="nav-item" href="#requests"><Icon name="clipboard" /><span>Maintenance requests</span><span className="nav-count">{requests.length}</span></a>
          <a className="nav-item" href="#assets"><Icon name="building" /><span>Assets & locations</span></a>
          <a className="nav-item" href="#reports"><Icon name="chart" /><span>Reports & insights</span></a>
        </nav>

        <div className="nav-label tools-label">PREFERENCES</div>
        <nav className="sidebar-nav" aria-label="Preferences">
          <a className="nav-item" href="#settings"><Icon name="settings" /><span>Settings</span></a>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">✳</div>
            <strong>Need a hand?</strong>
            <p>Keep your workshop running smoothly.</p>
            <a href="#requests">View open requests <Icon name="arrow" size={14} /></a>
          </div>
          <div className="user-profile">
            <div className="avatar">SD</div>
            <div className="user-copy"><strong>Workshop Admin</strong><small>Administrator</small></div>
            <span className="profile-menu">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-panel" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions">
            <span className="today-label">{today}</span>
            <button className="icon-button notification-button" aria-label="Notifications" type="button">
              <Icon name="bell" size={19} />
            </button>
            <div className="topbar-avatar">SD</div>
          </div>
        </header>

        <div className="dashboard-content">
          {error && (
            <div className="form-note" role="alert">
              <Icon name="alert" size={15} />
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">×</button>
            </div>
          )}

          {notice && !error && (
            <div className="form-note" role="status">
              <Icon name="check" size={15} />
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification">×</button>
            </div>
          )}

          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> WORKSPACE OVERVIEW</div>
              <h1>Good morning, Admin <span className="wave">✳</span></h1>
              <p className="page-subtitle">Here&apos;s what&apos;s happening across your maintenance operations.</p>
            </div>
            <button className="primary-button" onClick={() => setShowForm(true)} type="button">
              <Icon name="plus" size={18} /> New request
            </button>
          </section>

          <section className="metrics-grid" aria-label="Maintenance statistics">
            <article className="metric-card">
              <div className="metric-top"><span>Total requests</span><span className="metric-icon metric-icon-blue"><Icon name="clipboard" /></span></div>
              <div className="metric-value">{requests.length.toString().padStart(2, "0")}</div>
              <div className="metric-foot"><span className="metric-neutral">All time</span><span className="metric-foot-label">Recorded requests</span></div>
              <div className="metric-bottom-line line-blue" />
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>Awaiting action</span><span className="metric-icon metric-icon-amber"><Icon name="clock" /></span></div>
              <div className="metric-value">{openCount.toString().padStart(2, "0")}</div>
              <div className="metric-foot"><span className="metric-alert-text">{criticalCount} critical</span><span className="metric-foot-label">Needs attention</span></div>
              <div className="metric-bottom-line line-amber" />
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>In progress</span><span className="metric-icon metric-icon-violet"><Icon name="settings" /></span></div>
              <div className="metric-value">{inProgressCount.toString().padStart(2, "0")}</div>
              <div className="metric-foot"><span className="metric-neutral">Being handled</span><span className="metric-foot-label">Active work</span></div>
              <div className="metric-bottom-line line-violet" />
            </article>
            <article className="metric-card">
              <div className="metric-top"><span>Resolved</span><span className="metric-icon metric-icon-green"><Icon name="check" /></span></div>
              <div className="metric-value">{resolvedCount.toString().padStart(2, "0")}</div>
              <div className="metric-foot"><span className="metric-success">Completed</span><span className="metric-foot-label">Requests closed</span></div>
              <div className="metric-bottom-line line-green" />
            </article>
          </section>

          <section className="overview-grid">
            <article className="panel attention-panel">
              <div className="panel-heading">
                <div><h2>Needs attention</h2><p>Priorities that may need your focus</p></div>
                <span className="panel-heading-icon"><Icon name="alert" size={18} /></span>
              </div>
              <div className="attention-content">
                <div className="attention-number">{criticalCount.toString().padStart(2, "0")} <span>critical priority</span></div>
                <div className="attention-track"><span style={{ width: `${requests.length ? (criticalCount / requests.length) * 100 : 0}%` }} /></div>
                <p className="attention-note">{criticalCount > 0 ? "High-priority equipment issues are awaiting action." : "No critical open requests. Nice work."}</p>
              </div>
              <button className="text-link" type="button" onClick={() => { setActiveFilter("Open"); document.getElementById("requests")?.scrollIntoView({ behavior: "smooth" }); }}>Review open requests <Icon name="arrow" size={15} /></button>
            </article>

            <article className="panel status-panel">
              <div className="panel-heading">
                <div><h2>Request status</h2><p>Current workload distribution</p></div>
                <span className="live-label"><span /> LIVE OVERVIEW</span>
              </div>
              <div className="status-breakdown">
                <div className="status-row"><span className="status-row-label"><i className="legend-dot dot-open" />Open</span><strong>{openCount.toString().padStart(2, "0")}</strong><div className="status-bar"><span className="bar-open" style={{ width: `${requests.length ? (openCount / requests.length) * 100 : 0}%` }} /></div><small>{requests.length ? Math.round((openCount / requests.length) * 100) : 0}%</small></div>
                <div className="status-row"><span className="status-row-label"><i className="legend-dot dot-progress" />In progress</span><strong>{inProgressCount.toString().padStart(2, "0")}</strong><div className="status-bar"><span className="bar-progress" style={{ width: `${requests.length ? (inProgressCount / requests.length) * 100 : 0}%` }} /></div><small>{requests.length ? Math.round((inProgressCount / requests.length) * 100) : 0}%</small></div>
                <div className="status-row"><span className="status-row-label"><i className="legend-dot dot-resolved" />Resolved</span><strong>{resolvedCount.toString().padStart(2, "0")}</strong><div className="status-bar"><span className="bar-resolved" style={{ width: `${requests.length ? (resolvedCount / requests.length) * 100 : 0}%` }} /></div><small>{requests.length ? Math.round((resolvedCount / requests.length) * 100) : 0}%</small></div>
              </div>
            </article>
          </section>

          <section className="panel requests-panel" id="requests">
            <div className="requests-heading">
              <div><div className="requests-title-row"><h2>Maintenance requests</h2><span className="total-pill">{requests.length}</span></div><p>Track, prioritize, and manage workshop issues.</p></div>
              <div className="topbar-actions">
                <button className="secondary-button" type="button" onClick={() => void loadRequests(true)} disabled={loading || refreshing || Boolean(updatingRequestId)}>
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
                <button className="secondary-button" type="button" onClick={() => setShowForm(true)}><Icon name="plus" size={16} /> Create request</button>
              </div>
            </div>

            <div className="requests-toolbar">
              <div className="filter-tabs" role="tablist" aria-label="Filter requests">
                {filters.map((filter) => (
                  <button key={filter} role="tab" aria-selected={activeFilter === filter} className={`filter-tab ${activeFilter === filter ? "selected" : ""}`} onClick={() => setActiveFilter(filter)} type="button">
                    {filter}
                    {filter === "Open" && <span className="tab-count">{openCount}</span>}
                  </button>
                ))}
              </div>
              <label className="search-field">
                <Icon name="search" size={17} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests..." aria-label="Search requests" />
                <kbd>⌘ K</kbd>
              </label>
            </div>

            <div className="table-wrap">
              <table className="requests-table">
                <thead><tr><th>REQUEST</th><th>LOCATION</th><th>PRIORITY</th><th>STATUS</th><th>CREATED</th><th>ACTION</th></tr></thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={6} className="empty-state">Loading maintenance requests...</td></tr>
                  )}

                  {!loading && filteredRequests.map((request) => {
                    const isTerminal =
                      request.status === "Resolved" ||
                      request.status === "Cancelled";
                    const isUpdating = updatingRequestId === request.id;

                    return (
                      <tr key={request.id}>
                        <td>
                          <div className="request-name">{request.title}</div>
                          <div className="request-id" title={request.id}>{displayRequestId(request.id)}</div>
                        </td>
                        <td><span className="location-cell"><Icon name="location" size={15} />{request.location}</span></td>
                        <td><PriorityBadge priority={request.priority} /></td>
                        <td><StatusBadge status={request.status} /></td>
                        <td className="date-cell">{request.createdAt}</td>
                        <td>
                          <label className="sr-only" htmlFor={`status-${request.id}`}>
                            Change status for {request.title}
                          </label>
                          <select
                            id={`status-${request.id}`}
                            className="row-status-select"
                            value={request.status}
                            disabled={isTerminal || Boolean(updatingRequestId)}
                            title={
                              isTerminal
                                ? "Closed requests cannot be changed."
                                : "Update request status"
                            }
                            onChange={(event) =>
                              void handleStatusChange(
                                request,
                                event.target.value as Status
                              )
                            }
                          >
                            {statusOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {isUpdating && <span className="status-saving">Saving…</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && filteredRequests.length === 0 && (
                    <tr><td colSpan={6} className="empty-state">
                      {error ? "Requests could not be loaded. Check the API connection and refresh." : "No requests match your search. Try another filter or create a request."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>Showing <strong>{loading ? "—" : filteredRequests.length}</strong> of <strong>{loading ? "—" : requests.length}</strong> requests</span>
              <span className="footer-updated"><span /> {error ? "Connection needs attention" : "Live data from Maintenance Desk API"}</span>
            </div>
          </section>

          <footer className="dashboard-footer"><span>© {currentYear ?? ""} Maintaindesk</span><span><i /> {error ? "API connection issue" : "Dashboard ready"}</span><span>Built for smoother operations.</span></footer>
        </div>
      </main>

      {showForm && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) setShowForm(false); }}>
          <section className="request-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-heading">
              <div><span className="modal-eyebrow">WORK ORDER</span><h2 id="modal-title">Create a request</h2><p>Describe the issue so the team knows what needs attention.</p></div>
              <button className="modal-close" type="button" onClick={() => !isSubmitting && setShowForm(false)} aria-label="Close dialog" disabled={isSubmitting}>×</button>
            </div>
            <form onSubmit={handleCreateRequest} className="request-form">
              <label>Request title<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Inspect production equipment" /></label>
              <label>Location<input required maxLength={120} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Workshop A" /></label>
              <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}><option>Low</option><option>Normal</option><option>High</option><option>Critical</option></select></label>
              <label>Description<textarea required maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What happened? Include any useful details." /></label>
              <div className="form-note"><Icon name="alert" size={15} /> New requests start with Open status.</div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  <Icon name="plus" size={17} /> {isSubmitting ? "Creating..." : "Create request"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
