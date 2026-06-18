import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EXAMPLE_MOLECULES = [
  { name: "Rolipram (PDE4B inhibitor)", smiles: "O=C1CN(CCc2ccc(OC)c(OC)c2)CC1" },
  { name: "Sivelestat (NE inhibitor)", smiles: "CC1=CC=C(C=C1)S(=O)(=O)NC2=CC=CC=C2OCC(=O)O" },
  { name: "Roflumilast (PDE4B)", smiles: "O=C(Nc1ccc(Cl)cc1Cl)c1cnc(OCC(F)(F)F)c(OCC(F)(F)F)c1" },
];

const CLASS_INFO = {
  "PDE4B only": {
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.4)",
    desc: "This molecule is predicted to selectively inhibit PDE4B. It shows structural similarity to known PDE4B actives but lacks the pharmacophore geometry associated with Neutrophil Elastase binding.",
    icon: "◈",
  },
  "NE only": {
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.4)",
    desc: "This molecule is predicted to selectively inhibit Neutrophil Elastase (NE). Its 3D pharmacophore profile matches NE active sites but does not overlap with PDE4B binding requirements.",
    icon: "◇",
  },
  "PDE4B + NE (Dual)": {
    color: "#a855f7",
    bg: "rgba(168,85,247,0.1)",
    border: "rgba(168,85,247,0.4)",
    desc: "This molecule is predicted to inhibit both PDE4B and Neutrophil Elastase simultaneously — a rare polypharmacology profile. Dual-target compounds are of high interest for inflammatory disease therapeutics.",
    icon: "⬡",
  },
};

function ConfidenceBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700, fontFamily: "monospace" }}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div
          style={{
            width: `${value * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 4,
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

function ModelCard({ title, prediction, confidence, probs, agree }) {
  const info = CLASS_INFO[prediction] || {};
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 12,
        padding: "20px 22px",
        flex: 1,
      }}
    >
      <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20, color: info.color }}>{info.icon}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: info.color }}>{prediction}</span>
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        Confidence:{" "}
        <span style={{ color: info.color, fontWeight: 700 }}>{(confidence * 100).toFixed(1)}%</span>
      </div>
      {probs && (
        <div>
          {Object.entries(probs).map(([k, v]) => (
            <ConfidenceBar key={k} label={k} value={v} color={CLASS_INFO[k]?.color || "#94a3b8"} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [smiles, setSmiles] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const predict = async (smilesInput) => {
    const s = smilesInput || smiles;
    if (!s.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smiles: s.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prediction failed");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const mainInfo = result ? CLASS_INFO[result.prediction] : null;

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Nav ── */}
      <nav style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 40px",
        height: 58,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: "rgba(8,12,20,0.92)",
        backdropFilter: "blur(12px)",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <polygon points="13,2 24,8 24,18 13,24 2,18 2,8" stroke="#3b82f6" strokeWidth="1.5" fill="rgba(59,130,246,0.08)" />
            <polygon points="13,7 19,10.5 19,17.5 13,21 7,17.5 7,10.5" stroke="#06b6d4" strokeWidth="1" fill="rgba(6,182,212,0.06)" />
            <circle cx="13" cy="13" r="2.5" fill="#a855f7" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.5 }}>
            Phar<span style={{ color: "#3b82f6" }}>osis</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 28, fontSize: 13, color: "#64748b" }}>
          <a href="#predict" style={{ color: "#64748b", textDecoration: "none" }}>Predict</a>
          <a href="#about" style={{ color: "#64748b", textDecoration: "none" }}>About</a>
          <a href="#pipeline" style={{ color: "#64748b", textDecoration: "none" }}>Pipeline</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ textAlign: "center", padding: "80px 40px 60px", position: "relative", overflow: "hidden" }}>
        {/* background glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 300,
          background: "radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          display: "inline-block",
          fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
          color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 100, padding: "4px 14px", marginBottom: 24,
        }}>
          Polypharmacology Prediction
        </div>
        <h1 style={{
          fontSize: "clamp(32px, 5vw, 54px)",
          fontWeight: 800, letterSpacing: -1.5,
          margin: "0 0 16px",
          lineHeight: 1.1,
        }}>
          Predict dual-target activity<br />
          <span style={{
            background: "linear-gradient(90deg, #3b82f6, #06b6d4, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            from a single SMILES string
          </span>
        </h1>
        <p style={{ fontSize: 16, color: "#64748b", maxWidth: 520, margin: "0 auto 48px", lineHeight: 1.7 }}>
          A voting ensemble of two XGBoost models — trained on 3,653 molecular features and 21 spatial pharmacophore distances — to classify compounds as PDE4B-selective, NE-selective, or dual-target.
        </p>

        {/* ── Input ── */}
        <div id="predict" style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: 24,
          }}>
            <label style={{ fontSize: 12, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              SMILES Input
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={smiles}
                onChange={e => setSmiles(e.target.value)}
                onKeyDown={e => e.key === "Enter" && predict()}
                placeholder="e.g. CC1=CC=C(C=C1)S(=O)(=O)NC2=CC..."
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  color: "#e2e8f0",
                  fontSize: 13,
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <button
                onClick={() => predict()}
                disabled={loading || !smiles.trim()}
                style={{
                  background: loading ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 28px",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s",
                }}
              >
                {loading ? "Scanning..." : "Predict →"}
              </button>
            </div>

            {/* Example molecules */}
            <div style={{ marginTop: 14 }}>
              <span style={{ fontSize: 11, color: "#475569", marginRight: 10 }}>Try an example:</span>
              {EXAMPLE_MOLECULES.map(m => (
                <button
                  key={m.name}
                  onClick={() => { setSmiles(m.smiles); predict(m.smiles); }}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    color: "#94a3b8",
                    fontSize: 11,
                    cursor: "pointer",
                    marginRight: 6,
                    marginTop: 6,
                  }}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 16,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#f87171",
              fontSize: 13,
            }}>
              ✕ {error}
            </div>
          )}

          {/* ── Results ── */}
          {result && mainInfo && (
            <div style={{ marginTop: 24 }}>
              {/* Main verdict */}
              <div style={{
                background: mainInfo.bg,
                border: `1px solid ${mainInfo.border}`,
                borderRadius: 16,
                padding: "28px 28px 24px",
                marginBottom: 16,
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: -30, right: -30,
                  fontSize: 120, opacity: 0.04, color: mainInfo.color,
                  fontWeight: 900, pointerEvents: "none",
                }}>
                  {mainInfo.icon}
                </div>

                <div style={{ fontSize: 11, color: mainInfo.color, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
                  Ensemble Prediction
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 28, color: mainInfo.color }}>{mainInfo.icon}</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: mainInfo.color }}>
                    {result.prediction}
                  </span>
                  <span style={{
                    marginLeft: "auto",
                    background: mainInfo.bg,
                    border: `1px solid ${mainInfo.border}`,
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 18,
                    fontWeight: 700,
                    color: mainInfo.color,
                    fontFamily: "monospace",
                  }}>
                    {result.confidence_pct}%
                  </span>
                </div>

                {/* Agree badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <span style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 100,
                    background: result.models_agree ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                    border: `1px solid ${result.models_agree ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                    color: result.models_agree ? "#4ade80" : "#fbbf24",
                  }}>
                    {result.models_agree ? "✓ Both models agree" : "⚠ Models disagree — treat with caution"}
                  </span>
                </div>

                <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>
                  {mainInfo.desc}
                </p>
              </div>

              {/* Ensemble probability bars */}
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "18px 22px",
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 11, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
                  Ensemble Probability Breakdown
                </div>
                {Object.entries(result.ensemble_probs).map(([k, v]) => (
                  <ConfidenceBar key={k} label={k} value={v} color={CLASS_INFO[k]?.color || "#94a3b8"} />
                ))}
              </div>

              {/* Per-model cards */}
              <div style={{ display: "flex", gap: 12 }}>
                <ModelCard
                  title="Model A — All Features (3,653)"
                  prediction={result.model_all_pred}
                  confidence={result.model_all_confidence}
                  probs={result.model_all_probs}
                />
                <ModelCard
                  title="Model B — Spatial Only (21)"
                  prediction={result.model_spatial_pred}
                  confidence={result.model_spatial_confidence}
                  probs={result.model_spatial_probs}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── About ── */}
      <div id="about" style={{ maxWidth: 900, margin: "80px auto", padding: "0 40px" }}>
        <div style={{ fontSize: 11, color: "#3b82f6", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
          About
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16, letterSpacing: -0.5 }}>
          What is Pharosis?
        </h2>
        <p style={{ color: "#64748b", lineHeight: 1.8, fontSize: 15, maxWidth: 700 }}>
          Pharosis is a machine-learning tool developed to predict polypharmacology in small molecules — specifically, whether a compound inhibits <strong style={{ color: "#e2e8f0" }}>PDE4B</strong>, <strong style={{ color: "#e2e8f0" }}>Neutrophil Elastase (NE)</strong>, or both simultaneously. Dual-target inhibition is a promising strategy for inflammatory diseases where single-target therapies have shown limited efficacy.
        </p>
      </div>

      {/* ── Pipeline ── */}
      <div id="pipeline" style={{ maxWidth: 900, margin: "0 auto 100px", padding: "0 40px" }}>
        <div style={{ fontSize: 11, color: "#3b82f6", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
          Pipeline
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32, letterSpacing: -0.5 }}>
          How it works
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { step: "01", title: "SMILES Input", desc: "A canonical SMILES string is parsed and validated using RDKit." },
            { step: "02", title: "Feature Extraction", desc: "3,653 features computed: ECFP4, MACCS keys, RDKit descriptors, 2D pharmacophore, and 21 spatial 3D pharmacophore distances." },
            { step: "03", title: "Dual Model Inference", desc: "Model A uses all 3,653 features. Model B uses only the 21 spatial features — an independent geometric view." },
            { step: "04", title: "Soft Voting (70/30)", desc: "Probability outputs are blended: 70% Model A, 30% Model B, combining structural and geometric signals." },
          ].map(s => (
            <div key={s.step} style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "20px 20px 22px",
            }}>
              <div style={{ fontSize: 11, color: "#3b82f6", fontFamily: "monospace", marginBottom: 10 }}>{s.step}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Metrics strip */}
        <div style={{
          display: "flex", gap: 0,
          marginTop: 32,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          {[
            { label: "Macro F1", value: "0.859", sub: "Ensemble (70/30)" },
            { label: "ROC-AUC", value: "0.968", sub: "One-vs-Rest" },
            { label: "Balanced Acc.", value: "0.840", sub: "Test set (20%)" },
            { label: "Training set", value: "5,845", sub: "Unique compounds" },
          ].map((m, i) => (
            <div key={m.label} style={{
              flex: 1,
              padding: "22px 20px",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#3b82f6", fontFamily: "monospace" }}>{m.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "24px 40px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12,
        color: "#334155",
      }}>
        <span>Pharosis — Thesis Research Tool</span>
        <span>Built with RDKit · XGBoost · React</span>
      </div>
    </div>
  );
}
