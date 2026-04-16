"use client";

import { useState, useEffect } from "react";

interface Creative {
  id: string;
  topicId: string;
  platform: string;
  adType: string;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  status: string;
  createdAt: string;
}

interface Topic {
  id: string;
  topicName: string;
  score: number;
}

const PLATFORM_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  meta: { bg: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", icon: "📘" },
  google: { bg: "rgba(234, 67, 53, 0.12)", color: "#ea4335", icon: "🔍" },
};

const AD_TYPE_LABELS: Record<string, string> = {
  feed: "📰 Feed Ad",
  story: "📱 Story Ad",
  reel: "🎬 Reel Ad",
  search: "🔎 Search Ad",
  display: "🖼️ Display Ad",
};

export default function CampaignsPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["meta", "google"]);
  const [landingUrl, setLandingUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchData() {
    try {
      const [creativesRes, topicsRes] = await Promise.all([
        fetch("/api/campaigns"),
        fetch("/api/validate"),
      ]);

      if (creativesRes.ok) setCreatives(await creativesRes.json());
      if (topicsRes.ok) {
        const topicsData = await topicsRes.json();
        setTopics(topicsData);
        if (topicsData.length > 0 && !selectedTopicId) {
          setSelectedTopicId(topicsData[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateCampaign() {
    if (!selectedTopicId) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopicId,
          platforms: selectedPlatforms,
          landingPageUrl: landingUrl || undefined,
          targetAudience: targetAudience || undefined,
        }),
      });

      if (res.ok) {
        setToast({ message: "Campaign creatives generated!", type: "success" });
        await fetchData();
      }
    } catch (error) {
      console.error("Campaign generation failed:", error);
      setToast({ message: "Generation failed.", type: "error" });
    } finally {
      setGenerating(false);
    }
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function copyCreative(creative: Creative) {
    const text = `📌 ${creative.headline}\n\n${creative.primaryText}\n\n${creative.description}\n\nCTA: ${creative.callToAction}`;
    await navigator.clipboard.writeText(text);
    setToast({ message: "Copied to clipboard!", type: "success" });
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h2>Campaign Generator</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const groupedCreatives = creatives.reduce(
    (acc, c) => {
      const key = `${c.platform}_${c.topicId}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    },
    {} as Record<string, Creative[]>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Campaign Generator</h2>
        <p>Transform viral topics into high-converting Meta & Google ad creatives.</p>
      </div>

      {/* Generator Panel */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px" }}>
          🚀 Generate Ad Creatives
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div className="form-group">
            <label className="form-label">Source Topic</label>
            <select
              className="form-input form-select"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
            >
              <option value="">Select a topic...</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.topicName} (Score: {(t.score * 100).toFixed(0)})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Landing Page URL (optional)</label>
            <input
              type="url"
              className="form-input"
              value={landingUrl}
              onChange={(e) => setLandingUrl(e.target.value)}
              placeholder="https://your-landing-page.com"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div className="form-group">
            <label className="form-label">Ad Platforms</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { id: "meta", label: "📘 Meta Ads" },
                { id: "google", label: "🔍 Google Ads" },
              ].map((p) => (
                <button
                  key={p.id}
                  className={`platform-pill ${selectedPlatforms.includes(p.id) ? "active" : ""}`}
                  onClick={() => togglePlatform(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Target Audience (optional)</label>
            <input
              type="text"
              className="form-input"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. SaaS founders, ages 25-45"
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={generateCampaign}
          disabled={generating || !selectedTopicId || selectedPlatforms.length === 0}
        >
          {generating ? (
            <>
              <span className="spinner" /> Generating Creatives...
            </>
          ) : (
            "🚀 Generate Campaign"
          )}
        </button>
      </div>

      {/* Creatives Display */}
      {Object.keys(groupedCreatives).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <h3>No Campaigns Yet</h3>
            <p>Select a validated topic and generate ad creatives for Meta and Google.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "16px" }}>
          {creatives.map((creative, index) => {
            const platformStyle = PLATFORM_STYLES[creative.platform] || PLATFORM_STYLES.meta;
            return (
              <div
                key={creative.id}
                className={`card animate-fade-in stagger-${Math.min(index + 1, 5)}`}
                style={{ position: "relative" }}
              >
                {/* Platform badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "20px",
                      background: platformStyle.bg,
                      color: platformStyle.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {platformStyle.icon} {creative.platform}
                  </span>
                  <span className="badge badge-info">
                    {AD_TYPE_LABELS[creative.adType] || creative.adType}
                  </span>
                </div>

                {/* Ad Preview */}
                <div
                  style={{
                    background: "var(--bg-tertiary)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px",
                    marginBottom: "12px",
                    border: `1px solid ${platformStyle.color}22`,
                  }}
                >
                  <h4
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      marginBottom: "8px",
                      color: "var(--text-primary)",
                    }}
                  >
                    {creative.headline}
                  </h4>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      marginBottom: "8px",
                    }}
                  >
                    {creative.primaryText}
                  </p>
                  {creative.description && (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {creative.description}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: platformStyle.color,
                      background: platformStyle.bg,
                      padding: "4px 12px",
                      borderRadius: "4px",
                    }}
                  >
                    {creative.callToAction}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyCreative(creative)}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
            );
          })}
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
