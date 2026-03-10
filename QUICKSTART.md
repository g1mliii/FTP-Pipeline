# Quickstart Guide

This guide gets you from a Figma file to a working Shopify theme preview in one session.
No prior experience with Shopify CLI or Playwright required.

---

## What this does

You give it a Figma design. It generates a Shopify theme from that design — sections,
templates, everything — and shows you a live local preview. If you have a Shopify store,
it can push the theme there too.

At the end it tells you exactly what still needs to be created in your Shopify store
(products, pages, collections) with the exact names and settings.

---

## What you need before you start

1. **Claude Code** installed on your computer — this is what runs everything
2. **The figma-to-shopify-pipeline skill** installed in Claude (see step 1 below)
3. **Node.js** — download from [nodejs.org](https://nodejs.org) and install it
4. **Your Figma file** — you need the file key (the random letters in the Figma URL)

Optional (only if you want to push to a real Shopify store):
- A Shopify store
- Shopify CLI installed — [shopify.dev/docs/themes/tools/cli](https://shopify.dev/docs/themes/tools/cli)

---

## Step 1 — Install the skill

The skill is what tells Claude how to run this pipeline. You only do this once.

1. Download the `figma-to-shopify-pipeline.skill` file (whoever shared this repo with
   you should have sent it alongside)
2. Open Claude Code
3. Go to **Settings → Skills**
4. Click **Install from file** and select the `.skill` file

Done. The skill is now available in all your Claude sessions.

---

## Step 2 — Get the repo on your computer

If you received a zip file, unzip it anywhere convenient (e.g. your Desktop).

If you have git:
```
git clone <repo-url>
cd <repo-folder>
```

---

## Step 3 — Find your Figma file key

Open your Figma file in the browser. Look at the URL:

```
https://www.figma.com/design/xqblqd1l/My-Brand-Website?...
                             ^^^^^^^^
                             this is your file key
```

Copy that key. You'll paste it into the prompt in a moment.

---

## Step 4 — Choose a slug for your project

A slug is just a short name that keeps your project files organized.
Make it lowercase with hyphens, and add part of the Figma file key at the end so it stays unique.

Example: `my-brand--xqblqd1l`

---

## Step 5 — Run the pipeline

Open Claude Code in the repo folder. Copy the prompt below, fill in your details, and send it.

```
Use the repo's AGENTS.md and figma-to-shopify-pipeline skill.

Fetch the Figma file with key <YOUR_FIGMA_FILE_KEY>, normalize all routes into
input/designs/<YOUR_DESIGN_SLUG>/normalized/, generate the full Shopify theme
under output/<YOUR_DESIGN_SLUG>/theme/, build local previews, and run Playwright
smoke tests across every route.

DESIGN_SLUG=<YOUR_DESIGN_SLUG>
FIGMA_FILE_KEY=<YOUR_FIGMA_FILE_KEY>

Tell me what Shopify backend resources I still need to create, with exact handles
and template assignments.
```

Replace the two placeholders:
- `<YOUR_FIGMA_FILE_KEY>` → the key you copied in step 3
- `<YOUR_DESIGN_SLUG>` → the slug you chose in step 4

Claude will run everything and show you a local preview when it's done.

---

## Step 6 — Read the handoff list

When Claude finishes it will give you a list like this:

```
Resource checklist:
- page: membership  →  assign page.membership  →  publish: yes
- product: vue-chain-necklace  →  assign product.vue-chain-necklace  →  publish: yes
```

These are the things that need to exist in your Shopify store before those pages will work.
The theme is ready — you just need to create these items in Shopify admin and assign the
template names listed.

---

## Pushing to a real Shopify store (optional)

If you want to push the theme to a live Shopify preview:

1. Install Shopify CLI and log in:
   ```
   shopify theme list --store your-store.myshopify.com
   ```

2. Create a preview theme (do this once):
   ```
   shopify theme share --store your-store.myshopify.com --path output/<YOUR_DESIGN_SLUG>/theme
   ```
   It will print a theme ID. Save that number.

3. Use the full pipeline prompt from `PROMPT.md` (also in this repo), filling in your
   store domain and that theme ID.

From then on Claude will push to that same preview theme every time.

---

## Something went wrong?

**"I don't have a FIGMA_TOKEN"**
If your Figma file is accessible via Figma MCP (you're logged into Figma in Claude),
you don't need a token. Just paste the full Figma URL in your prompt instead.

**Claude stopped after the homepage**
Tell it: "Continue — convert the remaining routes from the Figma file too."

**Routes are 404ing on Shopify**
The theme is fine. You just need to create the products/pages/collections listed in
the handoff checklist. Claude will have told you the exact handle and template for each one.

**Node.js errors on first run**
Make sure you ran `npm install` in the repo folder first. Claude should do this automatically
but if it didn't, open a terminal in the repo folder and run it manually.

---

## That's it

The whole point of this setup is that you describe what you want in plain English and
Claude handles the technical parts. The prompts in `PROMPT.md` cover the main scenarios.
