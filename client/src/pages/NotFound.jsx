import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="center-screen stack">
      <h1 style={{ fontSize: 64, margin: 0 }}>404</h1>
      <p className="muted">That page does not exist.</p>
      <Link className="btn btn-primary" to="/">Go home</Link>
    </div>
  );
}
