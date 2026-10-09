import { Link } from "react-router-dom";
import { APP_NAME } from "../lib/brand.js";

export default function Logo({ to = "/" }) {
  return (
    <Link to={to} className="logo" aria-label={`${APP_NAME} home`} title="Go to Write2Gather home">
      <span className="logo-mark">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5.5 7.5v11a1 1 0 0 0 1 1h9" />
          <path d="M9 4.5h6.2L19 8.3v10.2a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" />
          <path d="M15 4.8v3.7h3.7M11.5 12h5M11.5 15h5" />
        </svg>
      </span>
      {APP_NAME}
    </Link>
  );
}
