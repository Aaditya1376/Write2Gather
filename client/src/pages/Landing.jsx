import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowUpRight, Check, MessageSquare, Users } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { APP_NAME, GITHUB_URL } from "../lib/brand.js";
import { useAuth } from "../context/AuthContext.jsx";

const features = [
  { number: "01", title: "Write together", text: "Changes appear as people type. Yjs keeps edits in sync, even when they arrive out of order.", presence: "2 editing", status: "Live collaboration", comment: "Maya is editing this section." },
  { number: "02", title: "Keep the discussion close", text: "Leave a comment on a passage, reply in a thread, and resolve it when the work is done.", presence: "3 in thread", status: "Comment added", comment: "Keep this opening. It sets the tone." },
  { number: "03", title: "Know what changed", text: "Browse saved versions, restore an earlier draft, or export a clean copy when you’re ready.", presence: "Version 6", status: "History ready", comment: "Version 6 saved just now." },
];

function DocumentPreview({ feature }) {
  return (
    <div className="preview-window" aria-label="Preview of a shared document">
      <div className="preview-topbar">
        <span className="preview-dot" />
        <span>field-notes / launch-plan</span>
        <span className="preview-presence"><i /> {feature.presence}</span>
      </div>
      <div className="preview-toolbar"><span>B</span><i /><span>H1</span><i /><span>↗</span><i /><span>☷</span></div>
      <div className="preview-paper">
        <span className="preview-kicker">FIELD NOTES&nbsp;&nbsp; / &nbsp;&nbsp;06 OCT 2026</span>
        <h2>A quieter way to work together</h2>
        <p>Good collaboration leaves room to think. Write2Gather keeps the document simple and puts the conversation where the work happens.</p>
        <p>Start with a shared draft. Invite a teammate when it’s useful. The history is there if you need to retrace a decision.</p>
        <span className="preview-caret">Maya<span>typing</span></span>
        <div className="preview-comment"><MessageSquare size={13} /><span>{feature.comment}</span></div>
      </div>
      <div className="preview-foot"><span><Check size={13} /> {feature.status}</span><span>Write2Gather document</span></div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState(0);
  const feature = features[selectedFeature];

  return (
    <div className="landing">
      <Navbar />
      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow"><span /> A shared place to write</span>
            <h1>Make room for<br /><em>good writing.</em></h1>
            <p className="hero-description">{APP_NAME} is a collaborative editor for teams that want to work through a document together, without getting in each other’s way.</p>
            <div className="hero-actions">
              <Link to={user ? "/dashboard" : "/register"} className="btn btn-primary btn-lg">
                {user ? "Open your workspace" : "Create an account"} <ArrowUpRight size={17} />
              </Link>
              {!user && <Link to="/login" className="hero-login">Already have an account? Log in</Link>}
            </div>
            <div className="hero-note"><Users size={15} /> Live editing, comments, and version history in one place.</div>
          </div>
          <DocumentPreview feature={feature} />
        </section>

        <section className="landing-details">
          <div className="section-heading">
            <span className="eyebrow">A practical set of tools</span>
            <p>Everything around the document, kept close.</p>
          </div>
          <div className="feature-list">
            {features.map((feature, index) => (
              <button
                className={`feature-row${selectedFeature === index ? " is-selected" : ""}`}
                key={feature.number}
                type="button"
                aria-pressed={selectedFeature === index}
                onClick={() => setSelectedFeature(index)}
              >
                <span className="feature-number">{feature.number}</span>
                <div><h2>{feature.title}</h2><p>{feature.text}</p></div>
              </button>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>{APP_NAME} <i>·</i> A shared place to write</span>
        {!GITHUB_URL.includes("your-username") && <a href={GITHUB_URL} target="_blank" rel="noreferrer">Source code <ArrowUpRight size={13} /></a>}
      </footer>
    </div>
  );
}
