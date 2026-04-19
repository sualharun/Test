import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

const BASE_VIEWBOX = { x: 0, y: -20, w: 980, h: 260 };

function zoomToFit(nodes) {
  if (!nodes.length) return BASE_VIEWBOX;
  const minX = Math.min(...nodes.map((n) => n.x)) - 90;
  const minY = Math.min(...nodes.map((n) => n.y)) - 70;
  const maxX = Math.max(...nodes.map((n) => n.x)) + 130;
  const maxY = Math.max(...nodes.map((n) => n.y)) + 70;
  return {
    x: minX,
    y: minY,
    w: Math.max(600, maxX - minX),
    h: Math.max(220, maxY - minY),
  };
}

function nodeRadiusByType(type) {
  if (type === "repo") return 20;
  if (type === "package") return 16;
  if (type === "maintainer") return 14;
  if (type === "vulnerable_repo") return 18;
  return 14;
}

function nodeColorByType(type) {
  if (type === "repo") return "#1d4ed8";
  if (type === "package") return "#059669";
  if (type === "maintainer") return "#7c3aed";
  if (type === "vulnerable_repo") return "#dc2626";
  return "#334155";
}

function riskBand(score) {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export default function PromptShieldDemoPage() {
  const { token, logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [minRisk, setMinRisk] = useState(0);
  const [nodeTypeFilter, setNodeTypeFilter] = useState("all");
  const [showLabels, setShowLabels] = useState(true);
  const [detailMode, setDetailMode] = useState("clean");
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [activeEdgeId, setActiveEdgeId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewBox, setViewBox] = useState(BASE_VIEWBOX);
  const rafRef = useRef(null);
  const frameCursorRef = useRef(0);
  const framesRef = useRef([]);
  const nodeMapRef = useRef(new Map());

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: payload } = await apiFetch("/demo/promptshield/context", { token });
        if (!mounted) return;
        setData(payload);
        nodeMapRef.current = new Map((payload?.nodes || []).map((n) => [n.id, n]));
        setViewBox(zoomToFit(payload?.nodes || []));
      } catch (err) {
        if (err instanceof Error && err.status === 401) logout();
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load graph context");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [token, logout]);

  const filteredNodes = useMemo(() => {
    const nodes = data?.nodes || [];
    return nodes.filter((n) => n.risk >= minRisk && (nodeTypeFilter === "all" || n.node_type === nodeTypeFilter));
  }, [data, minRisk, nodeTypeFilter]);

  const visibleNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    const edges = data?.edges || [];
    return edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
  }, [data, visibleNodeIds]);

  const rankedChains = useMemo(() => {
    const chains = data?.chains || [];
    return [...chains].sort((a, b) => b.risk_score - a.risk_score);
  }, [data]);

  const topChain = rankedChains[0] || null;

  function resetView() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    frameCursorRef.current = 0;
    framesRef.current = [];
    setIsPlaying(false);
    setActiveNodeId(null);
    setActiveEdgeId(null);
    setSelectedNode(null);
    setHoveredNode(null);
    setMinRisk(0);
    setNodeTypeFilter("all");
    setShowLabels(true);
    setDetailMode("clean");
    setViewBox(zoomToFit(data?.nodes || []));
  }

  function buildPlaybackFrames(chain) {
    if (!chain) return [];
    const frames = [];
    const nodes = chain.node_ids || [];
    const edges = chain.edge_ids || [];
    for (let i = 0; i < nodes.length; i += 1) {
      const nodeId = nodes[i];
      if (i === 0) {
        frames.push({ nodeId, edgeId: null });
      } else {
        const edgeId = edges[i - 1] || `${nodes[i - 1]}->${nodes[i]}`;
        frames.push({ nodeId: nodes[i - 1], edgeId });
        frames.push({ nodeId, edgeId });
      }
    }
    while (frames.length < 3) {
      frames.push(frames[frames.length - 1] || { nodeId: nodes[0] || null, edgeId: null });
    }
    return frames;
  }

  function stepPlayback() {
    const frames = framesRef.current;
    const idx = frameCursorRef.current;
    if (idx >= frames.length) {
      setIsPlaying(false);
      if (frames.length) {
        const last = frames[frames.length - 1];
        setActiveNodeId(last.nodeId || null);
        setActiveEdgeId(last.edgeId || null);
      }
      rafRef.current = null;
      return;
    }

    const frame = frames[idx];
    setActiveNodeId(frame.nodeId || null);
    setActiveEdgeId(frame.edgeId || null);
    const n = frame.nodeId ? nodeMapRef.current.get(frame.nodeId) : null;
    if (n) {
      setViewBox((prev) => ({ ...prev, x: n.x - prev.w / 2, y: n.y - prev.h / 2 }));
    }

    frameCursorRef.current += 1;
    rafRef.current = requestAnimationFrame(() => {
      setTimeout(stepPlayback, 420);
    });
  }

  function playAttackPath() {
    if (!topChain) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    frameCursorRef.current = 0;
    framesRef.current = buildPlaybackFrames(topChain);
    setIsPlaying(true);
    stepPlayback();
  }

  return (
    <div>
      <h2>PromptShield Multi-Repo Demo</h2>
      <p className="muted">
        Deterministic synthetic attack graph for one PR context. Playback uses node/edge IDs, not label matching.
      </p>

      {error ? <div className="error">{error}</div> : null}
      {loading ? <p className="muted">Loading graph context…</p> : null}

      {data ? (
        <>
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div>
                  <strong>{data.pr.repo_full_name}</strong> · PR #{data.pr.pr_number}
                </div>
                <div className="muted">{data.pr.pr_title}</div>
                <div className="muted" style={{ fontSize: "0.8rem" }}>
                  commit: {data.pr.commit_sha.slice(0, 12)} · author: {data.pr.author_login}
                </div>
              </div>
              <div className="muted">
                Chains: {rankedChains.length} · Top risk: {topChain ? topChain.risk_score : "N/A"}
              </div>
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginTop: 0, marginBottom: "0.6rem", fontSize: "0.95rem" }}>Graph controls</h4>
            <div className="row">
              <label>
                Risk filter
                <select value={minRisk} onChange={(e) => setMinRisk(Number(e.target.value))}>
                  <option value={0}>All</option>
                  <option value={30}>30+</option>
                  <option value={50}>50+</option>
                  <option value={70}>70+</option>
                </select>
              </label>
              <label>
                Node type
                <select value={nodeTypeFilter} onChange={(e) => setNodeTypeFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="repo">First-party repo</option>
                  <option value="package">Package</option>
                  <option value="maintainer">Maintainer</option>
                  <option value="vulnerable_repo">Vulnerable repo</option>
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
                Show labels
              </label>
              <label>
                Clean-Detailed
                <select value={detailMode} onChange={(e) => setDetailMode(e.target.value)}>
                  <option value="clean">Clean</option>
                  <option value="detailed">Detailed</option>
                </select>
              </label>
              <button
                type="button"
                onClick={resetView}
                disabled={loading}
                title="Reset filters, playback, selection, and camera"
              >
                Reset view
              </button>
              <button
                type="button"
                onClick={playAttackPath}
                disabled={!topChain || loading}
                className="play-attack-btn"
              >
                {isPlaying ? "Playing…" : "Play attack path"}
              </button>
            </div>
            <div className="legend-row">
              <LegendDot color={nodeColorByType("repo")} label="First-party repo" />
              <LegendDot color={nodeColorByType("package")} label="Dependency package" />
              <LegendDot color={nodeColorByType("maintainer")} label="Maintainer" />
              <LegendDot color={nodeColorByType("vulnerable_repo")} label="Vulnerable external repo" />
            </div>
          </div>

          <div className="card graph-shell">
            <svg viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} className="risk-graph-svg">
              {filteredEdges.map((e) => {
                const s = nodeMapRef.current.get(e.source);
                const t = nodeMapRef.current.get(e.target);
                if (!s || !t) return null;
                const isActive = activeEdgeId === e.id;
                return (
                  <line
                    key={e.id}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    className={isActive ? "edge-active" : "edge-line"}
                  />
                );
              })}
              {filteredNodes.map((n) => {
                const isActive = activeNodeId === n.id;
                const isSelected = selectedNode?.id === n.id;
                const isHovered = hoveredNode?.id === n.id;
                return (
                  <g
                    key={n.id}
                    onMouseEnter={() => setHoveredNode(n)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(n)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={nodeRadiusByType(n.node_type)}
                      fill={nodeColorByType(n.node_type)}
                      className={isActive ? "node-active" : ""}
                      stroke={isSelected || isHovered ? "#0f172a" : "transparent"}
                      strokeWidth={isSelected || isHovered ? 3 : 0}
                    />
                    {showLabels ? (
                      <text x={n.x + 24} y={n.y + 4} className="graph-label">
                        {n.label}
                      </text>
                    ) : null}
                    {detailMode === "detailed" ? (
                      <text x={n.x - 10} y={n.y + 34} className="graph-sub-label">
                        r{n.risk}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="card">
            <h4 style={{ marginTop: 0 }}>Top ranked chain</h4>
            {topChain ? (
              <>
                <div className="row">
                  <span className="status-pill status-progress">Risk {topChain.risk_score}</span>
                  <span className="status-pill status-open">{riskBand(topChain.risk_score)}</span>
                  <span className="muted">Terminal: {topChain.terminal_type}</span>
                  {topChain.fallback ? <span className="muted">(fallback)</span> : null}
                </div>
                <ol style={{ marginBottom: 0 }}>
                  {topChain.node_ids.map((nid) => (
                    <li key={nid}>
                      <code>{nid}</code>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="muted">No chain found.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="legend-item">
      <span className="legend-dot" style={{ background: color }} />
      {label}
    </span>
  );
}
