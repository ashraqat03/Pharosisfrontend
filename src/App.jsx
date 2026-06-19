import { useState, useRef, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EXAMPLES = [
  { name: "Rolipram", smiles: "O=C1CN(CCc2ccc(OC)c(OC)c2)CC1" },
  { name: "Sivelestat", smiles: "CC1=CC=C(C=C1)S(=O)(=O)NC2=CC=CC=C2OCC(=O)O" },
  { name: "Roflumilast", smiles: "O=C(Nc1ccc(Cl)cc1Cl)c1cnc(OCC(F)(F)F)c(OCC(F)(F)F)c1" },
];

const CLASS_INFO = {
  "PDE4B only":        { color: "#38bdf8", glow: "rgba(56,189,248,0.18)",  icon: "◈", short: "PDE4B" },
  "NE only":           { color: "#818cf8", glow: "rgba(129,140,248,0.18)", icon: "◇", short: "NE" },
  "PDE4B + NE (Dual)": { color: "#f472b6", glow: "rgba(244,114,182,0.22)", icon: "⬡", short: "DUAL" },
};
const CLASS_KEYS = Object.keys(CLASS_INFO);

/* ── Animated SVG background ── */
function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="g1" cx="20%" cy="20%" r="60%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g2" cx="80%" cy="70%" r="55%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g3" cx="60%" cy="10%" r="40%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="#060912" />
        <rect width="100%" height="100%" fill="url(#g1)" />
        <rect width="100%" height="100%" fill="url(#g2)" />
        <rect width="100%" height="100%" fill="url(#g3)" />
        {/* Hexagon grid */}
        {Array.from({ length: 80 }).map((_, i) => {
          const col = i % 10, row = Math.floor(i / 10);
          const x = col * 120 + (row % 2) * 60 + 20;
          const y = row * 104 + 20;
          const size = 36;
          const pts = Array.from({ length: 6 }, (__, k) => {
            const a = (Math.PI / 3) * k - Math.PI / 6;
            return `${x + size * Math.cos(a)},${y + size * Math.sin(a)}`;
          }).join(" ");
          return (
            <polygon key={i} points={pts}
              fill="none"
              stroke="rgba(148,163,184,0.035)"
              strokeWidth="1"
            />
          );
        })}
      </svg>
      <style>{`
        @keyframes pulse1 { 0%,100%{opacity:0.7} 50%{opacity:1} }
        @keyframes pulse2 { 0%,100%{opacity:0.5} 50%{opacity:0.9} }
      `}</style>
    </div>
  );
}

/* ── Logo ── */
function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <polygon points="16,2 29,9 29,23 16,30 3,23 3,9"
        stroke="#38bdf8" strokeWidth="1.5" fill="rgba(56,189,248,0.07)" />
      <polygon points="16,8 23,12 23,20 16,24 9,20 9,12"
        stroke="#818cf8" strokeWidth="1" fill="rgba(129,140,248,0.06)" />
      <circle cx="16" cy="16" r="3" fill="#f472b6" />
      <circle cx="16" cy="16" r="1.2" fill="#fff" />
    </svg>
  );
}

/* ── Prob bar ── */
function ProbBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 700, fontFamily: "monospace" }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 3, height: 4 }}>
        <div style={{
          width: `${value * 100}%`, height: "100%",
          background: `linear-gradient(90deg,${color}66,${color})`,
          borderRadius: 3, transition: "width 0.9s cubic-bezier(.4,0,.2,1)",
        }} />
      </div>
    </div>
  );
}

/* ── Single result card ── */
function ResultCard({ item, index }) {
  const info = CLASS_INFO[item.prediction] || CLASS_INFO["PDE4B only"];
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${info.color}44`,
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: `0 0 24px ${info.glow}`,
      marginBottom: 12,
    }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
        cursor: "pointer", userSelect: "none",
      }} onClick={() => setOpen(o => !o)}>
        <span style={{
          fontSize: 11, fontFamily: "monospace", color: "#475569",
          background: "rgba(255,255,255,0.05)", borderRadius: 6,
          padding: "2px 8px", minWidth: 28, textAlign: "center",
        }}>#{index + 1}</span>

        {/* Prediction badge */}
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1,
          color: info.color,
          background: `${info.color}18`,
          border: `1px solid ${info.color}44`,
          borderRadius: 6, padding: "3px 10px",
        }}>{info.icon} {info.short}</span>

        {/* Confidence */}
        <span style={{ fontSize: 13, fontWeight: 700, color: info.color, marginLeft: 2 }}>
          {item.confidence_pct}%
        </span>

        {/* Models agree badge */}
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 100,
          background: item.models_agree ? "rgba(34,197,94,0.08)" : "rgba(251,191,36,0.08)",
          border: `1px solid ${item.models_agree ? "rgba(34,197,94,0.25)" : "rgba(251,191,36,0.25)"}`,
          color: item.models_agree ? "#4ade80" : "#fbbf24",
          marginLeft: "auto",
        }}>
          {item.models_agree ? "✓ Agree" : "⚠ Disagree"}
        </span>

        {/* SMILES truncated */}
        <span style={{ fontSize: 10, color: "#334155", fontFamily: "monospace",
          maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.smiles}
        </span>

        <span style={{ color: "#475569", fontSize: 12, marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "16px 18px" }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {/* Ensemble probs */}
            <div style={{ flex: 2, minWidth: 200 }}>
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                Ensemble Probabilities
              </div>
              {CLASS_KEYS.map(k => (
                <ProbBar key={k} label={k} value={item.ensemble_probs[k]} color={CLASS_INFO[k].color} />
              ))}
            </div>
            {/* Model A */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                Model A (All features)
              </div>
              <div style={{ fontSize: 12, color: CLASS_INFO[item.model_all_pred]?.color, fontWeight: 600, marginBottom: 6 }}>
                {item.model_all_pred}
              </div>
              {CLASS_KEYS.map(k => (
                <ProbBar key={k} label={CLASS_INFO[k].short} value={item.model_all_probs[k]} color={CLASS_INFO[k].color} />
              ))}
            </div>
            {/* Model B */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                Model B (Spatial)
              </div>
              <div style={{ fontSize: 12, color: CLASS_INFO[item.model_spatial_pred]?.color, fontWeight: 600, marginBottom: 6 }}>
                {item.model_spatial_pred}
              </div>
              {CLASS_KEYS.map(k => (
                <ProbBar key={k} label={CLASS_INFO[k].short} value={item.model_spatial_probs[k]} color={CLASS_INFO[k].color} />
              ))}
            </div>
          </div>

          {/* Full SMILES */}
          <div style={{
            marginTop: 14, background: "rgba(0,0,0,0.3)", borderRadius: 8,
            padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#64748b",
            wordBreak: "break-all",
          }}>
            {item.smiles}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Summary stats bar ── */
function SummaryBar({ results }) {
  const counts = { "PDE4B only": 0, "NE only": 0, "PDE4B + NE (Dual)": 0, error: 0 };
  results.forEach(r => {
    if (r.error) counts.error++;
    else counts[r.prediction] = (counts[r.prediction] || 0) + 1;
  });
  const total = results.length;
  return (
    <div style={{
      display: "flex", gap: 10, flexWrap: "wrap",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, padding: "14px 20px", marginBottom: 20,
    }}>
      <span style={{ fontSize: 12, color: "#475569", marginRight: 6, alignSelf: "center" }}>
        {total} compound{total !== 1 ? "s" : ""} scanned
      </span>
      {CLASS_KEYS.map(k => counts[k] > 0 && (
        <span key={k} style={{
          fontSize: 11, padding: "3px 12px", borderRadius: 100,
          background: `${CLASS_INFO[k].color}14`,
          border: `1px solid ${CLASS_INFO[k].color}33`,
          color: CLASS_INFO[k].color, fontWeight: 600,
        }}>
          {CLASS_INFO[k].icon} {CLASS_INFO[k].short}: {counts[k]}
        </span>
      ))}
      {counts.error > 0 && (
        <span style={{
          fontSize: 11, padding: "3px 12px", borderRadius: 100,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          color: "#f87171", fontWeight: 600,
        }}>
          ✕ Errors: {counts.error}
        </span>
      )}
      {/* Download CSV */}
      <button onClick={() => downloadCSV(results)} style={{
        marginLeft: "auto", fontSize: 11, padding: "3px 14px", borderRadius: 100,
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        color: "#94a3b8", cursor: "pointer",
      }}>
        ↓ Export CSV
      </button>
    </div>
  );
}

function downloadCSV(results) {
  const header = ["smiles", "prediction", "confidence_pct", "models_agree",
    "prob_pde4b", "prob_ne", "prob_dual", "model_a", "model_b"];
  const rows = results.map(r => r.error
    ? [r.smiles, "ERROR", "", "", "", "", "", "", ""]
    : [
        r.smiles, r.prediction, r.confidence_pct, r.models_agree,
        r.ensemble_probs["PDE4B only"], r.ensemble_probs["NE only"], r.ensemble_probs["PDE4B + NE (Dual)"],
        r.model_all_pred, r.model_spatial_pred,
      ]
  );
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = "pharosis_results.csv"; a.click();
}

/* ══════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════ */
export default function App() {
  const [mode, setMode] = useState("text"); // "text" | "file"
  const [textInput, setTextInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsedSmiles, setParsedSmiles] = useState([]);
  const fileRef = useRef();

  /* Parse SMILES from text area or file */
  const parseSmiles = (raw) =>
    raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

  const handleFileLoad = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const smilesList = parseSmiles(e.target.result);
      setParsedSmiles(smilesList);
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback(e => {
    e.preventDefault(); setDragOver(false);
    handleFileLoad(e.dataTransfer.files[0]);
  }, []);

  /* Run predictions */
  const runPredictions = async () => {
    const smilesList = mode === "text"
      ? parseSmiles(textInput)
      : parsedSmiles;

    if (!smilesList.length) return;
    setLoading(true);
    setResults([]);
    setProgress({ done: 0, total: smilesList.length });

    const out = [];
    for (let i = 0; i < smilesList.length; i++) {
      const smi = smilesList[i];
      try {
        const res = await fetch(`${API_URL}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ smiles: smi }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        out.push(data);
      } catch (err) {
        out.push({ smiles: smi, error: err.message });
      }
      setProgress({ done: i + 1, total: smilesList.length });
      setResults([...out]);
    }
    setLoading(false);
  };

  const successResults = results.filter(r => !r.error);
  const errorResults   = results.filter(r => r.error);

  return (
    <div style={{ minHeight: "100vh", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif", position: "relative" }}>
      <Background />

      {/* ── Nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(6,9,18,0.85)", backdropFilter: "blur(16px)",
        padding: "0 48px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={26} />
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
            Pharosis
          </span>
          <span style={{
            fontSize: 10, letterSpacing: 2, textTransform: "uppercase",
            color: "#38bdf8", marginLeft: 6,
            background: "rgba(56,189,248,0.08)",
            border: "1px solid rgba(56,189,248,0.2)",
            borderRadius: 100, padding: "2px 8px",
          }}>Beta</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 13, color: "#475569" }}>
          {["Predict", "About", "Pipeline"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
              style={{ color: "#475569", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = "#e2e8f0"}
              onMouseLeave={e => e.target.style.color = "#475569"}
            >{l}</a>
          ))}
        </div>
      </nav>

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", padding: "72px 48px 56px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontSize: 11, letterSpacing: 3, textTransform: "uppercase",
            color: "#38bdf8", border: "1px solid rgba(56,189,248,0.25)",
            borderRadius: 100, padding: "5px 16px", marginBottom: 28,
            background: "rgba(56,189,248,0.05)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", display: "inline-block" }} />
            Polypharmacology Prediction Engine
          </div>

          <h1 style={{
            fontSize: "clamp(30px,4.5vw,52px)", fontWeight: 900,
            letterSpacing: -2, lineHeight: 1.08, margin: "0 0 20px",
          }}>
            Scan molecules for<br />
            <span style={{
              background: "linear-gradient(100deg, #38bdf8 0%, #818cf8 50%, #f472b6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              dual-target activity
            </span>
          </h1>

          <p style={{
            fontSize: 15, color: "#64748b", maxWidth: 500,
            margin: "0 auto 0", lineHeight: 1.75,
          }}>
            Submit one or many SMILES strings — as text or a file — and Pharosis classifies each compound against PDE4B and Neutrophil Elastase using a 70/30 voting ensemble.
          </p>
        </div>

        {/* ── Predict panel ── */}
        <div id="predict" style={{ maxWidth: 820, margin: "0 auto 80px", padding: "0 24px" }}>

          {/* Mode toggle */}
          <div style={{
            display: "flex", gap: 4,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: 4,
            width: "fit-content", marginBottom: 16,
          }}>
            {[["text", "✎  Text / paste"], ["file", "⊞  Upload file"]].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: "7px 20px", borderRadius: 7, border: "none",
                background: mode === m ? "rgba(56,189,248,0.15)" : "transparent",
                color: mode === m ? "#38bdf8" : "#475569",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
                outline: mode === m ? "1px solid rgba(56,189,248,0.3)" : "none",
              }}>{label}</button>
            ))}
          </div>

          {/* Input area */}
          <div style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: 24, marginBottom: 16,
          }}>
            {mode === "text" ? (
              <>
                <div style={{ fontSize: 11, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
                  SMILES — one per line, or comma-separated
                </div>
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={"O=C1CN(CCc2ccc(OC)c(OC)c2)CC1\nCC1=CC=C(C=C1)S(=O)(=O)NC2=CC=CC=C2OCC(=O)O\n..."}
                  rows={5}
                  style={{
                    width: "100%", background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                    padding: "12px 14px", color: "#e2e8f0",
                    fontSize: 12, fontFamily: "monospace", resize: "vertical",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
                <div style={{ marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: "#334155", marginRight: 8 }}>Examples:</span>
                  {EXAMPLES.map(ex => (
                    <button key={ex.name} onClick={() => setTextInput(t => t ? t + "\n" + ex.smiles : ex.smiles)}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 6, padding: "3px 10px",
                        color: "#64748b", fontSize: 11, cursor: "pointer", marginRight: 6,
                      }}>{ex.name}</button>
                  ))}
                </div>
              </>
            ) : (
              /* File drop zone */
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                style={{
                  border: `2px dashed ${dragOver ? "#38bdf8" : "rgba(255,255,255,0.1)"}`,
                  borderRadius: 12, padding: "40px 20px", textAlign: "center",
                  cursor: "pointer", transition: "border-color 0.2s",
                  background: dragOver ? "rgba(56,189,248,0.04)" : "transparent",
                }}>
                <input ref={fileRef} type="file" accept=".txt,.csv,.smi"
                  style={{ display: "none" }}
                  onChange={e => handleFileLoad(e.target.files[0])} />
                <div style={{ fontSize: 32, marginBottom: 12 }}>⊞</div>
                {fileName ? (
                  <>
                    <div style={{ color: "#38bdf8", fontWeight: 600, marginBottom: 4 }}>{fileName}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>{parsedSmiles.length} SMILES parsed</div>
                  </>
                ) : (
                  <>
                    <div style={{ color: "#94a3b8", marginBottom: 6 }}>Drop a .txt, .csv, or .smi file</div>
                    <div style={{ color: "#334155", fontSize: 12 }}>or click to browse — one SMILES per line</div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Run button */}
          <button
            onClick={runPredictions}
            disabled={loading || (mode === "text" ? !textInput.trim() : !parsedSmiles.length)}
            style={{
              width: "100%", padding: "14px",
              background: loading
                ? "rgba(56,189,248,0.15)"
                : "linear-gradient(135deg, #0ea5e9, #6366f1)",
              border: "none", borderRadius: 12,
              color: loading ? "#38bdf8" : "#fff",
              fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
              letterSpacing: 0.3,
            }}
          >
            {loading
              ? `Scanning ${progress.done} / ${progress.total}...`
              : `Run Pharosis →`}
          </button>

          {/* Progress bar */}
          {loading && (
            <div style={{ marginTop: 10, background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 4 }}>
              <div style={{
                width: `${(progress.done / progress.total) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg,#38bdf8,#818cf8)",
                borderRadius: 4, transition: "width 0.3s",
              }} />
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <SummaryBar results={results} />

              {successResults.map((r, i) => <ResultCard key={i} item={r} index={i} />)}

              {errorResults.length > 0 && (
                <div style={{
                  background: "rgba(239,68,68,0.05)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 12, padding: "16px 18px", marginTop: 8,
                }}>
                  <div style={{ fontSize: 12, color: "#f87171", fontWeight: 600, marginBottom: 8 }}>
                    Failed SMILES ({errorResults.length})
                  </div>
                  {errorResults.map((r, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginBottom: 4 }}>
                      ✕ {r.smiles} — {r.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── About ── */}
        <div id="about" style={{
          maxWidth: 860, margin: "0 auto 80px", padding: "0 24px",
          borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 64,
        }}>
          <div style={{ fontSize: 11, color: "#38bdf8", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>About</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 18, letterSpacing: -0.5 }}>What is Pharosis?</h2>
          <p style={{ color: "#64748b", lineHeight: 1.85, fontSize: 15, maxWidth: 680 }}>
            Pharosis is a research tool developed as part of a computational drug discovery thesis. It predicts
            whether a small molecule selectively inhibits <strong style={{ color: "#38bdf8" }}>PDE4B</strong>,
            selectively inhibits <strong style={{ color: "#818cf8" }}>Neutrophil Elastase (NE)</strong>, or hits
            both targets simultaneously — a polypharmacology profile of interest in
            <strong style={{ color: "#f472b6" }}> inflammatory disease</strong> research. Submit any number of
            compounds at once and export results as CSV.
          </p>
        </div>

        {/* ── Pipeline ── */}
        <div id="pipeline" style={{ maxWidth: 860, margin: "0 auto 100px", padding: "0 24px" }}>
          <div style={{ fontSize: 11, color: "#38bdf8", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>Pipeline</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, letterSpacing: -0.5 }}>How it works</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 28 }}>
            {[
              { title: "SMILES Parsing", desc: "Input is validated and parsed by RDKit. Invalid structures are flagged immediately.", col: "#38bdf8" },
              { title: "Feature Extraction", desc: "3,653 features: ECFP4, MACCS keys, 10 physicochemical descriptors, 2D pharmacophore, and 21 spatial 3D distances.", col: "#818cf8" },
              { title: "Dual Inference", desc: "Model A uses all 3,653 features. Model B uses only the 21 rotation-invariant spatial pharmacophore distances.", col: "#f472b6" },
              { title: "Soft Voting 70/30", desc: "Probability outputs are blended: 70% from Model A, 30% from Model B. Final class is the highest probability.", col: "#38bdf8" },
            ].map(s => (
              <div key={s.title} style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${s.col}22`,
                borderTop: `2px solid ${s.col}`,
                borderRadius: 12, padding: "18px 18px 20px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.col, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Metrics */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14, overflow: "hidden",
          }}>
            {[
              { label: "Macro F1", value: "0.859", sub: "Ensemble 70/30" },
              { label: "ROC-AUC", value: "0.968", sub: "One-vs-Rest" },
              { label: "Bal. Accuracy", value: "0.840", sub: "20% test set" },
              { label: "Compounds", value: "5,845", sub: "Training set" },
            ].map((m, i) => (
              <div key={m.label} style={{
                padding: "22px 16px", textAlign: "center",
                borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#38bdf8", fontFamily: "monospace", letterSpacing: -1 }}>{m.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: "#334155", marginTop: 2 }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "22px 48px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12, color: "#1e293b",
        }}>
          <span>Pharosis — Computational Drug Discovery Research</span>
          <span>RDKit · XGBoost · React · Vite</span>
        </div>
      </div>
    </div>
  );
}
