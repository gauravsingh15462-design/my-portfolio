import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { useLocation, useNavigate } from "react-router-dom";

function ProjectRoom({ project }) {
  const navigate = useNavigate();
  const location = useLocation();
  const roomRef = useRef(null);
  const glowRef = useRef(null);
  const headingRef = useRef(null);
  const contentRef = useRef(null);
  const entryTimelineRef = useRef(null);
  const returnTimelineRef = useRef(null);
  const enteredFromDoor = location.state?.enteredFromDoor === true;

  useLayoutEffect(() => {
    headingRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (enteredFromDoor && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(glowRef.current, { opacity: 1, backgroundColor: project.accentColor });
      gsap.set(contentRef.current?.children, { opacity: 0, y: 20 });
      const timeline = gsap.timeline();
      entryTimelineRef.current = timeline;
      timeline.to(glowRef.current, { opacity: 0, duration: 0.55, ease: "power1.out" }, 0.15);
      timeline.to(contentRef.current?.children, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: "power2.out",
      }, 0.25);
    } else if (enteredFromDoor) {
      gsap.set(glowRef.current, { opacity: 1, backgroundColor: project.accentColor });
      gsap.set(contentRef.current?.children, { opacity: 0 });
      entryTimelineRef.current = gsap.timeline()
        .to(glowRef.current, { opacity: 0, duration: 0.3 })
        .to(contentRef.current?.children, { opacity: 1, duration: 0.3 }, 0);
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      entryTimelineRef.current?.kill();
      returnTimelineRef.current?.kill();
    };
  }, [enteredFromDoor, project.accentColor]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") goBack();
      if (event.key !== "Tab") return;

      const focusable = roomRef.current?.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (document.activeElement === headingRef.current) {
        event.preventDefault();
        if (event.shiftKey || focusable.length === 1) first.focus();
        else focusable[1].focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project.id, enteredFromDoor]);

  function finishBackNavigation() {
    if (enteredFromDoor && window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate("/#projects", {
      replace: true,
      state: { focusProjectId: project.id },
    });
  }

  function goBack() {
    if (returnTimelineRef.current?.isActive()) return;
    entryTimelineRef.current?.kill();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timeline = gsap.timeline({ onComplete: finishBackNavigation });
      returnTimelineRef.current = timeline;
      timeline.to(roomRef.current, { opacity: 0, duration: 0.15 });
      timeline.to(glowRef.current, { opacity: 1, duration: 0.15 }, 0);
      return;
    }

    const timeline = gsap.timeline({ onComplete: finishBackNavigation });
    returnTimelineRef.current = timeline;
    timeline.to(contentRef.current?.children, { opacity: 0, y: -16, duration: 0.3, stagger: 0.04 }, 0);
    timeline.to(glowRef.current, { opacity: 1, duration: 0.5, ease: "power1.in" }, 0.15);
    timeline.to(roomRef.current, { opacity: 0, duration: 0.25 }, 0.4);
  }

  const projectLinks = [
    ["Live", project.links.live],
    ["Repo", project.links.repo],
  ];

  return (
    <div
      className="project-room-page"
      ref={roomRef}
      style={{ "--project-accent": project.accentColor }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-room-title"
    >
      <div className="project-room-glow" ref={glowRef} aria-hidden="true" />
      <div className="project-room-topbar">
        <button className="project-room-back" type="button" onClick={goBack}>
          <span aria-hidden="true">←</span> Back to the door
        </button>
        <span className="project-room-count">{project.title}</span>
      </div>
      <div className="project-room-layout" ref={contentRef}>
        <div className="project-room-device" aria-hidden="true">
          <div className="project-device-screen">
            <div className="project-device-toolbar"><i /><i /><i /><span>{project.previewLabel}</span></div>
            <div className="project-device-stats"><i /><i /><i /></div>
            <div className="project-device-chart"><i /><i /><i /><i /><i /><i /></div>
            <div className="project-device-lines"><i /><i /><i /></div>
          </div>
          <div className="project-device-base" />
          <p>PROJECT PREVIEW</p>
        </div>

        <main className="project-room-copy">
          <p className="eyebrow">PROJECT DETAIL</p>
          <h1 id="project-room-title" ref={headingRef} tabIndex={-1}>{project.title}</h1>
          <p className="project-room-tagline">{project.tagline}</p>
          <p className="project-room-description">{project.description}</p>

          <div className="project-room-metadata">
            <section>
              <h2>My role</h2>
              <p>{project.role}</p>
            </section>
            <section>
              <h2>Status</h2>
              <p>{project.status}</p>
            </section>
          </div>

          <ul className="project-room-tech" aria-label="Technologies and project areas">
            {project.techChips.map((chip) => <li key={chip}>{chip}</li>)}
          </ul>

          <div className="project-room-links">
            {projectLinks.map(([label, url]) => (
              url
                ? <a key={label} href={url} target="_blank" rel="noreferrer">{label} <span aria-hidden="true">↗</span></a>
                : <button key={label} type="button" disabled title={`${label} link not provided`}>{label} · not provided</button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProjectRoom;
