import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import PasswordField from "../components/PasswordField.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/dashboard";

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={redirectTo} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (isRegister && form.password.length < 8) return setError("Password must be at least 8 characters");
    if (isRegister && form.password !== form.confirmPassword) return setError("Passwords do not match");
    setBusy(true);
    try {
      if (isRegister) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Logo />
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">{isRegister ? "Start writing with your team in seconds." : "Log in to continue to your documents."}</p>

        <form onSubmit={submit} className="stack">
          {isRegister && (
            <label className="field">
              <span>Name</span>
              <input value={form.name} onChange={set("name")} required maxLength={60} autoComplete="name" placeholder="Ada Lovelace" />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set("email")} required autoComplete="email" placeholder="you@example.com" />
          </label>
          <PasswordField
            value={form.password}
            onChange={set("password")}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 8 : undefined}
            placeholder={isRegister ? "At least 8 characters" : "Your password"}
          />
          {isRegister && (
            <PasswordField
              label="Confirm password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              autoComplete="new-password"
              minLength={8}
              placeholder="Enter your password again"
            />
          )}
          {!isRegister && <div className="auth-forgot"><Link to="/forgot-password" state={location.state}>Forgot password?</Link></div>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? "Please wait..." : isRegister ? "Create account" : "Log in"}
          </button>
        </form>

        <p className="muted small center-text">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link to={isRegister ? "/login" : "/register"} state={location.state}>
            {isRegister ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
