import { useRef, useState } from "react";
import { apiUpload } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function VulnUploadPage() {
  const { token, logout } = useAuth();
  const ref = useRef(null);
  const [out, setOut] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const f = ref.current?.files?.[0];
    if (!f) {
      setError("Pick a file");
      return;
    }
    try {
      const { data } = await apiUpload("/vuln/upload/insecure", f, { token });
      setOut(JSON.stringify(data, null, 2));
    } catch (err) {
      if (err instanceof Error && err.status === 401) logout();
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div>
      <div className="error" style={{ marginBottom: "1rem" }}>
        <strong>Unrestricted upload</strong> — writes bytes with client-provided name under backend/uploads.
      </div>
      <h2>Arbitrary file upload</h2>
      <form onSubmit={onSubmit} className="card">
        <input ref={ref} type="file" />
        <button className="primary" type="submit" style={{ marginTop: "0.5rem" }}>
          Upload
        </button>
      </form>
      {error ? <div className="error">{error}</div> : null}
      {out ? <pre className="card" style={{ whiteSpace: "pre-wrap" }}>{out}</pre> : null}
    </div>
  );
}
