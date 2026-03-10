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
const assetFiles = (await readdir(assetsDir)).filter((file) => file.endsWith(".css"));
const css = (
  await Promise.all(assetFiles.map((file) => readFile(path.join(assetsDir, file), "utf8")))
).join("\n");
const hero = spec.sections.find((section) => section.type === "hero_stack");

if (!hero) {
  throw new Error("The normalized spec must include a hero_stack section.");
}

await mkdir(previewDir, { recursive: true });

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
      <p class="preview-note">
        Local preview mirrors the normalized Figma spec. The generated Liquid files live under <code>output/&lt;design-slug&gt;/theme</code>.
      </p>
      <section class="jewelry-hero" data-section-handle="${hero.handle}">
        <div class="jewelry-hero__track">
          ${hero.blocks
            .map(
              (block) => `
            <article class="jewelry-hero__panel${block.featured ? " is-featured" : ""}">
              <div class="jewelry-hero__media">
                <img class="jewelry-hero__image" src="${block.imageUrl}" alt="${block.imageAlt}">
                <div class="jewelry-hero__overlay"></div>
              </div>
              <div class="jewelry-hero__content">
                <h2 class="jewelry-hero__title">${block.title.replace(/\n/g, "<br>")}</h2>
                ${
                  block.subtitle
                    ? `<p class="jewelry-hero__subtitle">${block.subtitle}</p>`
                    : ""
                }
                <a class="jewelry-hero__link" href="${block.linkUrl}">${block.linkLabel}</a>
              </div>
            </article>`
            )
            .join("")}
        </div>
        ${
          hero.settings.mobileHint
            ? `<div class="jewelry-hero__hint" aria-hidden="true">
            ${hero.blocks
              .map(
                (block, index) =>
                  `<span class="jewelry-hero__dot${index === 0 ? " is-active" : ""}"></span>`
              )
              .join("")}
          </div>`
            : ""
        }
      </section>
    </main>
  </body>
</html>
`;

await writeFile(path.join(previewDir, "index.html"), html, "utf8");

console.log(`Built preview page: ${path.relative(rootDir, path.join(previewDir, "index.html"))}`);
