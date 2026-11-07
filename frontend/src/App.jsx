import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import projects from "./data/projects.js";
import DoorSelector from "./components/DoorSelector.jsx";
import ProjectRoom from "./components/ProjectRoom.jsx";

const navigation = [
  ["Home", "#home"],
  ["About", "#about"],
  ["Projects", "#projects"],
  ["Story", "#journey"],
  ["Skills", "#skills"],
  ["Learning", "#progress"],
  ["Contact", "#contact"],
];

const heroRoles = [
  "Full-Stack Developer",
  "AI/ML Builder",
  "OS Explorer",
  "Ethical Hacking learner",
];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

function RoleNotebook() {
  const [roleIndex, setRoleIndex] = useState(0);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return undefined;

    const intervalId = window.setInterval(() => {
      setRoleIndex((current) => (current + 1) % heroRoles.length);
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="notebook" aria-label="Roles">
      <div className="notebook-spiral" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
      </div>
      <span className="notebook-label">CURRENT CHAPTER</span>
      <span className="notebook-role" aria-live="off">
        <span className="notebook-role-text" key={roleIndex}>{heroRoles[roleIndex]}</span>
      </span>
      <span className="notebook-page-number">{String(roleIndex + 1).padStart(2, "0")} / 04</span>
    </div>
  );
}

function ChatWidget({ name }) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I can answer questions from ${name}’s portfolio about his background, projects, skills, and Smart India Hackathon participation.`,
    },
  ]);
  const conversationRef = useRef(null);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  async function sendQuestion(value) {
    const text = value.trim();
    if (!text || isSending) return;

    setMessages((current) => [...current, { role: "user", content: text }]);
    setQuestion("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      if (!response.ok) {
        throw new Error(`The assistant request failed (${response.status}).`);
      }
      const result = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
    } catch (requestError) {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `${requestError.message} Please try again.` },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendQuestion(question);
  }

  return (
    <aside className="chat-widget" aria-label="Portfolio Q&A">
      {isOpen && (
        <section className="chat-panel" aria-label="Ask about Gaurav">
          <header className="chat-header">
            <span className="chat-avatar" aria-hidden="true">G</span>
            <div><strong>Ask about Gaurav</strong><small>Answers from this portfolio only</small></div>
            <button className="chat-close" type="button" aria-label="Close chat" onClick={() => setIsOpen(false)}>×</button>
          </header>
          <div className="chat-messages" ref={conversationRef} aria-live="polite">
            {messages.map((message, index) => (
              <p className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.content}</p>
            ))}
            {isSending && <p className="chat-message assistant chat-typing" role="status">Looking that up…</p>}
          </div>
          <div className="chat-suggestions" aria-label="Suggested questions">
            {["What projects has Gaurav built?", "Tell me about Smart India Hackathon"].map((suggestion) => (
              <button key={suggestion} type="button" disabled={isSending} onClick={() => sendQuestion(suggestion)}>{suggestion}</button>
            ))}
          </div>
          <form className="chat-form" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="chat-question">Ask about Gaurav</label>
            <input
              id="chat-question"
              maxLength={400}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about Gaurav…"
              disabled={isSending}
            />
            <button type="submit" disabled={isSending || !question.trim()} aria-label="Send question">↑</button>
          </form>
        </section>
      )}
      <button
        className={`chat-launcher${isOpen ? " is-open" : ""}`}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="chat-launcher-icon" aria-hidden="true">{isOpen ? "×" : "✳"}</span>
        <span>{isOpen ? "Close" : "Ask about me"}</span>
      </button>
    </aside>
  );
}

function LearningChart({ items }) {
  return (
    <div className="learning-chart">
      <div className="chart-scene" role="img" aria-label="Three-dimensional chart showing current qualitative learning stages">
        <div className="chart-grid-plane" aria-hidden="true" />
        <ol className="chart-columns">
          {items.map((item, index) => (
            <li className="chart-column" key={item.name} style={{ "--column-index": index, "--stage-height": `${item.stage * 20}%` }}>
              <span className="chart-value">{item.stageLabel}</span>
              <span className="chart-bar-wrap"><span className="chart-bar" /></span>
              <span className="chart-name">{item.name}</span>
            </li>
          ))}
        </ol>
      </div>
      <ul className="chart-legend" aria-label="Learning stage labels">
        {items.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.stageLabel}</strong></li>)}
      </ul>
    </div>
  );
}

function MilestoneTimeline({ items }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const milestones = [...document.querySelectorAll(".milestone-item")];
    let animationFrame = 0;
    const updateActiveMilestone = () => {
      animationFrame = 0;
      const markerY = window.innerHeight * 0.42;
      const current = milestones.reduce((active, milestone) => (
        milestone.getBoundingClientRect().top <= markerY ? milestone : active
      ), milestones[0]);
      if (current) setActiveIndex(Number(current.getAttribute("data-index")));
    };
    const scheduleUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateActiveMilestone);
    };
    updateActiveMilestone();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [items]);

  const activeItem = items[activeIndex] || items[0];

  return (
    <section className="milestone-section shell reveal" id="journey">
      <div className="milestone-heading">
        <div className="section-aside"><span className="section-number">03</span>        <p className="eyebrow">EDUCATION & EXPERIENCE</p></div>
        <h2>My timeline<span className="lime-period">.</span></h2>
      </div>
      <div className="milestone-layout">
        <div className="milestone-current" aria-live="polite">
          <span className="milestone-year">{activeItem?.year || "—"}</span>
          <span className="milestone-year-note">{activeItem?.year ? "YEAR" : "YEAR NOT PROVIDED"}</span>
          <p className="milestone-active-period">{activeItem?.period}</p>
          <p className="milestone-active-title">{activeItem?.title}</p>
        </div>
        <div className="milestone-list">
          <p className="milestone-disclaimer">Education, learning, and project milestones. Years are omitted where they have not been confirmed.</p>
          {items.map((item, index) => (
            <article
              className={`milestone-item${activeIndex === index ? " is-current" : ""}`}
              data-index={index}
              key={item.title}
            >
              <span className="milestone-marker" aria-hidden="true" />
              <span className="timeline-date">{item.period}</span>
              <div><h3>{item.title}</h3><p>{item.description}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setStatus({ type: "", message: "" });
    setIsSending(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          message: values.get("message"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Your message could not be sent. Please try again.");
      }
      form.reset();
      setStatus({ type: "success", message: result.message });
    } catch (requestError) {
      setStatus({ type: "error", message: requestError.message });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="contact-section shell reveal" id="contact">
      <div className="contact-orb" aria-hidden="true"><span>✳</span></div>
      <div className="contact-copy">
        <div className="section-aside"><span className="section-number">06</span><p className="eyebrow">EMAIL &amp; CONTACT</p></div>
        <h2>Got a project?<br />Let’s build it together<span className="lime-period">.</span></h2>
        <p className="body-copy">Open to internships, hackathon teams, and collaborations in full-stack development and applied ML. Reach out through the form, or ask my portfolio assistant about my work.</p>
        <a className="email-pill" href="mailto:your.email@example.com">
          <span className="email-pill-label">EMAIL</span>
          <span className="email-pill-address">your.email@example.com</span>
          <ArrowIcon />
        </a>
        <form className="contact-form" id="contact-form" onSubmit={handleSubmit}>
          <div className="contact-fields">
            <label>
              <span>Your name</span>
              <input name="name" autoComplete="name" maxLength={100} placeholder="Name" required />
            </label>
            <label>
              <span>Your email</span>
              <input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required />
            </label>
            <label className="message-field">
              <span>Your message</span>
              <textarea name="message" rows="4" minLength={10} maxLength={3000} placeholder="What would you like to talk about?" required />
            </label>
          </div>
          <div className="contact-form-bottom">
            <button className="button button-primary" type="submit" disabled={isSending}>
              {isSending ? "Sending…" : "Send message"} <span aria-hidden="true">↗</span>
            </button>
            <a className="button button-outline" href="/api/cv">Download CV <span aria-hidden="true">↓</span></a>
          </div>
          <p className={`form-status ${status.type}`} role={status.type === "error" ? "alert" : "status"} aria-live="polite">
            {status.message}
          </p>
        </form>
        <span className="contact-linkedin">LinkedIn link · add later</span>
      </div>
    </section>
  );
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "dark");
  const location = useLocation();
  const isProjectRoute = location.pathname.startsWith("/project/");
  const projectRouteMatch = /^\/project\/([^/]+)\/?$/.exec(location.pathname);
  const activeProject = isProjectRoute
    ? projects.find((project) => project.id === projectRouteMatch?.[1])
    : null;

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#08140F" : "#F4F1E8",
    );
  }, [theme]);

  useEffect(() => {
    fetch("/api/profile")
      .then((response) => {
        if (!response.ok) throw new Error(`Profile request failed (${response.status})`);
        return response.json();
      })
      .then(setProfile)
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    if (!profile) return;
    const targetId = location.hash.slice(1) || (location.state?.focusProjectId ? "projects" : "");
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.requestAnimationFrame(() => target.scrollIntoView({ behavior, block: "start" }));
  }, [profile, location.hash, location.pathname, location.state?.focusProjectId]);

  useEffect(() => {
    if (!profile) return undefined;
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [profile]);

  if (isProjectRoute && !activeProject) return <Navigate to="/#projects" replace />;
  if (!profile && activeProject) return <ProjectRoom project={activeProject} />;

  if (error) {
    return (
      <main className="load-state" role="alert">
        <span className="load-mark">GS</span>
        <h1>Portfolio API unavailable</h1>
        <p>Start the FastAPI backend, then refresh this page.</p>
        <code>{error}</code>
      </main>
    );
  }

  if (!profile) {
    return <main className="load-state" role="status"><span className="loader" />Loading portfolio</main>;
  }

  return (
    <div className="portfolio-app">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-mark">G</span>
          <span>{profile.name}<small>B.TECH CSE · YEAR 02</small></span>
        </a>
        <nav aria-label="Main navigation">
          {navigation.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <span className="availability"><span className="status-dot" />Available for work</span>
      </header>

      <main>
        <section className="hero shell" id="home">
          <div className="hero-copy">
            <p className="eyebrow hero-eyebrow"><span className="status-dot" />SECOND-YEAR B.TECH · COMPUTER SCIENCE</p>
            <h1>Hi, I’m <span className="name-highlight">{profile.name.split(" ")[0]}.</span></h1>
            <p className="hero-role">{profile.title}</p>
            <RoleNotebook />
            <p className="hero-tagline">{profile.tagline}</p>
            <p className="hero-intro">{profile.intro}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">Start a project <ArrowIcon /></a>
              <a className="button button-outline" href="#projects">See my work <span aria-hidden="true">↓</span></a>
            </div>
          </div>
          <div className="hero-portrait-column">
            <div className="portrait-frame">
              <div className="portrait-pair">
                <img
                  className="portrait-placeholder"
                  src="/images/portrait-seated.jpeg"
                  alt="Gaurav Singh seated in a suit"
                />
                <figure className="portrait-inset">
                  <img src="/images/portrait-standing.jpeg" alt="Gaurav Singh standing in a suit" />
                  <figcaption>ANOTHER PERSPECTIVE</figcaption>
                </figure>
              </div>
              <span className="portrait-index">FIG. 01 · THE BUILDER</span>
            </div>
            <span className="floating-skill"><span aria-hidden="true">✳</span> Learning by building</span>
          </div>
          <a className="scroll-cue" href="#projects"><span />STEP INSIDE</a>
          <span className="hero-index">GHAZIABAD · INDIA</span>
        </section>

        <section className="intro-section shell section-grid reveal" id="about">
          <div className="section-aside"><span className="section-number">01</span><p className="eyebrow">A LITTLE ABOUT ME</p></div>
          <div className="section-content">
            <h2>{profile.headline}</h2>
            <div className="about-story">
              <p className="body-copy">{profile.about}</p>
            </div>
            <div className="fact-row">
              {profile.highlights.map((fact) => (
                <div className="fact" key={fact.label}>
                  <strong>{fact.value}</strong>
                  <span>{fact.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <DoorSelector projects={projects} />

        <MilestoneTimeline items={profile.journey} />

        <section className="skills-section shell section-grid reveal" id="skills">
          <div className="section-aside"><span className="section-number">04</span><p className="eyebrow">TOOLS & CURIOSITY</p></div>
          <div className="section-content">
            <h2>Skills &amp; technologies</h2>
            <p className="body-copy">{profile.skillsIntro}</p>
            <div className="skill-groups">
              {Object.entries(profile.skillGroups).map(([group, skills]) => (
                <div className="skill-group" key={group}>
                  <h3>{group}</h3>
                  <div className="skill-cloud">
                    {skills.map((skill) => <span key={skill}>{skill}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="progress-section shell section-grid reveal" id="progress">
          <div className="section-aside"><span className="section-number">05</span><p className="eyebrow">CURRENT LEARNING</p></div>
          <div className="section-content">
            <h2>Progress through<br />practice<span className="lime-period">.</span></h2>
            <p className="body-copy">{profile.currentlyLearning}</p>
            <LearningChart items={profile.learningProgress} />
          </div>
        </section>

        <ContactSection />
      </main>

      <footer className="footer shell">
        <a className="brand" href="#home"><span className="brand-mark">G</span><span>{profile.name}<small>BUILT WITH CURIOSITY</small></span></a>
        <p>© {new Date().getFullYear()} {profile.name}. Made to keep growing.</p>
        <a className="back-top" href="#home">BACK TO TOP ↑</a>
      </footer>
      <ChatWidget name={profile.name} />
      <button
        className="theme-toggle"
        type="button"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        aria-pressed={theme === "dark"}
        onClick={toggleTheme}
      >
        <span className="pull-cord" aria-hidden="true">
          <span className="pull-cord-line" />
          <span className="pull-cord-knob">{theme === "dark" ? "☼" : "☾"}</span>
        </span>
      </button>
      {activeProject && <ProjectRoom key={activeProject.id} project={activeProject} />}
    </div>
  );
}
