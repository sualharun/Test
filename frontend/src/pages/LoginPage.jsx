import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/AuthContext.jsx";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const parsed = loginSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setError(parsed.error.issues.map((e) => e.message).join("; "));
      return;
    }
    setLoading(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2>Login</h2>
      {error ? <div className="error">{error}</div> : null}
      <form onSubmit={onSubmit} style={{ marginTop: "1rem" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
          />
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={128}
          />
        </div>
        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "1rem" }}>
        No account? <Link to="/signup">Create one</Link>
      </p>
    </div>
  );
}
