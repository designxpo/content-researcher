"use client";

import { useState, useEffect } from "react";
import { type Page } from "@/app/page";

interface DashboardPageProps {
  onNavigate: (page: Page) => void;
}

interface Stats {
  totalPosts: number;
  totalTopics: number;
  totalScripts: number;
  totalHooks: number;
}

interface TopTopic {
  id: string;
  topicName: string;
  score: number;
  avgViews: number;
  avgER: number;
}

interface RecentJob {
  id: string;
  platform: string;
  query: string;
  status: string;
  postsFound: number;
  startedAt: string;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [stats, setStats] = useState<Stats>({
    totalPosts: 0,
    totalTopics: 0,
    totalScripts: 0,
    totalHooks: 0,
  });
  const [topTopics, setTopTopics] = useState<TopTopic[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [query, setQuery] = useState("content creation");
  const [platform, setPlatform] = useState("instagram");
  const [toast, setToast] = useState<{
    message: string;
    type: string;
  } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchDashboardData() {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setTopTopics(data.topTopics || []);
        setRecentJobs(data.recentJobs || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }

  async function runPipeline() {
    if (!query.trim()) return;

    setPipelineRunning(true);
    setPipelineStep(1);

    try {
      // Simulate step progression for visual effect
      const stepDelays = [800, 1500, 2200];
      for (let i = 0; i < stepDelays.length; i++) {
        await new Promise((r) => setTimeout(r, stepDelays[i]));
        setPipelineStep(i + 2);
      }

      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, query }),
      });

      if (!res.ok) throw new Error("Pipeline failed");

      setPipelineStep(4);
      setToast({ message: "Pipeline completed successfully!", type: "success" });
      await fetchDashboardData();

      // Reset after a moment
      setTimeout(() => {
        setPipelineStep(0);
        setPipelineRunning(false);
      }, 2000);
    } catch (error) {
      console.error("Pipeline error:", error);
      setToast({ message: "Pipeline failed. Check the console.", type: "error" });
      setPipelineRunning(false);
      setPipelineStep(0);
    }
  }

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Command Center</h2>
        <p>
          Run the full pipeline or manage individual agents from here.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card purple animate-fade-in stagger-1">
          <div className="stat-card-header">
            <span className="stat-label">Scraped Posts</span>
            <div className="stat-icon purple">📥</div>
          </div>
          <div className="stat-value">{formatNumber(stats.totalPosts)}</div>
        </div>
        <div className="stat-card cyan animate-fade-in stagger-2">
          <div className="stat-card-header">
            <span className="stat-label">Validated Topics</span>
            <div className="stat-icon cyan">📊</div>
          </div>
          <div className="stat-value">{stats.totalTopics}</div>
        </div>
        <div className="stat-card amber animate-fade-in stagger-3">
          <div className="stat-card-header">
            <span className="stat-label">Scripts Generated</span>
            <div className="stat-icon amber">✍️</div>
          </div>
          <div className="stat-value">{stats.totalScripts}</div>
        </div>
        <div className="stat-card green animate-fade-in stagger-4">
          <div className="stat-card-header">
            <span className="stat-label">Hooks Ready</span>
            <div className="stat-icon green">🎣</div>
          </div>
          <div className="stat-value">{stats.totalHooks}</div>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="pipeline-stepper">
        {[
          { label: "Scrape", sublabel: "Data Ingestion", icon: "1" },
          { label: "Validate", sublabel: "Score & Cluster", icon: "2" },
          { label: "Script", sublabel: "Voice Synthesis", icon: "3" },
          { label: "Hooks", sublabel: "5 Variations", icon: "4" },
        ].map((step, i) => (
          <div
            key={step.label}
            className={`pipeline-step ${pipelineStep > i + 1 ? "completed" : ""} ${pipelineStep === i + 1 ? "active" : ""}`}
          >
            <div className="step-circle">
              {pipelineStep > i + 1 ? "✓" : step.icon}
            </div>
            <div className="step-info">
              <span className="step-label">{step.label}</span>
              <span className="step-sublabel">{step.sublabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Control */}
      <div className="pipeline-control animate-fade-in stagger-3">
        <div className="pipeline-control-header">
          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Run Pipeline</h3>
          <div className="platform-pills">
            {["instagram", "youtube", "twitter"].map((p) => (
              <button
                key={p}
                className={`platform-pill ${platform === p ? "active" : ""}`}
                onClick={() => setPlatform(p)}
                disabled={pipelineRunning}
              >
                {p === "instagram" ? "📸" : p === "youtube" ? "▶️" : "𝕏"}{" "}
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="pipeline-form">
          <div className="form-group">
            <label className="form-label">Search Query</label>
            <input
              type="text"
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. content creation, fitness, SaaS growth..."
              disabled={pipelineRunning}
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={runPipeline}
            disabled={pipelineRunning || !query.trim()}
            style={{ minWidth: "180px" }}
          >
            {pipelineRunning ? (
              <>
                <span className="spinner" />
                Processing...
              </>
            ) : (
              <>⚡ Run Pipeline</>
            )}
          </button>
        </div>
      </div>

      {/* Two-column bottom section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Top Topics */}
        <div className="section-card animate-fade-in stagger-4">
          <div className="section-card-header">
            <h3>Top Topics</h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate("topics")}
            >
              View All →
            </button>
          </div>
          <div className="section-card-body">
            {topTopics.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 16px" }}>
                <p style={{ marginBottom: 0 }}>
                  Run the pipeline to see validated topics here.
                </p>
              </div>
            ) : (
              <div className="activity-feed">
                {topTopics.map((topic) => (
                  <div className="activity-item" key={topic.id}>
                    <span
                      className="activity-dot success"
                      style={{ width: 6, height: 6 }}
                    />
                    <span style={{ flex: 1, fontSize: "13px" }}>
                      {topic.topicName}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--accent-purple)",
                      }}
                    >
                      {(topic.score * 100).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="section-card animate-fade-in stagger-5">
          <div className="section-card-header">
            <h3>Recent Scrape Jobs</h3>
          </div>
          <div className="section-card-body">
            {recentJobs.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 16px" }}>
                <p style={{ marginBottom: 0 }}>
                  No scrape jobs yet. Run the pipeline to get started.
                </p>
              </div>
            ) : (
              <div className="activity-feed">
                {recentJobs.map((job) => (
                  <div className="activity-item" key={job.id}>
                    <span
                      className={`activity-dot ${job.status === "completed" ? "success" : job.status === "running" ? "running" : "pending"}`}
                    />
                    <span style={{ flex: 1, fontSize: "13px" }}>
                      <strong>{job.platform}</strong> — &quot;{job.query}&quot;
                    </span>
                    <span className="badge badge-success" style={{ fontSize: "10px" }}>
                      {job.postsFound} posts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
