import { forwardRef } from "react";

const Door = forwardRef(function Door({ project, index, disabled, onOpen }, ref) {
  return (
    <article className="door-tile">
      <div className="door-perspective">
        <div className="door-frame">
          <div className="door-interior" aria-hidden="true">
            <span className="door-interior-glow" />
          </div>
          <button
            ref={ref}
            className="door-panel"
            type="button"
            aria-label={`Open door: ${project.title}`}
            aria-haspopup="dialog"
            disabled={disabled}
            onClick={onOpen}
          >
            <span className="door-inset-panel" aria-hidden="true" />
            <span className="door-raised-panel door-raised-panel-upper" aria-hidden="true" />
            <span className="door-raised-panel door-raised-panel-lower" aria-hidden="true" />
            <span className="door-panel-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="door-panel-title">{project.title}</span>
            <span className="door-knob" aria-hidden="true" />
            <span className="door-hinges" aria-hidden="true"><i /><i /><i /></span>
          </button>
        </div>
      </div>
    </article>
  );
});

export default Door;
