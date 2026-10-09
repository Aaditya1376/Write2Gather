import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { api } from "../lib/api.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.post("/api/auth/forgot-password", { email });
      setMessage(result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <section className="auth-card" aria-labelledby="forgot-title">
        <Logo />
        <h1 id="forgot-title">Reset your password</h1>
        <p className="muted">Enter the email address on your account. If it matches, we’ll send you a one-time reset link.</p>
        <form onSubmit={submit} className="stack">
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" autoFocus placeholder="you@example.com" />
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          {message && <div className="form-success" role="status">{message}</div>}
          <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Sending..." : "Send reset link"}</button>
        </form>
        <p className="muted small center-text"><Link to="/login">Back to log in</Link></p>
      </section>
    </div>
  );
}
