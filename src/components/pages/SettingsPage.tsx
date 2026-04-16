"use client";

import { useState, useEffect, useCallback } from "react";

interface WeightData {
  views: number;
  er: number;
  comments: number;
  isDefault: boolean;
  sampleSize: number;
  avgAccuracy: number;
  calibratedAt?: string;
}

interface WeightHistory {
  id: string;
  viewsWeight: number;
  erWeight: number;
  commentWeight: number;
  sampleSize: number;
  avgAccuracy: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

interface Script {
  id: string;
  body: string;
  status: string;
  topic: { topicName: string };
}

interface VideoAnalysisResult {
  id: string;
  postId: string;
  overallScore: number;
  visualHooks: string;
  pacing: string;
  textOnScreen: string;
  bRollStyle: string;
  thumbnailNotes: string;
  colorPalette: string;
  transitions: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<"performance" | "weights" | "video">("performance");
  const [weights, setWeights] = useState<WeightData | null>(null);
  const [history, setHistory] = useState<WeightHistory[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [videoAnalyses, setVideoAnalyses] = useState<VideoAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalibrating, setRecalibrating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Performance form
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [actualViews, setActualViews] = useState("");
  const [actualLikes, setActualLikes] = useState("");
  const [actualComments, setActualComments] = useState("");
  const [actualER, setActualER] = useState("");
  const [postPlatform, setPostPlatform] = useState("instagram");
  const [postUrl, setPostUrl] = useState("");
  const [savingPerf, setSavingPerf] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [perfRes, scriptsRes, videoRes] = await Promise.all([
        fetch("/api/performance"),
        fetch("/api/generate-script"),
        fetch("/api/video-analysis"),
      ]);

      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setWeights(perfData.weights);
        setHistory(perfData.history);
      }
      if (scriptsRes.ok) setScripts(await scriptsRes.json());
      if (videoRes.ok) setVideoAnalyses(await videoRes.json());
    } catch (error) {
      console.error("Failed to fetch settings data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function logPerformance() {
    if (!selectedScriptId) return;
    setSavingPerf(true);

    try {
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "log",
          scriptId: selectedScriptId,
          actualViews: parseInt(actualViews) || 0,
          actualLikes: parseInt(actualLikes) || 0,
          actualComments: parseInt(actualComments) || 0,
          actualER: parseFloat(actualER) || 0,
          platform: postPlatform,
          postUrl: postUrl || undefined,
        }),
      });

      if (res.ok) {
        setToast({ message: "Performance logged!", type: "success" });
        setSelectedScriptId("");
        setActualViews("");
        setActualLikes("");
        setActualComments("");
        setActualER("");
        setPostUrl("");
      }
    } catch (error) {
      console.error("Log failed:", error);
      setToast({ message: "Failed to log performance.", type: "error" });
    } finally {
      setSavingPerf(false);
    }
  }

  async function recalibrate() {
    setRecalibrating(true);
    try {
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recalibrate" }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.message) {
          setToast({ message: result.message, type: "error" });
        } else {
          setToast({ message: `Weights recalibrated! Accuracy: ${(result.avgAccuracy * 100).toFixed(0)}%`, type: "success" });
          await fetchData();
        }
      }
    } catch (error) {
      console.error("Recalibration failed:", error);
      setToast({ message: "Recalibration failed.", type: "error" });
    } finally {
      setRecalibrating(false);
    }
  }

  async function analyzeRandomPost() {
    setAnalyzing(true);
    try {
      // Get a random scraped post
      const postsRes = await fetch("/api/scrape");
      if (!postsRes.ok) throw new Error("No posts");
      const jobs = await postsRes.json();
      if (jobs.length === 0) throw new Error("No scrape jobs");

      // Use the first post from the most recent job
      const res = await fetch("/api/video-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: jobs[0].id, // We'll use job ID as a proxy
          postIds: undefined,
        }),
      });

      if (res.ok) {
        setToast({ message: "Video analyzed!", type: "success" });
        await fetchData();
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setToast({ message: "Run pipeline first to get posts for analysis.", type: "error" });
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header"><h2>Analytics & Settings</h2><p>Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Analytics & Settings</h2>
        <p>Track performance, calibrate scoring weights, and analyze video content.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px" }}>
        {[
          { id: "performance" as const, label: "📈 Performance Tracking", icon: "📈" },
          { id: "weights" as const, label: "⚖️ Scoring Weights", icon: "⚖️" },
          { id: "video" as const, label: "🎬 Video Analysis", icon: "🎬" },
        ].map((t) => (
          <button
            key={t.id}
            className={`platform-pill ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
            style={{ padding: "10px 20px" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Performance Tracking Tab */}
      {tab === "performance" && (
        <div className="animate-fade-in">
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>
              📊 Log Post Performance
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              After posting a generated script, log the actual performance metrics here. This data feeds the ML scoring recalibration.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label">Script</label>
                <select className="form-input form-select" value={selectedScriptId} onChange={(e) => setSelectedScriptId(e.target.value)}>
                  <option value="">Select a posted script...</option>
                  {scripts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.topic.topicName} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Platform</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  {["instagram", "youtube", "twitter", "tiktok"].map((p) => (
                    <button key={p} className={`platform-pill ${postPlatform === p ? "active" : ""}`} onClick={() => setPostPlatform(p)} style={{ fontSize: "11px", padding: "6px 12px" }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
              <div className="form-group">
                <label className="form-label">Views</label>
                <input className="form-input" type="number" value={actualViews} onChange={(e) => setActualViews(e.target.value)} placeholder="e.g. 50000" />
              </div>
              <div className="form-group">
                <label className="form-label">Likes</label>
                <input className="form-input" type="number" value={actualLikes} onChange={(e) => setActualLikes(e.target.value)} placeholder="e.g. 2500" />
              </div>
              <div className="form-group">
                <label className="form-label">Comments</label>
                <input className="form-input" type="number" value={actualComments} onChange={(e) => setActualComments(e.target.value)} placeholder="e.g. 150" />
              </div>
              <div className="form-group">
                <label className="form-label">Engagement Rate %</label>
                <input className="form-input" type="number" step="0.01" value={actualER} onChange={(e) => setActualER(e.target.value)} placeholder="e.g. 5.2" />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="form-label">Post URL (optional)</label>
              <input className="form-input" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://instagram.com/p/..." />
            </div>

            <button className="btn btn-primary" onClick={logPerformance} disabled={savingPerf || !selectedScriptId}>
              {savingPerf ? <><span className="spinner" /> Saving...</> : "📊 Log Performance"}
            </button>
          </div>
        </div>
      )}

      {/* Scoring Weights Tab */}
      {tab === "weights" && (
        <div className="animate-fade-in">
          {/* Current Weights */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700 }}>
                Current Scoring Weights
              </h3>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {weights?.isDefault ? (
                  <span className="badge badge-warning">Default Weights</span>
                ) : (
                  <span className="badge badge-success">ML Calibrated</span>
                )}
                <button className="btn btn-primary btn-sm" onClick={recalibrate} disabled={recalibrating}>
                  {recalibrating ? <><span className="spinner" /> Recalibrating...</> : "🧠 Recalibrate"}
                </button>
              </div>
            </div>

            {weights && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {[
                  { label: "Views Weight", value: weights.views, color: "#7c3aed" },
                  { label: "Engagement Rate", value: weights.er, color: "#06b6d4" },
                  { label: "Comments Weight", value: weights.comments, color: "#10b981" },
                ].map((w) => (
                  <div key={w.label} style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "20px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                      {w.label}
                    </div>
                    <div style={{ fontSize: "32px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: w.color }}>
                      {(w.value * 100).toFixed(0)}%
                    </div>
                    {/* Visual bar */}
                    <div style={{ height: "6px", background: "var(--bg-primary)", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                      <div style={{ width: `${w.value * 100}%`, height: "100%", background: w.color, borderRadius: "3px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {weights && !weights.isDefault && (
              <div style={{ marginTop: "16px", fontSize: "12px", color: "var(--text-secondary)", display: "flex", gap: "16px" }}>
                <span>📊 Sample Size: <strong>{weights.sampleSize}</strong></span>
                <span>🎯 Accuracy: <strong>{(weights.avgAccuracy * 100).toFixed(0)}%</strong></span>
                {weights.calibratedAt && (
                  <span>📅 Calibrated: <strong>{new Date(weights.calibratedAt).toLocaleDateString()}</strong></span>
                )}
              </div>
            )}
          </div>

          {/* Weight History */}
          {history.length > 0 && (
            <div className="section-card">
              <div className="section-card-header">
                <h3>Weight History</h3>
              </div>
              <div className="section-card-body">
                <div className="table-container" style={{ border: "none" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Views</th>
                        <th>ER</th>
                        <th>Comments</th>
                        <th>Samples</th>
                        <th>Accuracy</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td>{new Date(h.createdAt).toLocaleDateString()}</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(h.viewsWeight * 100).toFixed(0)}%</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(h.erWeight * 100).toFixed(0)}%</td>
                          <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(h.commentWeight * 100).toFixed(0)}%</td>
                          <td>{h.sampleSize}</td>
                          <td>{(h.avgAccuracy * 100).toFixed(0)}%</td>
                          <td>
                            {h.isActive ? (
                              <span className="badge badge-success">Active</span>
                            ) : (
                              <span className="badge badge-warning">Previous</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Analysis Tab */}
      {tab === "video" && (
        <div className="animate-fade-in">
          <div className="card" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700 }}>🎬 Multimodal Video Analysis</h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Powered by Gemini Vision — analyzes visual hooks, pacing, transitions, and color palettes from viral videos.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={analyzeRandomPost} disabled={analyzing}>
                {analyzing ? <><span className="spinner" /> Analyzing...</> : "🔍 Analyze Video"}
              </button>
            </div>
          </div>

          {videoAnalyses.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">🎬</div>
                <h3>No Video Analyses</h3>
                <p>Run video analysis on scraped posts to get visual hook insights and shooting directions.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {videoAnalyses.map((analysis, index) => {
                let hooks: Array<{ type: string; timestamp: string; description: string; impact: string }> = [];
                let pacing: { avgCutDuration: number; totalCuts: number; tempo: string; energyCurve: string } | null = null;
                let palette: { dominant: string[]; accents: string[]; vibe: string } | null = null;
                let transitions: Array<{ type: string; count: number; effectiveness: string }> = [];
                
                try { hooks = JSON.parse(analysis.visualHooks || "[]"); } catch { /* ignore */ }
                try { pacing = JSON.parse(analysis.pacing || "null"); } catch { /* ignore */ }
                try { palette = JSON.parse(analysis.colorPalette || "null"); } catch { /* ignore */ }
                try { transitions = JSON.parse(analysis.transitions || "[]"); } catch { /* ignore */ }
                
                return (
                  <div key={analysis.id} className={`card animate-fade-in stagger-${Math.min(index + 1, 5)}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "15px", fontWeight: 700 }}>Analysis #{index + 1}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="badge badge-success">Score: {analysis.overallScore}</span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {new Date(analysis.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      {/* Visual Hooks */}
                      <div style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                          Visual Hooks Detected
                        </div>
                        {hooks.map((hook, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < hooks.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                            <div>
                              <span style={{ fontSize: "12px", fontWeight: 600 }}>{hook.type.replace("_", " ")}</span>
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "8px" }}>{hook.timestamp}</span>
                            </div>
                            <span className={`badge badge-${hook.impact === "high" ? "success" : hook.impact === "medium" ? "warning" : "info"}`} style={{ fontSize: "9px" }}>
                              {hook.impact}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Pacing & Transitions */}
                      <div style={{ background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", padding: "16px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
                          Pacing & Technique
                        </div>
                        {pacing && (
                          <div style={{ marginBottom: "12px" }}>
                            <div style={{ fontSize: "12px", marginBottom: "4px" }}>
                              <strong>Tempo:</strong> <span style={{ color: "var(--accent-cyan)" }}>{pacing.tempo}</span> · {pacing.avgCutDuration}s avg cuts · {pacing.totalCuts} total cuts
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                              📈 {pacing.energyCurve}
                            </div>
                          </div>
                        )}
                        {transitions.map((t, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0" }}>
                            <span>{t.type.replace("_", " ")}</span>
                            <span style={{ color: t.effectiveness === "high" ? "var(--accent-green)" : "var(--text-muted)" }}>
                              ×{t.count} ({t.effectiveness})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Color Palette & Notes */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginTop: "16px" }}>
                      {palette && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                            Color Palette
                          </div>
                          <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
                            {[...palette.dominant, ...palette.accents].map((c, i) => (
                              <div key={i} style={{ width: "24px", height: "24px", borderRadius: "4px", background: c, border: "1px solid var(--border-subtle)" }} title={c} />
                            ))}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{palette.vibe}</div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                          Text On Screen
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{analysis.textOnScreen}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                          B-Roll Style
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{analysis.bRollStyle}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
