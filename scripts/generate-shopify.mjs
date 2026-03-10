import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const specPath = process.argv[2]
  ? path.resolve(rootDir, process.argv[2])
  : path.join(rootDir, "input", "normalized", "jewelry-home.json");
const outputDir = path.join(rootDir, "output", "theme");

const spec = JSON.parse(await readFile(specPath, "utf8"));

await rm(outputDir, { recursive: true, force: true });

await Promise.all([
  mkdir(path.join(outputDir, "assets"), { recursive: true }),
  mkdir(path.join(outputDir, "config"), { recursive: true }),
  mkdir(path.join(outputDir, "layout"), { recursive: true }),
  mkdir(path.join(outputDir, "locales"), { recursive: true }),
  mkdir(path.join(outputDir, "sections"), { recursive: true }),
  mkdir(path.join(outputDir, "snippets"), { recursive: true }),
  mkdir(path.join(outputDir, "templates"), { recursive: true })
]);

const heroSection = spec.sections.find((section) => section.type === "hero_stack");

if (!heroSection) {
  throw new Error("The normalized spec must include a hero_stack section.");
}

const sectionFile = path.join(outputDir, "sections", `${heroSection.handle}.liquid`);
const snippetFile = path.join(outputDir, "snippets", "jewelry-hero-panel.liquid");
const templateFile = path.join(outputDir, "templates", "index.json");
const sectionCssFile = path.join(outputDir, "assets", "jewelry-home-hero.css");
const themeCssFile = path.join(outputDir, "assets", "theme.css");
const layoutFile = path.join(outputDir, "layout", "theme.liquid");
const configFile = path.join(outputDir, "config", "settings_schema.json");
const localeFile = path.join(outputDir, "locales", "en.default.json");

const downloadHeroAssets = async () => {
  await Promise.all(
    heroSection.blocks.map(async (block, index) => {
      const response = await fetch(block.imageUrl);

      if (!response.ok) {
        throw new Error(`Failed to download hero image ${index + 1}: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const assetPath = path.join(outputDir, "assets", `hero-panel-${index + 1}.jpg`);
      await writeFile(assetPath, buffer);
    })
  );
};

const liquid = `{%- liquid
  assign section_id = section.id
-%}

{{ 'theme.css' | asset_url | stylesheet_tag }}
{{ 'jewelry-home-hero.css' | asset_url | stylesheet_tag }}

<section class="jewelry-hero" id="shopify-section-{{ section_id }}">
  <div class="jewelry-hero__track">
    {% for block in section.blocks %}
      {% assign panel_class = '' %}
      {% if block.settings.featured or forloop.first %}
        {% assign panel_class = ' is-featured' %}
      {% endif %}

      {% capture asset_name %}hero-panel-{{ forloop.index }}.jpg{% endcapture %}

      {% render 'jewelry-hero-panel',
        block: block,
        panel_class: panel_class,
        asset_name: asset_name
      %}
    {% endfor %}
  </div>

  {% if section.settings.show_mobile_hint %}
    <div class="jewelry-hero__hint" aria-hidden="true">
      {% for block in section.blocks %}
        <span class="jewelry-hero__dot{% if forloop.first %} is-active{% endif %}"></span>
      {% endfor %}
    </div>
  {% endif %}
</section>

{% schema %}
{
  "name": "Jewelry home hero",
  "tag": "section",
  "class": "section section--jewelry-hero",
  "settings": [
    {
      "type": "checkbox",
      "id": "show_mobile_hint",
      "label": "Show mobile hint dots",
      "default": ${heroSection.settings.mobileHint ? "true" : "false"}
    }
  ],
  "max_blocks": 3,
  "blocks": [
    {
      "type": "panel",
      "name": "Panel",
      "settings": [
        {
          "type": "textarea",
          "id": "title",
          "label": "Title"
        },
        {
          "type": "text",
          "id": "subtitle",
          "label": "Subtitle"
        },
        {
          "type": "text",
          "id": "link_label",
          "label": "Link label"
        },
        {
          "type": "url",
          "id": "link_url",
          "label": "Link URL"
        },
        {
          "type": "image_picker",
          "id": "image",
          "label": "Image"
        },
        {
          "type": "text",
          "id": "image_alt",
          "label": "Image alt"
        },
        {
          "type": "checkbox",
          "id": "featured",
          "label": "Feature this panel on desktop",
          "default": false
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Jewelry home hero",
      "blocks": ${JSON.stringify(
        heroSection.blocks.map((block) => ({
          type: "panel",
          settings: {
            title: block.title,
            subtitle: block.subtitle,
            link_label: block.linkLabel,
            link_url: block.linkUrl,
            image_alt: block.imageAlt,
            featured: block.featured
          }
        })),
        null,
        8
      )}
    }
  ]
}
{% endschema %}
`;

const snippet = `{% doc %}
  Render a single image panel inside the jewelry hero section.

  @param {object} block - The Shopify block object for the panel.
  @param {string} [panel_class] - Additional modifier classes.
  @param {string} [asset_name] - Local theme asset used as the default image.
{% enddoc %}

<article class="jewelry-hero__panel{{ panel_class }}" {{ block.shopify_attributes }}>
  <div class="jewelry-hero__media">
    {% if block.settings.image != blank %}
      {{
        block.settings.image
        | image_url: width: 1600
        | image_tag:
          loading: 'lazy',
          class: 'jewelry-hero__image',
          alt: block.settings.image.alt | default: block.settings.image_alt | escape
      }}
    {% elsif asset_name != blank %}
      <img
        class="jewelry-hero__image"
        src="{{ asset_name | asset_url }}"
        alt="{{ block.settings.image_alt | escape }}"
        width="1080"
        height="1350"
        loading="lazy"
      >
    {% endif %}
    <div class="jewelry-hero__overlay"></div>
  </div>

  <div class="jewelry-hero__content">
    {% if block.settings.title != blank %}
      <h2 class="jewelry-hero__title">{{ block.settings.title | escape | newline_to_br }}</h2>
    {% endif %}

    {% if block.settings.subtitle != blank %}
      <p class="jewelry-hero__subtitle">{{ block.settings.subtitle | escape }}</p>
    {% endif %}

    {% if block.settings.link_label != blank and block.settings.link_url != blank %}
      <a class="jewelry-hero__link" href="{{ block.settings.link_url }}">
        {{ block.settings.link_label | escape }}
      </a>
    {% endif %}
  </div>
</article>
`;

const templateBlocks = Object.fromEntries(
  heroSection.blocks.map((block, index) => [
    `panel_${index + 1}`,
    {
      type: "panel",
      settings: {
        title: block.title,
        subtitle: block.subtitle,
        link_label: block.linkLabel,
        link_url: block.linkUrl,
        image_alt: block.imageAlt,
        featured: block.featured
      }
    }
  ])
);

const template = {
  sections: {
    hero: {
      type: heroSection.handle,
      settings: {
        show_mobile_hint: heroSection.settings.mobileHint
      },
      blocks: templateBlocks,
      block_order: Object.keys(templateBlocks)
    }
  },
  order: ["hero"]
};

const themeCss = `@import url('${spec.theme.fontImport}');

:root {
  --page-background: ${spec.theme.background};
  --page-text: ${spec.theme.text};
  --hero-accent: ${spec.theme.accent};
  --hero-muted-text: ${spec.theme.mutedText};
  --hero-overlay-strong: ${spec.theme.overlayStrong};
  --hero-overlay-soft: ${spec.theme.overlaySoft};
  --font-display: ${spec.theme.fontDisplay};
  --font-body: ${spec.theme.fontBody};
}

html,
body {
  margin: 0;
  min-height: 100%;
  background: var(--page-background);
  color: var(--page-text);
  font-family: var(--font-body);
}

body {
  overflow-x: hidden;
}

img {
  display: block;
  max-width: 100%;
}
`;

const sectionCss = `.jewelry-hero {
  position: relative;
  background: var(--page-background);
}

.jewelry-hero__track {
  display: flex;
  height: 85vh;
  min-height: 36rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.jewelry-hero__track::-webkit-scrollbar {
  display: none;
}

.jewelry-hero__panel {
  position: relative;
  min-width: 100%;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  scroll-snap-align: center;
  color: #ffffff;
}

.jewelry-hero__media,
.jewelry-hero__overlay {
  position: absolute;
  inset: 0;
}

.jewelry-hero__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 700ms ease;
}

.jewelry-hero__panel:hover .jewelry-hero__image {
  transform: scale(1.05);
}

.jewelry-hero__overlay {
  background: linear-gradient(
    to top,
    var(--hero-overlay-strong) 0%,
    var(--hero-overlay-soft) 52%,
    transparent 100%
  );
}

.jewelry-hero__content {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 1.75rem;
}

.jewelry-hero__title {
  margin: 0 0 0.625rem;
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 7vw, 4rem);
  font-weight: 300;
  line-height: 1.05;
  letter-spacing: 0;
  text-transform: uppercase;
}

.jewelry-hero__panel:not(.is-featured) .jewelry-hero__title {
  font-size: clamp(1.625rem, 5vw, 2.875rem);
}

.jewelry-hero__subtitle {
  margin: 0 0 0.875rem;
  color: var(--hero-muted-text);
  font-size: 0.75rem;
  line-height: 1.5;
  letter-spacing: 0.04em;
}

.jewelry-hero__link {
  display: inline-block;
  padding-bottom: 0.125rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  color: #ffffff;
  font-size: 0.625rem;
  line-height: 1;
  letter-spacing: 0.22em;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    color 180ms ease,
    border-color 180ms ease;
}

.jewelry-hero__link:hover,
.jewelry-hero__link:focus-visible {
  color: var(--hero-accent);
  border-color: var(--hero-accent);
}

.jewelry-hero__hint {
  position: absolute;
  right: 0;
  bottom: 1.25rem;
  left: 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 0.375rem;
  pointer-events: none;
}

.jewelry-hero__dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.4);
}

.jewelry-hero__dot.is-active {
  background: rgba(255, 255, 255, 0.8);
}

@media (min-width: 768px) {
  .jewelry-hero__track {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 50vh) minmax(0, 50vh);
    height: 100vh;
    overflow: visible;
  }

  .jewelry-hero__panel {
    min-width: 0;
    min-height: 0;
  }

  .jewelry-hero__panel.is-featured {
    grid-row: span 2;
  }

  .jewelry-hero__content {
    padding: 2rem;
  }

  .jewelry-hero__hint {
    display: none;
  }
}
`;

const layout = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ page_title | default: shop.name }}</title>
    {{ content_for_header }}
  </head>
  <body>
    {{ content_for_layout }}
  </body>
</html>
`;

const config = [
  {
    name: "theme_info",
    theme_name: "Jewelry Starter",
    theme_version: "0.1.0",
    theme_author: "Codex",
    theme_support_email: "support@example.com",
    theme_documentation_url: "https://example.com/figma-shopify-jewelry-starter"
  }
];

const locale = {};

await downloadHeroAssets();

await Promise.all([
  writeFile(sectionFile, liquid, "utf8"),
  writeFile(snippetFile, snippet, "utf8"),
  writeFile(templateFile, JSON.stringify(template, null, 2), "utf8"),
  writeFile(sectionCssFile, sectionCss, "utf8"),
  writeFile(themeCssFile, themeCss, "utf8"),
  writeFile(layoutFile, layout, "utf8"),
  writeFile(configFile, JSON.stringify(config, null, 2), "utf8"),
  writeFile(localeFile, JSON.stringify(locale, null, 2), "utf8")
]);

console.log(`Generated Shopify section: ${path.relative(rootDir, sectionFile)}`);
console.log(`Generated Shopify template: ${path.relative(rootDir, templateFile)}`);
