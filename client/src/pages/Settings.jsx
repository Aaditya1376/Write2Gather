import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../lib/api.js";

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState("");

  async function saveProfile(e) {
    e.preventDefault();
    setBusy("profile");
    try {
      const { user: updated } = await api.patch("/api/auth/me", { name });
      setUser(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy("");
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setBusy("password");
    try {
      await api.patch("/api/auth/me", pw);
      setPw({ currentPassword: "", newPassword: "" });
      toast.success("Password changed");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <Navbar />
      <main className="page narrow">
        <Link to="/dashboard" className="back-link"><ArrowLeft size={16} /> Back to documents</Link>
        <h1>Settings</h1>

        <form className="card stack" onSubmit={saveProfile}>
          <h2>Profile</h2>
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={user.email} disabled />
          </label>
          <div><button className="btn btn-primary" disabled={busy === "profile" || name.trim() === user.name}>Save changes</button></div>
        </form>

        <form className="card stack" onSubmit={changePassword}>
          <h2>Change password</h2>
          <label className="field">
            <span>Current password</span>
            <input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required autoComplete="current-password" />
          </label>
          <label className="field">
            <span>New password</span>
            <input type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={8} autoComplete="new-password" />
          </label>
          <div><button className="btn btn-primary" disabled={busy === "password"}>Update password</button></div>
        </form>
      </main>
    </>
  );
}
