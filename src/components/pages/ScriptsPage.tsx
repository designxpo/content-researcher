"use client";

import { useState, useEffect } from "react";

interface Hook {
  id: string;
  hookText: string;
  framework: string;
  selected: boolean;
}

interface Script {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  topic: {
    id: string;
    topicName: string;
    score: number;
  };
  voiceProfile: {
    name: string;
    energy: number;
  };
  hooks: Hook[];
}

const FRAMEWORK_META: Record<
  string,
  { emoji: string; name: string; color: string }
> = {
  aspirational: { emoji: "🔥", name: "Aspirational", color: "#f59e0b" },
  pain_point: { emoji: "😰", name: "Pain Point", color: "#f43f5e" },
  exclusivity: { emoji: "🔒", name: "Exclusivity", color: "#7c3aed" },
  curiosity: { emoji: "🤔", name: "Curiosity Gap", color: "#06b6d4" },
  contrarian: { emoji: "⚡", name: "Contrarian", color: "#10b981" },
};

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchScripts();
  }, []);

  async function fetchScripts() {
    try {
      const res = await fetch("/api/generate-script");
      if (res.ok) {
        const data = await res.json();
        setScripts(data);
        if (data.length > 0) {
          setSelectedScript(data[0]);
          setEditedBody(data[0].body);
        }
      }
    } catch (error) {
      console.error("Failed to fetch scripts:", error);
    } finally {
      setLoading(false);
    }
  }

  function selectHook(hookId: string) {
    if (!selectedScript) return;
    setSelectedScript({
      ...selectedScript,
      hooks: selectedScript.hooks.map((h) => ({
        ...h,
        selected: h.id === hookId,
      })),
    });
  }

  async function copyFullScript() {
    if (!selectedScript) return;
    const selectedHook = selectedScript.hooks.find((h) => h.selected);
    const fullScript = selectedHook
      ? `${selectedHook.hookText}\n\n${editedBody}`
      : editedBody;

    await navigator.clipboard.writeText(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateHooks() {
    if (!selectedScript) return;
    try {
      const res = await fetch("/api/generate-hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId: selectedScript.id }),
      });
      if (res.ok) {
        await fetchScripts();
      }
    } catch (error) {
      console.error("Hook regeneration failed:", error);
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h2>Script Studio</h2>
          <p>Loading scripts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h2>Script Studio</h2>
            <p>Edit scripts, select hooks, and export production-ready content.</p>
          </div>
          {scripts.length > 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn btn-secondary btn-sm" onClick={regenerateHooks}>
                🔄 Regenerate Hooks
              </button>
              <button className="btn btn-primary btn-sm" onClick={copyFullScript}>
                {copied ? "✅ Copied!" : "📋 Copy Full Script"}
              </button>
            </div>
          )}
        </div>
      </div>

      {scripts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✍️</div>
            <h3>No Scripts Generated</h3>
            <p>
              Go to Validated Topics and click &quot;Generate Script&quot; on a topic, or
              run the full pipeline from the Dashboard.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Script selector */}
          {scripts.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "20px",
                flexWrap: "wrap",
              }}
            >
              {scripts.map((script) => (
                <button
                  key={script.id}
                  className={`platform-pill ${selectedScript?.id === script.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedScript(script);
                    setEditedBody(script.body);
                  }}
                >
                  {script.topic.topicName}
                </button>
              ))}
            </div>
          )}

          <div className="script-studio">
            {/* Left: Script Editor */}
            <div className="script-editor-panel">
              {selectedScript && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "4px",
                    }}
                  >
                    <h3 style={{ fontSize: "16px", fontWeight: 700 }}>
                      {selectedScript.topic.topicName}
                    </h3>
                    <span className={`badge badge-${selectedScript.status === "approved" ? "success" : "warning"}`}>
                      {selectedScript.status}
                    </span>
                  </div>

                  {/* Selected hook preview */}
                  {selectedScript.hooks.some((h) => h.selected) && (
                    <div
                      style={{
                        background: "var(--accent-purple-dim)",
                        border: "1px solid var(--accent-purple)",
                        borderRadius: "var(--radius-md)",
                        padding: "16px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "var(--accent-purple)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Selected Hook
                      </span>
                      <p
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          marginTop: "6px",
                          lineHeight: 1.4,
                        }}
                      >
                        {selectedScript.hooks.find((h) => h.selected)?.hookText}
                      </p>
                    </div>
                  )}

                  <div className="script-editor">
                    <textarea
                      className="script-textarea"
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      placeholder="Script body will appear here..."
                    />
                  </div>

                  {/* Word count */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span>
                      {editedBody.split(/\s+/).filter(Boolean).length} words
                    </span>
                    <span>
                      ~{Math.ceil(editedBody.split(/\s+/).filter(Boolean).length / 2.5)}s
                      speaking time
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Right: Hooks Panel */}
            <div className="hooks-panel">
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  marginBottom: "4px",
                }}
              >
                Hook Variations
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-tertiary)",
                  marginBottom: "8px",
                }}
              >
                Select a hook to pair with your script
              </p>

              {selectedScript?.hooks.map((hook) => {
                const meta = FRAMEWORK_META[hook.framework] || {
                  emoji: "📌",
                  name: hook.framework,
                  color: "#7c3aed",
                };
                return (
                  <div
                    key={hook.id}
                    className={`hook-card ${hook.selected ? "selected" : ""}`}
                    onClick={() => selectHook(hook.id)}
                  >
                    <div
                      className="hook-framework-badge"
                      style={{
                        background: `${meta.color}15`,
                        color: meta.color,
                      }}
                    >
                      {meta.emoji} {meta.name}
                    </div>
                    <p className="hook-text">{hook.hookText}</p>
                  </div>
                );
              })}

              {(!selectedScript || selectedScript.hooks.length === 0) && (
                <div
                  className="card"
                  style={{
                    textAlign: "center",
                    padding: "32px",
                    color: "var(--text-muted)",
                    fontSize: "13px",
                  }}
                >
                  No hooks generated yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
