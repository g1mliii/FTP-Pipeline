# Agent Instructions

All development workflow, engineering standards, and operational patterns for this repository are defined here.

For project architecture, build commands, and quick reference, see [CLAUDE.md](CLAUDE.md).

For the phase-by-phase implementation roadmap, see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

For non-negotiable product guardrails and task templates, see [tasks/operating_principles.md](tasks/operating_principles.md).

---

## Operating Principles (Non-Negotiable)

1. **Correctness over cleverness**: Prefer boring, readable solutions that are easy to maintain.
2. **Smallest change that works**: Minimize blast radius; don't refactor adjacent code unless it meaningfully reduces risk.
3. **Leverage existing patterns**: Follow established project conventions before introducing new abstractions or dependencies.
4. **Prove it works**: "Seems right" is not done. Validate with tests/build/lint and/or a reliable manual repro.
5. **Be explicit about uncertainty**: If you cannot verify something, say so and propose the safest next step.

---

## Workflow Orchestration

### 1. Plan Mode Default

Enter plan mode for any non-trivial task (3+ steps, multi-file change, architectural decision, performance-impacting behavior).

- Include verification steps in the plan (not as an afterthought).
- If new information invalidates the plan: stop, update the plan, then continue.
- Write a crisp spec first when requirements are ambiguous (inputs/outputs, edge cases, success criteria).

### 2. Subagent Strategy (Parallelize Intelligently)

Use subagents to keep the main context clean and to parallelize:
- Repo exploration and pattern discovery
- Test failure triage
- Dependency research
- Performance profiling analysis

Give each subagent one focused objective and a concrete deliverable:
- "Find where X is configured and list the values" beats "look around."

Merge subagent outputs into a short, actionable synthesis before coding.

---

## Task Management (File-Based, Auditable)

### Plan First
Write a checklist to `tasks/todo.md` for any non-trivial work. Include "Verify" tasks explicitly.

### Define Success
Add acceptance criteria (what must be true when done).

### Track Progress
Mark items complete as you go; keep one "in progress" item at a time.

### Document Results
Add a short "Results" section: what changed, where, how verified.

### Capture Lessons
Update `tasks/lessons.md` after corrections or postmortems.

---

## Error Handling and Recovery Patterns

### 1. "Stop-the-Line" Rule
If anything unexpected happens (test failures, build errors, regressions):
- Stop adding features.
- Preserve evidence (error output, repro steps).
- Return to diagnosis and re-plan.

### 2. Triage Checklist (Use in Order)
1. Reproduce reliably (test, script, or minimal steps).
2. Localize the failure (which layer: main process, renderer, IPC, build, packaging).
3. Reduce to a minimal failing case.
4. Fix root cause (not symptoms).
5. Guard with regression coverage.
6. Verify end-to-end for the original report.

### 3. Safe Fallbacks
- Prefer "safe default + warning" over partial behavior.
- Degrade gracefully: pipeline errors should not crash the Electron shell.
- Invalid Figma data should show a clear error, not a broken UI state.

### 4. Rollback Strategy
Keep changes reversible:
- Isolated commits with clear scope.
- If unsure about impact: implement behind a disabled-by-default flag.

---

## Communication Guidelines

### 1. Be Concise, High-Signal
- Lead with outcome and impact, not process.
- Reference concrete artifacts: file paths, function names, error messages.

### 2. Ask Questions Only When Blocked
- Ask exactly one targeted question.
- Provide a recommended default.
- State what would change depending on the answer.

### 3. State Assumptions and Constraints
- If you inferred requirements, list them briefly.
- If you could not run verification, say why and how to verify.

### 4. Show the Verification Story
- What you ran (tests/lint/build), and the outcome.
- If you didn't run something, give a minimal command list the user can run.

### 5. Avoid "Busywork Updates"
- Don't narrate every step.
- Do provide checkpoints when scope changes, risks appear, or verification fails.

---

## Context Management Strategies

### 1. Read Before Write
Before editing:
- Locate the authoritative source of truth (existing module/pattern/tests).
- Prefer small, local reads (targeted files) over scanning the whole repo.

### 2. Keep a Working Memory
Maintain a short running "Working Notes" section in `tasks/todo.md` for constraints, decisions, and discovered pitfalls.

### 3. Minimize Cognitive Load in Code
- Prefer explicit names and direct control flow.
- Avoid clever meta-programming unless the project already uses it.
- Leave code easier to read than you found it.

### 4. Control Scope Creep
If a change reveals deeper issues:
- Fix only what is necessary for correctness/safety.
- Log follow-ups as TODOs/issues rather than expanding the current task.

---

## Templates

### Plan Template (Paste into tasks/todo.md)
```
## [Task Name]

### Goal
[One sentence description]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Steps
1. [ ] Restate goal + acceptance criteria
2. [ ] Locate existing implementation / patterns
3. [ ] Design: minimal approach + key decisions
4. [ ] Implement smallest safe slice
5. [ ] Add/adjust tests
6. [ ] Run verification (lint/tests/build/manual repro)
7. [ ] Summarize changes + verification story
8. [ ] Record lessons (if any)

### Results
[Fill in after completion]

### Lessons
[Fill in if applicable]
```

### Bugfix Template
```
## Bug: [Short Description]

### Repro Steps
1. Step 1
2. Step 2

### Expected vs Actual
- Expected: [behavior]
- Actual: [behavior]

### Root Cause
[Analysis]

### Fix
[Description of changes]

### Regression Coverage
[Tests added]

### Verification Performed
[What you ran and the outcome]

### Risk/Rollback Notes
[Any concerns or rollback strategy]
```
