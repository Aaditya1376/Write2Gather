import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { api } from "../lib/api.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Passwords do not match");
    setBusy(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <section className="auth-card" aria-labelledby="reset-title">
        <Logo />
        <h1 id="reset-title">Choose a new password</h1>
        {done ? (
          <>
            <div className="form-success" role="status">Your password has been updated. You can now log in.</div>
            <Link className="btn btn-primary btn-lg" to="/login">Go to log in</Link>
          </>
        ) : !token ? (
          <>
            <div className="form-error" role="alert">This reset link is missing its token. Request a new one to continue.</div>
            <Link className="btn btn-primary" to="/forgot-password">Request a reset link</Link>
          </>
        ) : (
          <form onSubmit={submit} className="stack">
            <p className="muted">Choose a password with at least 8 characters.</p>
            <PasswordField label="New password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} placeholder="At least 8 characters" />
            <PasswordField label="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} placeholder="Enter your password again" />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Updating..." : "Update password"}</button>
          </form>
        )}
        {!done && <p className="muted small center-text"><Link to="/login">Back to log in</Link></p>}
      </section>
    </div>
  );
}
