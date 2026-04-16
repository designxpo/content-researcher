"use client";

import { useState, useEffect } from "react";
import { type Page } from "@/app/page";

interface Topic {
  id: string;
  topicName: string;
  description: string | null;
  score: number;
  cluster: string | null;
  postCount: number;
  avgViews: number;
  avgER: number;
  avgComments: number;
  status: string;
  createdAt: string;
  _count: { scripts: number };
  posts: Array<{
    post: {
      id: string;
      hookText: string | null;
      views: number;
      engagementRate: number;
      platform: string;
    };
  }>;
}

interface TopicsPageProps {
  onNavigate: (page: Page) => void;
}

export default function TopicsPage({ onNavigate }: TopicsPageProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingScript, setGeneratingScript] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  async function fetchTopics() {
    try {
      const res = await fetch("/api/validate");
      if (res.ok) {
        const data = await res.json();
        setTopics(data);
      }
    } catch (error) {
      console.error("Failed to fetch topics:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateScript(topicId: string) {
    setGeneratingScript(topicId);
    try {
      // Get or create a voice profile
      const profileRes = await fetch("/api/voice");
      let profiles = [];
      if (profileRes.ok) {
        profiles = await profileRes.json();
      }

      let voiceProfileId: string;
      if (profiles.length > 0) {
        voiceProfileId = profiles[0].id;
      } else {
        const newProfile = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Default", sampleScripts: [] }),
        });
        const profileData = await newProfile.json();
        voiceProfileId = profileData.id;
      }

      // Generate script
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, voiceProfileId }),
      });

      if (res.ok) {
        const scriptData = await res.json();
        // Generate hooks for the script
        await fetch("/api/generate-hooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptId: scriptData.scriptId }),
        });

        onNavigate("scripts");
      }
    } catch (error) {
      console.error("Script generation failed:", error);
    } finally {
      setGeneratingScript(null);
    }
  }

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h2>Validated Topics</h2>
          <p>Loading topics...</p>
        </div>
        <div className="stats-grid">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card"
              style={{
                height: "200px",
                opacity: 0.3,
                animation: "pulse-glow 2s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Validated Topics</h2>
        <p>
          High-signal topics ranked by our scoring algorithm. Click
          &quot;Generate Script&quot; to create content.
        </p>
      </div>

      {topics.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>No Validated Topics Yet</h3>
            <p>
              Run the pipeline from the Dashboard to scrape and validate content
              topics from your target platforms.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate("dashboard")}
            >
              ⚡ Go to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <div className="topics-grid">
          {topics.map((topic, index) => (
            <div
              key={topic.id}
              className={`topic-card animate-fade-in stagger-${Math.min(index + 1, 5)}`}
            >
              <div className="topic-card-header">
                <div className="topic-score">
                  {(topic.score * 100).toFixed(0)}
                </div>
                {topic.cluster && (
                  <span className="topic-cluster-badge">{topic.cluster}</span>
                )}
              </div>

              <h3 className="topic-name">{topic.topicName}</h3>
              {topic.description && (
                <p className="topic-description">{topic.description}</p>
              )}

              <div className="topic-metrics">
                <div className="metric">
                  <span className="metric-label">Avg Views</span>
                  <span className="metric-value">
                    {formatNumber(topic.avgViews)}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Avg ER</span>
                  <span className="metric-value">{topic.avgER}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Posts</span>
                  <span className="metric-value">{topic.postCount}</span>
                </div>
              </div>

              {/* Evidence posts */}
              {topic.posts.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <span
                    className="form-label"
                    style={{ marginBottom: "8px", display: "block" }}
                  >
                    Top Evidence
                  </span>
                  {topic.posts.slice(0, 3).map((tp) => (
                    <div
                      key={tp.post.id}
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        padding: "6px 0",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "200px",
                        }}
                      >
                        {tp.post.hookText || "—"}
                      </span>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          color: "var(--text-muted)",
                          fontSize: "11px",
                        }}
                      >
                        {formatNumber(tp.post.views)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: "16px" }}>
                {topic._count.scripts > 0 ? (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate("scripts")}
                  >
                    ✍️ View Script
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => generateScript(topic.id)}
                    disabled={generatingScript === topic.id}
                  >
                    {generatingScript === topic.id ? (
                      <>
                        <span className="spinner" />
                        Generating...
                      </>
                    ) : (
                      <>✍️ Generate Script</>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
