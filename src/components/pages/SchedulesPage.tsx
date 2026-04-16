"use client";

import { useState, useEffect } from "react";

interface Schedule {
  id: string;
  name: string;
  platform: string;
  query: string;
  cronExpr: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  autoScript: boolean;
  autoHooks: boolean;
}

const CRON_PRESETS = [
  { label: "Daily at 9:00 AM", value: "0 9 * * *" },
  { label: "Weekdays at 9:00 AM", value: "0 9 * * 1-5" },
  { label: "Daily at 6:00 AM", value: "0 6 * * *" },
  { label: "Daily at 12:00 PM", value: "0 12 * * *" },
  { label: "Daily at 6:00 PM", value: "0 18 * * *" },
  { label: "Every Monday at 9:00 AM", value: "0 9 * * 1" },
  { label: "Twice daily (9 AM & 6 PM)", value: "0 9,18 * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
];

const CRON_LABELS: Record<string, string> = {};
CRON_PRESETS.forEach((p) => { CRON_LABELS[p.value] = p.label; });

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [query, setQuery] = useState("");
  const [cronExpr, setCronExpr] = useState("0 9 * * *");
  const [autoScript, setAutoScript] = useState(false);
  const [autoHooks, setAutoHooks] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchSchedules() {
    try {
      const res = await fetch("/api/schedules");
      if (res.ok) setSchedules(await res.json());
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createSchedule() {
    if (!name.trim() || !query.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, platform, query, cronExpr, autoScript, autoHooks }),
      });

      if (res.ok) {
        setToast({ message: "Schedule created!", type: "success" });
        setShowForm(false);
        resetForm();
        await fetchSchedules();
      }
    } catch (error) {
      console.error("Create schedule failed:", error);
      setToast({ message: "Failed to create schedule.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      await fetchSchedules();
    } catch (error) {
      console.error("Toggle failed:", error);
    }
  }

  async function removeSchedule(id: string) {
    try {
      await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
      setToast({ message: "Schedule deleted.", type: "success" });
      await fetchSchedules();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }

  function resetForm() {
    setName("");
    setQuery("");
    setPlatform("instagram");
    setCronExpr("0 9 * * *");
    setAutoScript(false);
    setAutoHooks(false);
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header"><h2>Scheduled Runs</h2><p>Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2>Scheduled Runs</h2>
            <p>Automate your content pipeline with cron-based scheduling.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ New Schedule"}
          </button>
        </div>
      </div>

      {/* Create Schedule Form */}
      {showForm && (
        <div className="card animate-scale-in" style={{ marginBottom: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>
            ⏰ New Pipeline Schedule
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div className="form-group">
              <label className="form-label">Schedule Name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning Content Scrape" />
            </div>
            <div className="form-group">
              <label className="form-label">Search Query</label>
              <input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. SaaS growth hacks" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div className="form-group">
              <label className="form-label">Platform</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {["instagram", "youtube", "twitter"].map((p) => (
                  <button key={p} className={`platform-pill ${platform === p ? "active" : ""}`} onClick={() => setPlatform(p)}>
                    {p === "instagram" ? "📸" : p === "youtube" ? "▶️" : "𝕏"} {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Frequency</label>
              <select className="form-input form-select" value={cronExpr} onChange={(e) => setCronExpr(e.target.value)}>
                {CRON_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" checked={autoScript} onChange={(e) => setAutoScript(e.target.checked)} style={{ accentColor: "var(--accent-purple)" }} />
              Auto-generate scripts
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" checked={autoHooks} onChange={(e) => setAutoHooks(e.target.checked)} style={{ accentColor: "var(--accent-purple)" }} />
              Auto-generate hooks
            </label>
          </div>

          <button className="btn btn-primary" onClick={createSchedule} disabled={saving || !name.trim() || !query.trim()}>
            {saving ? <><span className="spinner" /> Creating...</> : "⏰ Create Schedule"}
          </button>
        </div>
      )}

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⏰</div>
            <h3>No Schedules Yet</h3>
            <p>Set up automated pipeline runs to scrape and validate content on a schedule.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create Schedule</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {schedules.map((schedule, index) => (
            <div
              key={schedule.id}
              className={`card animate-fade-in stagger-${Math.min(index + 1, 5)}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px 20px",
                opacity: schedule.isActive ? 1 : 0.5,
              }}
            >
              {/* Toggle */}
              <button
                onClick={() => toggleActive(schedule.id, schedule.isActive)}
                style={{
                  width: "42px",
                  height: "24px",
                  borderRadius: "12px",
                  border: "none",
                  background: schedule.isActive ? "var(--accent-green)" : "var(--bg-tertiary)",
                  position: "relative",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "white",
                    position: "absolute",
                    top: "3px",
                    left: schedule.isActive ? "21px" : "3px",
                    transition: "left var(--transition-fast)",
                  }}
                />
              </button>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 700 }}>{schedule.name}</span>
                  <span className="badge badge-purple" style={{ fontSize: "10px" }}>
                    {schedule.platform}
                  </span>
                  {schedule.autoScript && <span className="badge badge-info" style={{ fontSize: "10px" }}>auto-script</span>}
                  {schedule.autoHooks && <span className="badge badge-success" style={{ fontSize: "10px" }}>auto-hooks</span>}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  🔎 &quot;{schedule.query}&quot; · ⏰ {CRON_LABELS[schedule.cronExpr] || schedule.cronExpr}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: "24px", flexShrink: 0 }}>
                <div className="metric">
                  <span className="metric-label">Runs</span>
                  <span className="metric-value" style={{ fontSize: "14px" }}>{schedule.runCount}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Last Run</span>
                  <span className="metric-value" style={{ fontSize: "11px" }}>{formatDate(schedule.lastRunAt)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Next Run</span>
                  <span className="metric-value" style={{ fontSize: "11px", color: "var(--accent-green)" }}>
                    {formatDate(schedule.nextRunAt)}
                  </span>
                </div>
              </div>

              {/* Delete */}
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => removeSchedule(schedule.id)}
                style={{ color: "var(--accent-rose)", flexShrink: 0 }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
