"use client";

import { useState, useEffect } from "react";

interface VoiceProfile {
  id: string;
  name: string;
  sampleScripts: string;
  energy: number;
  sentenceLength: string;
  formality: string;
  humor: number;
  ctas: string | null;
  analysisResult: string | null;
  isActive: boolean;
}

interface VoiceAnalysis {
  summary?: string;
  tone_keywords?: string[];
  recurring_patterns?: string[];
  vocabulary_level?: string;
  sentence_avg_length?: string;
  energy?: number;
  formality?: string;
  humor?: number;
  common_ctas?: string[];
}

export default function VoicePage() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scriptInput, setScriptInput] = useState("");
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  // Form state
  const [name, setName] = useState("My Voice");
  const [energy, setEnergy] = useState(7);
  const [sentenceLength, setSentenceLength] = useState("medium");
  const [formality, setFormality] = useState("casual");
  const [humor, setHumor] = useState(5);

  useEffect(() => {
    fetchProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function fetchProfiles() {
    try {
      const res = await fetch("/api/voice");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
        if (data.length > 0) {
          selectProfileData(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
    } finally {
      setLoading(false);
    }
  }

  function selectProfileData(profile: VoiceProfile) {
    setSelectedProfile(profile);
    setName(profile.name);
    setEnergy(profile.energy);
    setSentenceLength(profile.sentenceLength);
    setFormality(profile.formality);
    setHumor(profile.humor);
    const scripts = JSON.parse(profile.sampleScripts || "[]");
    setScriptInput(scripts.join("\n\n---\n\n"));
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const sampleScripts = scriptInput
        .split("---")
        .map((s) => s.trim())
        .filter(Boolean);

      if (selectedProfile) {
        // Update existing
        const res = await fetch("/api/voice", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedProfile.id,
            name,
            energy,
            sentenceLength,
            formality,
            humor,
            sampleScripts,
          }),
        });
        if (res.ok) {
          setToast({ message: "Voice profile updated!", type: "success" });
          await fetchProfiles();
        }
      } else {
        // Create new
        const res = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            energy,
            sentenceLength,
            formality,
            humor,
            sampleScripts,
          }),
        });
        if (res.ok) {
          setToast({ message: "Voice profile created!", type: "success" });
          await fetchProfiles();
        }
      }
    } catch (error) {
      console.error("Save failed:", error);
      setToast({ message: "Failed to save profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function createNewProfile() {
    setSelectedProfile(null);
    setName("New Voice Profile");
    setEnergy(7);
    setSentenceLength("medium");
    setFormality("casual");
    setHumor(5);
    setScriptInput("");
  }

  const energyLabel =
    energy >= 8
      ? "🔥 High Energy"
      : energy >= 5
        ? "⚡ Balanced"
        : "🧊 Calm & Measured";

  const humorLabel =
    humor >= 8
      ? "😂 Very Funny"
      : humor >= 5
        ? "😄 Occasional Humor"
        : "😎 Straight & Serious";

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h2>Voice Profile</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Parse analysis result for display
  let analysis: VoiceAnalysis | null = null;
  if (selectedProfile?.analysisResult) {
    try {
      analysis = JSON.parse(selectedProfile.analysisResult);
    } catch {
      // ignore
    }
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
            <h2>Voice Profile</h2>
            <p>
              Calibrate your unique voice for AI-generated scripts. Upload sample
              scripts and tune parameters.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-secondary btn-sm" onClick={createNewProfile}>
              + New Profile
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner" />
                  Saving...
                </>
              ) : (
                "💾 Save Profile"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Profile selector */}
      {profiles.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className={`platform-pill ${selectedProfile?.id === profile.id ? "active" : ""}`}
              onClick={() => selectProfileData(profile)}
            >
              🎙️ {profile.name}
            </button>
          ))}
        </div>
      )}

      <div className="voice-grid">
        {/* Left: Parameters */}
        <div>
          <div className="card" style={{ marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "20px",
              }}
            >
              Voice Parameters
            </h3>

            <div className="voice-sliders">
              {/* Profile Name */}
              <div className="form-group">
                <label className="form-label">Profile Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Brand Voice"
                />
              </div>

              {/* Energy Slider */}
              <div className="slider-container">
                <div className="slider-header">
                  <label className="form-label">Energy Level</label>
                  <span className="slider-value">
                    {energy}/10 {energyLabel}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={energy}
                  onChange={(e) => setEnergy(parseInt(e.target.value))}
                />
              </div>

              {/* Humor Slider */}
              <div className="slider-container">
                <div className="slider-header">
                  <label className="form-label">Humor Level</label>
                  <span className="slider-value">
                    {humor}/10 {humorLabel}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={humor}
                  onChange={(e) => setHumor(parseInt(e.target.value))}
                />
              </div>

              {/* Sentence Length */}
              <div className="form-group">
                <label className="form-label">Sentence Length</label>
                <select
                  className="form-input form-select"
                  value={sentenceLength}
                  onChange={(e) => setSentenceLength(e.target.value)}
                >
                  <option value="short">Short & Punchy (5-10 words)</option>
                  <option value="medium">Medium (natural rhythm)</option>
                  <option value="long">Long & Detailed</option>
                </select>
              </div>

              {/* Formality */}
              <div className="form-group">
                <label className="form-label">Formality</label>
                <select
                  className="form-input form-select"
                  value={formality}
                  onChange={(e) => setFormality(e.target.value)}
                >
                  <option value="casual">Casual — like talking to a friend</option>
                  <option value="balanced">Balanced — professional but approachable</option>
                  <option value="professional">Professional — authoritative</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sample Scripts */}
          <div className="card">
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              Sample Scripts
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                marginBottom: "16px",
              }}
            >
              Paste your past scripts here. Separate multiple scripts with
              &quot;---&quot;. We&apos;ll analyze your vocabulary, pacing, and
              tone.
            </p>
            <textarea
              className="form-input form-textarea"
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              placeholder={`Paste your script here...\n\n---\n\nPaste another script here...`}
              style={{ minHeight: "200px" }}
            />
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "8px",
              }}
            >
              {scriptInput.split("---").filter((s) => s.trim()).length} scripts
              loaded
            </div>
          </div>
        </div>

        {/* Right: Preview & Analysis */}
        <div>
          <div className="voice-preview" style={{ marginBottom: "20px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                marginBottom: "16px",
              }}
            >
              Voice Fingerprint
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div className="metric">
                <span className="metric-label">Energy</span>
                <span className="metric-value">{energy}/10</span>
              </div>
              <div className="metric">
                <span className="metric-label">Humor</span>
                <span className="metric-value">{humor}/10</span>
              </div>
              <div className="metric">
                <span className="metric-label">Sentences</span>
                <span className="metric-value" style={{ fontSize: "13px" }}>
                  {sentenceLength}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Tone</span>
                <span className="metric-value" style={{ fontSize: "13px" }}>
                  {formality}
                </span>
              </div>
            </div>

            {/* Visual representation */}
            <div
              style={{
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "12px",
                }}
              >
                Voice DNA
              </div>
              {[
                { label: "Energy", value: energy, color: "#f59e0b" },
                { label: "Humor", value: humor, color: "#06b6d4" },
                {
                  label: "Formality",
                  value:
                    formality === "casual"
                      ? 3
                      : formality === "balanced"
                        ? 6
                        : 9,
                  color: "#7c3aed",
                },
                {
                  label: "Detail",
                  value:
                    sentenceLength === "short"
                      ? 3
                      : sentenceLength === "medium"
                        ? 6
                        : 9,
                  color: "#10b981",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                      width: "70px",
                    }}
                  >
                    {item.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "6px",
                      background: "var(--bg-primary)",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${item.value * 10}%`,
                        height: "100%",
                        background: item.color,
                        borderRadius: "3px",
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                      color: item.color,
                      width: "24px",
                      textAlign: "right",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Results */}
          {analysis && (
            <div className="card animate-fade-in">
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  marginBottom: "16px",
                }}
              >
                🤖 AI Voice Analysis
              </h3>

              {analysis.summary && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    marginBottom: "16px",
                  }}
                >
                  {analysis.summary}
                </p>
              )}

              {analysis.tone_keywords && (
                <div style={{ marginBottom: "12px" }}>
                  <span className="form-label" style={{ marginBottom: "8px", display: "block" }}>
                    Tone Keywords
                  </span>
                  <div>
                    {analysis.tone_keywords.map((kw: string) => (
                      <span className="voice-chip" key={kw}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.recurring_patterns && (
                <div>
                  <span className="form-label" style={{ marginBottom: "8px", display: "block" }}>
                    Recurring Patterns
                  </span>
                  {analysis.recurring_patterns.map((pattern: string, i: number) => (
                    <div
                      key={i}
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        padding: "4px 0",
                      }}
                    >
                      • {pattern}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!analysis && (
            <div className="card" style={{ textAlign: "center", padding: "32px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.4 }}>
                🤖
              </div>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                Add sample scripts and save your profile to get AI-powered voice
                analysis. Requires an Anthropic API key.
              </p>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span>{toast.type === "success" ? "✅" : "❌"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
