import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useLocation, useNavigate } from "react-router-dom";
import Door from "./Door.jsx";

function DoorSelector({ projects }) {
  const navigate = useNavigate();
  const location = useLocation();
  const selectorRef = useRef(null);
  const sceneRef = useRef(null);
  const headingRef = useRef(null);
  const doorRefs = useRef([]);
  const glowRef = useRef(null);
  const timelineRef = useRef(null);
  const previousPathRef = useRef(location.pathname);
  const openedProjectIdRef = useRef(null);

  useEffect(() => {
    const returnedProjectId = location.state?.focusProjectId;
    const returnedFromRoom = previousPathRef.current.startsWith("/project/") && location.pathname === "/";
    previousPathRef.current = location.pathname;

    if (location.pathname.startsWith("/project/")) return;

    if (returnedFromRoom && timelineRef.current) {
      timelineRef.current.eventCallback("onReverseComplete", () => {
        const index = projects.findIndex((project) => project.id === openedProjectIdRef.current);
        if (index < 0) return;
        gsap.set(doorRefs.current[index], { clearProps: "transition" });
        doorRefs.current[index]?.focus();
      });
      timelineRef.current.reverse();
      return;
    }

    if (returnedProjectId) {
      const index = projects.findIndex((project) => project.id === returnedProjectId);
      doorRefs.current[index]?.focus();
      doorRefs.current[index]?.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [location.pathname, location.state, projects]);

  useEffect(() => () => timelineRef.current?.kill(), []);

  function openProject(project, index) {
    if (timelineRef.current?.isActive()) return;
    openedProjectIdRef.current = project.id;

    const section = selectorRef.current;
    const scene = sceneRef.current;
    const heading = headingRef.current;
    const selectedDoor = doorRefs.current[index];
    const glow = glowRef.current;
    if (!section || !scene || !heading || !selectedDoor || !glow) return;

    timelineRef.current?.kill();
    gsap.set(selectedDoor, { transition: "none" });
    glow.style.setProperty("--project-accent", project.accentColor);
    gsap.set(glow, { opacity: 0 });
    gsap.set(scene, { clearProps: "transform,opacity,filter" });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeline = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => navigate(`/project/${project.id}`, { state: { enteredFromDoor: true } }),
    });
    timelineRef.current = timeline;

    if (reducedMotion) {
      timeline.to(glow, { opacity: 0.9, duration: 0.15 }, 0);
      timeline.to(scene, { opacity: 0, duration: 0.3 }, 0.15);
      return;
    }

    const stageRect = scene.getBoundingClientRect();
    const doorRect = selectedDoor.getBoundingClientRect();
    const originX = doorRect.left + doorRect.width / 2 - stageRect.left;
    const originY = doorRect.top + doorRect.height / 2 - stageRect.top;
    const otherDoors = doorRefs.current.filter((door) => door && door !== selectedDoor);

    // Tune the enter transition here; the full timeline is approximately 1.8 seconds.
    timeline.to(selectedDoor.querySelector(".door-knob"), { rotate: 25, duration: 0.12, ease: "power1.inOut" }, 0);
    timeline.to(selectedDoor, { x: -3, rotateY: -3, duration: 0.08, yoyo: true, repeat: 2, ease: "power1.inOut" }, 0.05);
    timeline.to(selectedDoor, {
      rotateY: -105,
      boxShadow: `inset -28px 0 42px ${project.accentColor}`,
      duration: 0.7,
      ease: "power2.inOut",
    }, 0.25);
    timeline.to([heading, ...otherDoors], { opacity: 0, filter: "blur(8px)", duration: 0.4 }, 0.35);
    timeline.to(glow, { opacity: 1, duration: 0.65, ease: "power1.in" }, 0.95);
    timeline.to(scene, {
      scale: 6,
      transformOrigin: `${originX}px ${originY}px`,
      duration: 0.7,
      ease: "power2.in",
    }, 1.05);
    timeline.to(scene, { opacity: 0, duration: 0.12 }, 1.63);
  }

  return (
    <section className="door-selector-section" id="projects" ref={selectorRef}>
      <div className="door-selector-scene" ref={sceneRef}>
        <header className="door-selector-heading" ref={headingRef}>
          <h2>Know more about my<br />projects<span className="lime-period">.</span></h2>
          <p>Choose a door to step into that project.</p>
        </header>
        <div className="door-scroller" aria-label="Projects">
          <div className="door-row">
            {projects.map((project, index) => (
              <Door
                key={project.id}
                ref={(element) => { doorRefs.current[index] = element; }}
                project={project}
                index={index}
                disabled={Boolean(timelineRef.current?.isActive())}
                onOpen={() => openProject(project, index)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="door-transition-glow" ref={glowRef} aria-hidden="true" />
    </section>
  );
}

export default DoorSelector;
