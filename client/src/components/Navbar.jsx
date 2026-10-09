import { Link } from "react-router-dom";
import { Moon, Sun, Settings, LogOut } from "lucide-react";
import Logo from "./Logo.jsx";
import Avatar from "./Avatar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../lib/useTheme.js";

export default function Navbar({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  return (
    <header className="navbar">
      <Logo to={user ? "/dashboard" : "/"} />
      <div className="navbar-middle">{children}</div>
      <div className="navbar-right">
        <button className="icon-btn" onClick={toggle} aria-label="Toggle dark mode" title="Toggle dark mode">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {user && (
          <>
            <Link to="/settings" className="icon-btn" title="Settings" aria-label="Settings">
              <Settings size={18} />
            </Link>
            <button className="icon-btn" onClick={logout} title="Log out" aria-label="Log out">
              <LogOut size={18} />
            </button>
            <Avatar user={user} size={32} />
          </>
        )}
      </div>
    </header>
  );
}
