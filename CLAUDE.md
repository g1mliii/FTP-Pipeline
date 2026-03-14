## Design Context
This file should only impact the UI creation of the desktop wrapper under `apps/desktop/`, not the generated storefront output.
The storefront-conversion goal remains: take the Figma design and convert it into Shopify as faithfully as possible. This file should not be used to reinterpret or restyle the generated Shopify UI.
### Users
Primary users are business owners and operators using the desktop wrapper to turn a Figma file into a Shopify storefront for their own business. The wrapper should reduce setup friction, make the pipeline feel manageable, and keep technical steps understandable for non-expert users.

### Brand Personality
Modern, business-focused, simple. The interface should feel easy to use, calm, and relaxing rather than technical, noisy, or intimidating.

### Aesthetic Direction
Optimize for the desktop wrapper under `apps/desktop/`, not for generated storefront output. Use a dark-only interface direction inspired by the Claude desktop app UI: restrained, focused, polished, and workspace-oriented. Favor clear hierarchy, soft contrast between panels, warm accent color usage, and minimal visual clutter. Avoid loud consumer-marketing styling, playful novelty UI, or anything that feels busy, flashy, or hard to scan.

### Design Principles
1. Minimize cognitive load. Break the workflow into clear stages, reduce visible complexity, and make the next action obvious.
2. Preserve calm. Use a dark, stable visual system with restrained accents and predictable layouts so the tool feels relaxing during multi-step setup and build runs.
3. Prioritize business clarity. Labels, status, prerequisites, errors, and outcomes should be written for practical decision-making, not developer theater.
4. Make progress legible. Users should always understand what is ready, what is blocked, what is running, and what still needs action.
5. Keep accessibility built in. Maintain strong contrast in dark mode, visible focus states, keyboard-friendly controls, and support reduced-motion preferences by default.
