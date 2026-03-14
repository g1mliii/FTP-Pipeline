import { memo } from "react";
import type { SetupStepId } from "../../../shared/setup-types";

interface StepSidebarProps {
  activeStep: SetupStepId;
  completedSteps: Set<SetupStepId>;
  onSelectStep: (step: SetupStepId) => void;
  steps: Array<{ id: SetupStepId; title: string; description: string }>;
  workspaceRoot: string | undefined;
}

function StepSidebarComponent({ activeStep, completedSteps, onSelectStep, steps, workspaceRoot }: StepSidebarProps) {
  return (
    <aside className="app-sidebar">
      <a className="skip-link" href="#app-main">
        Skip to Main Content
      </a>

      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          AS
        </div>
        <div className="min-w-0">
          <p className="eyebrow">Guided wrapper</p>
          <h1>Auto-Build Desktop</h1>
        </div>
      </div>

      <nav className="step-nav" aria-label="Setup steps">
        {steps.map((step, index) => (
          <button
            key={step.id}
            className={`step-link${activeStep === step.id ? " is-active" : ""}${completedSteps.has(step.id) ? " is-done" : ""}`}
            type="button"
            onClick={() => onSelectStep(step.id)}
          >
            <span className="step-index" aria-hidden="true">
              {index + 1}
            </span>
            <span className="min-w-0">
              <strong>{step.title}</strong>
              <small>{step.description}</small>
            </span>
          </button>
        ))}
      </nav>

      <div className="workspace-card">
        <span className="eyebrow">Workspace</span>
        <code>{workspaceRoot ?? "Resolving workspace root…"}</code>
      </div>
    </aside>
  );
}

export const StepSidebar = memo(StepSidebarComponent);
