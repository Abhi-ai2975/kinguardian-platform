// LoginPage.tsx — login form.
// Uses useAudit to fire a client-side audit event on successful login,
// and useLog to record failed attempts as warnings.
import { useState } from "react";
import { useAudit, useLog } from "@watcher/react";

interface Props {
  onLogin: (auth: { userId: string; email: string }) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const audit = useAudit();
  const log = useLog();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json();
        const msg = body.error ?? "login failed";
        setError(msg);

        // Log failed login attempts so they surface in the audit stream.
        log("warn", "auth.login.failed", {
          payload: { email, reason: msg },
        });
        return;
      }

      const data = await res.json();

      // Audit the successful login from the client side as well.
      // The server also audits it — you'll see two correlated events in the dashboard.
      audit("user.login.client", {
        userId: data.userId,
        payload: { email },
      });

      onLogin({ userId: data.userId, email: data.email });
    } catch (err) {
      const message = err instanceof Error ? err.message : "network error";
      setError(message);
      log("error", "auth.login.error", { payload: { message } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2>Sign in</h2>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          style={inputStyle}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="any password works"
          required
          style={inputStyle}
        />
      </label>
      {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}
      <button type="submit" disabled={loading} style={btnStyle}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p style={{ fontSize: 12, color: "#888" }}>
        Tip: use any email + password — this is a demo.
      </p>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", marginTop: 4,
  padding: "8px 10px", fontSize: 14, borderRadius: 6,
  border: "1px solid #ccc", boxSizing: "border-box",
};
const btnStyle: React.CSSProperties = {
  padding: "10px 20px", fontSize: 14, borderRadius: 6,
  background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
};
