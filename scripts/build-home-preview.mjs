import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const specPath = process.argv[2]
  ? path.resolve(rootDir, process.argv[2])
  : path.join(rootDir, "input", "normalized", "jewelry-home.json");
const assetsDir = path.join(rootDir, "output", "theme", "assets");
const previewDir = path.join(rootDir, "output", "preview");

const spec = JSON.parse(await readFile(specPath, "utf8"));
const cssFiles = (await readdir(assetsDir)).filter((file) => file.endsWith(".css"));
const css = (
  await Promise.all(cssFiles.map((file) => readFile(path.join(assetsDir, file), "utf8")))
).join("\n");

await mkdir(previewDir, { recursive: true });

const renderHero = (section) => `<section class="jewelry-hero" data-section-handle="${section.handle}">
  <div class="jewelry-hero__track">
    ${section.blocks
      .map(
        (block, index) => `<article class="jewelry-hero__panel${block.featured ? " is-featured" : ""}">
      <div class="jewelry-hero__media">
        <img class="jewelry-hero__image" src="${block.imageUrl}" alt="${block.imageAlt}">
        <div class="jewelry-hero__overlay"></div>
      </div>
      <div class="jewelry-hero__content">
        <h2 class="jewelry-hero__title">${block.title.replace(/\n/g, "<br>")}</h2>
        ${block.subtitle ? `<p class="jewelry-hero__subtitle">${block.subtitle}</p>` : ""}
        <a class="jewelry-hero__link" href="${block.linkUrl}">${block.linkLabel}</a>
      </div>
    </article>`
      )
      .join("")}
  </div>
  ${
    section.settings.mobileHint
      ? `<div class="jewelry-hero__hint" aria-hidden="true">
      ${section.blocks
        .map((_, index) => `<span class="jewelry-hero__dot${index === 0 ? " is-active" : ""}"></span>`)
        .join("")}
    </div>`
      : ""
  }
</section>`;

const renderTrending = (section) => `<section class="jewelry-trending section-shell">
  <div class="section-shell__inner section-shell__inner--narrow">
    <p class="section-eyebrow">${section.settings.eyebrow}</p>
    <h2 class="section-heading">${section.settings.heading} <em class="section-accent">${section.settings.accentText}</em></h2>
  </div>
  <div class="jewelry-trending__grid">
    ${section.blocks
      .map(
        (block) => `<a class="jewelry-product-card" href="${block.linkUrl}">
      <div class="jewelry-product-card__media">
        <img class="jewelry-product-card__image" src="${block.imageUrl}" alt="${block.imageAlt}">
        <span class="jewelry-product-card__badge${block.soldOut ? " is-muted" : ""}">${block.tag}</span>
      </div>
      <div class="jewelry-product-card__content">
        <h3 class="jewelry-product-card__title">${block.title}</h3>
        <p class="jewelry-product-card__price">${block.comparePrice ? `<s>${block.comparePrice}</s>` : ""}<span>${block.price}</span></p>
        <span class="jewelry-product-card__cta">Add to Cart</span>
      </div>
    </a>`
      )
      .join("")}
  </div>
  <div class="section-shell__cta"><a class="button-outline" href="${section.settings.ctaUrl}">${section.settings.ctaLabel}</a></div>
</section>`;

const renderPress = (section) => `<section class="jewelry-press section-shell">
  <div class="jewelry-press__logos">
    ${section.blocks
      .map((block) => `<span class="jewelry-press__logo jewelry-press__logo--${block.style}">${block.label}</span>`)
      .join("")}
  </div>
  <div class="jewelry-press__copy">
    <h3 class="jewelry-press__heading">${section.settings.heading}</h3>
    <p class="jewelry-press__body">${section.settings.body}</p>
  </div>
</section>`;

const iconSvg = {
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.75l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.76l-5.1 2.69.97-5.68L3.75 9.75l5.7-.83L12 3.75z" fill="none" stroke="currentColor" stroke-width="1.2"></path></svg>',
  diamond: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8.25 12 20l6-11.75-3-4.25H9L6 8.25zM6 8.25h12" fill="none" stroke="currentColor" stroke-width="1.2"></path></svg>',
  package: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8.25h15v9h-15zm3-4.5h9v4.5h-9z" fill="none" stroke="currentColor" stroke-width="1.2"></path></svg>'
};

const renderProcess = (section) => `<section class="jewelry-process section-shell">
  <div class="section-shell__inner section-shell__inner--narrow">
    <p class="section-eyebrow">${section.settings.eyebrow}</p>
    <h2 class="section-heading section-heading--light">${section.settings.heading}</h2>
    <div class="section-rule"></div>
    <p class="section-intro section-intro--light">${section.settings.intro}</p>
  </div>
  <div class="jewelry-process__steps">
    ${section.blocks
      .map(
        (block) => `<article class="jewelry-process__card">
      <div class="jewelry-process__number">${block.stepNumber}</div>
      <div class="jewelry-process__icon">${iconSvg[block.icon]}</div>
      <h3 class="jewelry-process__title">${block.title}</h3>
      <p class="jewelry-process__body">${block.body}</p>
    </article>`
      )
      .join("")}
  </div>
  <div class="section-shell__cta"><a class="button-outline button-outline--accent" href="${section.settings.ctaUrl}">${section.settings.ctaLabel}</a></div>
</section>`;

const renderCollections = (section) => `<section class="jewelry-collections section-shell">
  <div class="section-shell__inner section-shell__inner--narrow">
    <p class="section-eyebrow">${section.settings.eyebrow}</p>
    <h2 class="section-heading">${section.settings.heading} <em class="section-accent">${section.settings.accentText}</em></h2>
    <div class="section-rule"></div>
  </div>
  <div class="jewelry-collections__grid">
    ${section.blocks
      .map(
        (block) => `<a class="jewelry-collection-card" href="${block.linkUrl}">
      <img class="jewelry-collection-card__image" src="${block.imageUrl}" alt="${block.imageAlt}">
      <div class="jewelry-collection-card__overlay"></div>
      <div class="jewelry-collection-card__content">
        <h3 class="jewelry-collection-card__title">${block.title}</h3>
        <span class="jewelry-collection-card__cta">${block.linkLabel}</span>
      </div>
    </a>`
      )
      .join("")}
  </div>
</section>`;

const renderSection = (section) => {
  switch (section.type) {
    case "hero_stack":
      return renderHero(section);
    case "trending_grid":
      return renderTrending(section);
    case "press_strip":
      return renderPress(section);
    case "process_steps":
      return renderProcess(section);
    case "collection_grid":
      return renderCollections(section);
    default:
      return "";
  }
};

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${spec.meta.name}</title>
    <style>
      .preview-note {
        max-width: 80rem;
        margin: 0 auto;
        padding: 0.9rem 1rem;
        color: rgba(13, 13, 13, 0.72);
        font-size: 0.92rem;
        font-family: ${spec.theme.fontBody};
      }

${css}
    </style>
  </head>
  <body>
    <main>
      <p class="preview-note">Local preview mirrors the normalized Figma spec. The generated Liquid files live under <code>output/&lt;design-slug&gt;/theme</code>.</p>
      ${spec.sections.map(renderSection).join("\n")}
    </main>
  </body>
</html>
`;

await writeFile(path.join(previewDir, "index.html"), html, "utf8");
console.log(`Built preview page: ${path.relative(rootDir, path.join(previewDir, "index.html"))}`);
