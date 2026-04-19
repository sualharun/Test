import { useState } from "react";
import { apiFetch } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function VulnSecretsPage() {
  const { token, logout } = useAuth();
  const [out, setOut] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const { data } = await apiFetch("/vuln/debug/environment", { token });
      setOut(JSON.stringify(data, null, 2));
    } catch (err) {
      if (err instanceof Error && err.status === 401) logout();
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <div className="error" style={{ marginBottom: "1rem" }}>
        <strong>Secrets / environment leak</strong> — exposes env vars and JWT signing material.
      </div>
      <h2>Debug config dump</h2>
      <div className="card">
        <button className="primary" type="button" onClick={load}>
          GET /vuln/debug/environment
        </button>
        {error ? <div className="error" style={{ marginTop: "0.5rem" }}>{error}</div> : null}
        {out ? (
          <pre style={{ marginTop: "1rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{out}</pre>
        ) : null}
      </div>
    </div>
  );
}
