import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDesignContext, rootDir } from "./lib/design-context.mjs";

const firstArg = process.argv[2];
const secondArg = process.argv[3];
const looksLikePath = (value) =>
  Boolean(value) && (value.endsWith(".json") || value.includes("/") || value.includes("\\") || path.isAbsolute(value));
const designContext = getDesignContext(looksLikePath(firstArg) ? undefined : firstArg);
const specPath = looksLikePath(firstArg) ? path.resolve(rootDir, firstArg) : designContext.files.home;
const outputDir = secondArg ? path.resolve(rootDir, secondArg) : designContext.themeDir;

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

const assetNameFor = (sectionHandle, index) => `${sectionHandle}-${index + 1}.jpg`;

const templateBlockMap = (blocks, blockType, settingsFactory) =>
  Object.fromEntries(
    blocks.map((block, index) => [
      `block_${index + 1}`,
      {
        type: blockType,
        settings: settingsFactory(block)
      }
    ])
  );

const renderHeroSection = (section) => ({
  fileName: `${section.handle}.liquid`,
  liquid: `<section class="jewelry-hero" id="shopify-section-{{ section.id }}">
  <div class="jewelry-hero__track">
    {% for block in section.blocks %}
      {% assign panel_class = '' %}
      {% if block.settings.featured or forloop.first %}
        {% assign panel_class = ' is-featured' %}
      {% endif %}
      {% capture asset_name %}${section.handle}-{{ forloop.index }}.jpg{% endcapture %}
      {% render 'jewelry-hero-panel', block: block, panel_class: panel_class, asset_name: asset_name %}
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
      "default": ${section.settings.mobileHint ? "true" : "false"}
    }
  ],
  "max_blocks": 3,
  "blocks": [
    {
      "type": "panel",
      "name": "Panel",
      "settings": [
        { "type": "textarea", "id": "title", "label": "Title" },
        { "type": "text", "id": "subtitle", "label": "Subtitle" },
        { "type": "text", "id": "link_label", "label": "Link label" },
        { "type": "url", "id": "link_url", "label": "Link URL" },
        { "type": "image_picker", "id": "image", "label": "Image" },
        { "type": "text", "id": "image_alt", "label": "Image alt" },
        { "type": "checkbox", "id": "featured", "label": "Feature this panel on desktop", "default": false }
      ]
    }
  ],
  "presets": [
    {
      "name": "Jewelry home hero",
      "blocks": ${JSON.stringify(
        section.blocks.map((block) => ({
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
`,
  templateSettings: {
    show_mobile_hint: section.settings.mobileHint
  },
  templateBlocks: templateBlockMap(section.blocks, "panel", (block) => ({
    title: block.title,
    subtitle: block.subtitle,
    link_label: block.linkLabel,
    link_url: block.linkUrl,
    image_alt: block.imageAlt,
    featured: block.featured
  }))
});

const renderTrendingSection = (section) => ({
  fileName: `${section.handle}.liquid`,
  liquid: `<section class="jewelry-trending section-shell" id="shopify-section-{{ section.id }}">
  <div class="section-shell__inner section-shell__inner--narrow">
    <p class="section-eyebrow">{{ section.settings.eyebrow | escape }}</p>
    <h2 class="section-heading">
      {{ section.settings.heading | escape }}
      <em class="section-accent">{{ section.settings.accent_text | escape }}</em>
    </h2>
  </div>

  <div class="jewelry-trending__grid">
    {% for block in section.blocks %}
      {% capture asset_name %}${section.handle}-{{ forloop.index }}.jpg{% endcapture %}
      {% render 'jewelry-product-card', block: block, asset_name: asset_name %}
    {% endfor %}
  </div>

  {% if section.settings.cta_label != blank and section.settings.cta_url != blank %}
    <div class="section-shell__cta">
      <a class="button-outline" href="{{ section.settings.cta_url }}">{{ section.settings.cta_label | escape }}</a>
    </div>
  {% endif %}
</section>

{% schema %}
{
  "name": "Jewelry trending grid",
  "tag": "section",
  "class": "section section--jewelry-trending",
  "settings": [
    { "type": "text", "id": "eyebrow", "label": "Eyebrow" },
    { "type": "text", "id": "heading", "label": "Heading" },
    { "type": "text", "id": "accent_text", "label": "Accent text" },
    { "type": "text", "id": "cta_label", "label": "CTA label" },
    { "type": "url", "id": "cta_url", "label": "CTA URL" }
  ],
  "max_blocks": 4,
  "blocks": [
    {
      "type": "item",
      "name": "Product card",
      "settings": [
        { "type": "text", "id": "title", "label": "Title" },
        { "type": "text", "id": "price", "label": "Price" },
        { "type": "text", "id": "compare_price", "label": "Compare-at price" },
        { "type": "text", "id": "tag", "label": "Tag" },
        { "type": "url", "id": "link_url", "label": "Link URL" },
        { "type": "image_picker", "id": "image", "label": "Image" },
        { "type": "text", "id": "image_alt", "label": "Image alt" },
        { "type": "checkbox", "id": "sold_out", "label": "Sold out", "default": false }
      ]
    }
  ],
  "presets": [
    {
      "name": "Jewelry trending grid",
      "settings": {
        "eyebrow": ${JSON.stringify(section.settings.eyebrow)},
        "heading": ${JSON.stringify(section.settings.heading)},
        "accent_text": ${JSON.stringify(section.settings.accentText)},
        "cta_label": ${JSON.stringify(section.settings.ctaLabel)},
        "cta_url": ${JSON.stringify(section.settings.ctaUrl)}
      },
      "blocks": ${JSON.stringify(
        section.blocks.map((block) => ({
          type: "item",
          settings: {
            title: block.title,
            price: block.price,
            compare_price: block.comparePrice,
            tag: block.tag,
            link_url: block.linkUrl,
            image_alt: block.imageAlt,
            sold_out: block.soldOut
          }
        })),
        null,
        8
      )}
    }
  ]
}
{% endschema %}
`,
  templateSettings: {
    eyebrow: section.settings.eyebrow,
    heading: section.settings.heading,
    accent_text: section.settings.accentText,
    cta_label: section.settings.ctaLabel,
    cta_url: section.settings.ctaUrl
  },
  templateBlocks: templateBlockMap(section.blocks, "item", (block) => ({
    title: block.title,
    price: block.price,
    compare_price: block.comparePrice,
    tag: block.tag,
    link_url: block.linkUrl,
    image_alt: block.imageAlt,
    sold_out: block.soldOut
  }))
});

const renderPressSection = (section) => ({
  fileName: `${section.handle}.liquid`,
  liquid: `<section class="jewelry-press section-shell" id="shopify-section-{{ section.id }}">
  <div class="jewelry-press__logos">
    {% for block in section.blocks %}
      <span class="jewelry-press__logo jewelry-press__logo--{{ block.settings.style }}" {{ block.shopify_attributes }}>
        {{ block.settings.label | escape }}
      </span>
    {% endfor %}
  </div>

  <div class="jewelry-press__copy">
    <h3 class="jewelry-press__heading">{{ section.settings.heading | escape }}</h3>
    <p class="jewelry-press__body">{{ section.settings.body | escape }}</p>
  </div>
</section>

{% schema %}
{
  "name": "Jewelry press strip",
  "tag": "section",
  "class": "section section--jewelry-press",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading" },
    { "type": "textarea", "id": "body", "label": "Body" }
  ],
  "max_blocks": 6,
  "blocks": [
    {
      "type": "item",
      "name": "Logo line",
      "settings": [
        { "type": "text", "id": "label", "label": "Label" },
        {
          "type": "select",
          "id": "style",
          "label": "Style",
          "options": [
            { "value": "bazaar", "label": "Bazaar" },
            { "value": "elle", "label": "Elle" },
            { "value": "cosmo", "label": "Cosmopolitan" },
            { "value": "red", "label": "Red" }
          ]
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Jewelry press strip",
      "settings": {
        "heading": ${JSON.stringify(section.settings.heading)},
        "body": ${JSON.stringify(section.settings.body)}
      },
      "blocks": ${JSON.stringify(
        section.blocks.map((block) => ({
          type: "item",
          settings: {
            label: block.label,
            style: block.style
          }
        })),
        null,
        8
      )}
    }
  ]
}
{% endschema %}
`,
  templateSettings: {
    heading: section.settings.heading,
    body: section.settings.body
  },
  templateBlocks: templateBlockMap(section.blocks, "item", (block) => ({
    label: block.label,
    style: block.style
  }))
});

const renderProcessSection = (section) => ({
  fileName: `${section.handle}.liquid`,
  liquid: `<section class="jewelry-process section-shell" id="shopify-section-{{ section.id }}">
  <div class="section-shell__inner section-shell__inner--narrow">
    <p class="section-eyebrow">{{ section.settings.eyebrow | escape }}</p>
    <h2 class="section-heading section-heading--light">{{ section.settings.heading | escape }}</h2>
    <div class="section-rule"></div>
    <p class="section-intro section-intro--light">{{ section.settings.intro | escape }}</p>
  </div>

  <div class="jewelry-process__steps">
    {% for block in section.blocks %}
      <article class="jewelry-process__card" {{ block.shopify_attributes }}>
        <div class="jewelry-process__number">{{ block.settings.step_number | escape }}</div>
        <div class="jewelry-process__icon">
          {% case block.settings.icon %}
            {% when 'star' %}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.75l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 16.76l-5.1 2.69.97-5.68L3.75 9.75l5.7-.83L12 3.75z" fill="none" stroke="currentColor" stroke-width="1.2"></path></svg>
            {% when 'diamond' %}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8.25 12 20l6-11.75-3-4.25H9L6 8.25zM6 8.25h12" fill="none" stroke="currentColor" stroke-width="1.2"></path></svg>
            {% else %}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8.25h15v9h-15zm3-4.5h9v4.5h-9z" fill="none" stroke="currentColor" stroke-width="1.2"></path></svg>
          {% endcase %}
        </div>
        <h3 class="jewelry-process__title">{{ block.settings.title | escape }}</h3>
        <p class="jewelry-process__body">{{ block.settings.body | escape }}</p>
      </article>
    {% endfor %}
  </div>

  {% if section.settings.cta_label != blank and section.settings.cta_url != blank %}
    <div class="section-shell__cta">
      <a class="button-outline button-outline--accent" href="{{ section.settings.cta_url }}">{{ section.settings.cta_label | escape }}</a>
    </div>
  {% endif %}
</section>

{% schema %}
{
  "name": "Jewelry how it works",
  "tag": "section",
  "class": "section section--jewelry-process",
  "settings": [
    { "type": "text", "id": "eyebrow", "label": "Eyebrow" },
    { "type": "text", "id": "heading", "label": "Heading" },
    { "type": "textarea", "id": "intro", "label": "Intro" },
    { "type": "text", "id": "cta_label", "label": "CTA label" },
    { "type": "url", "id": "cta_url", "label": "CTA URL" }
  ],
  "max_blocks": 4,
  "blocks": [
    {
      "type": "item",
      "name": "Step",
      "settings": [
        { "type": "text", "id": "step_number", "label": "Step number" },
        {
          "type": "select",
          "id": "icon",
          "label": "Icon",
          "options": [
            { "value": "star", "label": "Star" },
            { "value": "diamond", "label": "Diamond" },
            { "value": "package", "label": "Package" }
          ]
        },
        { "type": "text", "id": "title", "label": "Title" },
        { "type": "textarea", "id": "body", "label": "Body" }
      ]
    }
  ],
  "presets": [
    {
      "name": "Jewelry how it works",
      "settings": {
        "eyebrow": ${JSON.stringify(section.settings.eyebrow)},
        "heading": ${JSON.stringify(section.settings.heading)},
        "intro": ${JSON.stringify(section.settings.intro)},
        "cta_label": ${JSON.stringify(section.settings.ctaLabel)},
        "cta_url": ${JSON.stringify(section.settings.ctaUrl)}
      },
      "blocks": ${JSON.stringify(
        section.blocks.map((block) => ({
          type: "item",
          settings: {
            step_number: block.stepNumber,
            icon: block.icon,
            title: block.title,
            body: block.body
          }
        })),
        null,
        8
      )}
    }
  ]
}
{% endschema %}
`,
  templateSettings: {
    eyebrow: section.settings.eyebrow,
    heading: section.settings.heading,
    intro: section.settings.intro,
    cta_label: section.settings.ctaLabel,
    cta_url: section.settings.ctaUrl
  },
  templateBlocks: templateBlockMap(section.blocks, "item", (block) => ({
    step_number: block.stepNumber,
    icon: block.icon,
    title: block.title,
    body: block.body
  }))
});

const renderCollectionSection = (section) => ({
  fileName: `${section.handle}.liquid`,
  liquid: `<section class="jewelry-collections section-shell" id="shopify-section-{{ section.id }}">
  <div class="section-shell__inner section-shell__inner--narrow">
    <p class="section-eyebrow">{{ section.settings.eyebrow | escape }}</p>
    <h2 class="section-heading">
      {{ section.settings.heading | escape }}
      <em class="section-accent">{{ section.settings.accent_text | escape }}</em>
    </h2>
    <div class="section-rule"></div>
  </div>

  <div class="jewelry-collections__grid">
    {% for block in section.blocks %}
      {% capture asset_name %}${section.handle}-{{ forloop.index }}.jpg{% endcapture %}
      {% render 'jewelry-collection-card', block: block, asset_name: asset_name %}
    {% endfor %}
  </div>
</section>

{% schema %}
{
  "name": "Jewelry collection grid",
  "tag": "section",
  "class": "section section--jewelry-collections",
  "settings": [
    { "type": "text", "id": "eyebrow", "label": "Eyebrow" },
    { "type": "text", "id": "heading", "label": "Heading" },
    { "type": "text", "id": "accent_text", "label": "Accent text" }
  ],
  "max_blocks": 6,
  "blocks": [
    {
      "type": "item",
      "name": "Collection card",
      "settings": [
        { "type": "text", "id": "title", "label": "Title" },
        { "type": "text", "id": "link_label", "label": "Link label" },
        { "type": "url", "id": "link_url", "label": "Link URL" },
        { "type": "image_picker", "id": "image", "label": "Image" },
        { "type": "text", "id": "image_alt", "label": "Image alt" }
      ]
    }
  ],
  "presets": [
    {
      "name": "Jewelry collection grid",
      "settings": {
        "eyebrow": ${JSON.stringify(section.settings.eyebrow)},
        "heading": ${JSON.stringify(section.settings.heading)},
        "accent_text": ${JSON.stringify(section.settings.accentText)}
      },
      "blocks": ${JSON.stringify(
        section.blocks.map((block) => ({
          type: "item",
          settings: {
            title: block.title,
            link_label: block.linkLabel,
            link_url: block.linkUrl,
            image_alt: block.imageAlt
          }
        })),
        null,
        8
      )}
    }
  ]
}
{% endschema %}
`,
  templateSettings: {
    eyebrow: section.settings.eyebrow,
    heading: section.settings.heading,
    accent_text: section.settings.accentText
  },
  templateBlocks: templateBlockMap(section.blocks, "item", (block) => ({
    title: block.title,
    link_label: block.linkLabel,
    link_url: block.linkUrl,
    image_alt: block.imageAlt
  }))
});

const sectionRenderers = {
  hero_stack: renderHeroSection,
  trending_grid: renderTrendingSection,
  press_strip: renderPressSection,
  process_steps: renderProcessSection,
  collection_grid: renderCollectionSection
};

const snippets = {
  "jewelry-hero-panel.liquid": `{% doc %}
  Render a single image panel inside the jewelry hero section.
  @param {object} block - The Shopify block object for the panel.
  @param {string} [panel_class] - Additional modifier classes.
  @param {string} [asset_name] - Local theme asset used as the default image.
{% enddoc %}
<article class="jewelry-hero__panel{{ panel_class }}" {{ block.shopify_attributes }}>
  <div class="jewelry-hero__media">
    {% if block.settings.image != blank %}
      {% assign alt_text = block.settings.image.alt | default: block.settings.image_alt %}
      {{ block.settings.image | image_url: width: 1600 | image_tag: loading: 'lazy', class: 'jewelry-hero__image', alt: alt_text }}
    {% elsif asset_name != blank %}
      <img class="jewelry-hero__image" src="{{ asset_name | asset_url }}" alt="{{ block.settings.image_alt | escape }}" width="1080" height="1350" loading="lazy">
    {% endif %}
    <div class="jewelry-hero__overlay"></div>
  </div>
  <div class="jewelry-hero__content">
    <h2 class="jewelry-hero__title">{{ block.settings.title | escape | newline_to_br }}</h2>
    {% if block.settings.subtitle != blank %}<p class="jewelry-hero__subtitle">{{ block.settings.subtitle | escape }}</p>{% endif %}
    {% if block.settings.link_label != blank and block.settings.link_url != blank %}<a class="jewelry-hero__link" href="{{ block.settings.link_url }}">{{ block.settings.link_label | escape }}</a>{% endif %}
  </div>
</article>
`,
  "jewelry-product-card.liquid": `{% doc %}
  Render a product-style promotional card for the trending grid.
  @param {object} block - The Shopify block object for the card.
  @param {string} [asset_name] - Local theme asset used as the default image.
{% enddoc %}
<a class="jewelry-product-card" href="{{ block.settings.link_url | default: '#' }}" {{ block.shopify_attributes }}>
  <div class="jewelry-product-card__media">
    {% if block.settings.image != blank %}
      {% assign alt_text = block.settings.image.alt | default: block.settings.image_alt %}
      {{ block.settings.image | image_url: width: 1200 | image_tag: loading: 'lazy', class: 'jewelry-product-card__image', alt: alt_text }}
    {% elsif asset_name != blank %}
      <img class="jewelry-product-card__image" src="{{ asset_name | asset_url }}" alt="{{ block.settings.image_alt | escape }}" width="1080" height="1080" loading="lazy">
    {% endif %}
    {% if block.settings.tag != blank %}<span class="jewelry-product-card__badge{% if block.settings.sold_out %} is-muted{% endif %}">{{ block.settings.tag | escape }}</span>{% endif %}
  </div>
  <div class="jewelry-product-card__content">
    <h3 class="jewelry-product-card__title">{{ block.settings.title | escape }}</h3>
    <p class="jewelry-product-card__price">{% if block.settings.compare_price != blank %}<s>{{ block.settings.compare_price | escape }}</s>{% endif %}<span>{{ block.settings.price | escape }}</span></p>
    <span class="jewelry-product-card__cta">Add to Cart</span>
  </div>
</a>
`,
  "jewelry-collection-card.liquid": `{% doc %}
  Render a collection-style image card.
  @param {object} block - The Shopify block object for the card.
  @param {string} [asset_name] - Local theme asset used as the default image.
{% enddoc %}
<a class="jewelry-collection-card" href="{{ block.settings.link_url | default: '#' }}" {{ block.shopify_attributes }}>
  {% if block.settings.image != blank %}
    {% assign alt_text = block.settings.image.alt | default: block.settings.image_alt %}
    {{ block.settings.image | image_url: width: 1400 | image_tag: loading: 'lazy', class: 'jewelry-collection-card__image', alt: alt_text }}
  {% elsif asset_name != blank %}
    <img class="jewelry-collection-card__image" src="{{ asset_name | asset_url }}" alt="{{ block.settings.image_alt | escape }}" width="1080" height="1440" loading="lazy">
  {% endif %}
  <div class="jewelry-collection-card__overlay"></div>
  <div class="jewelry-collection-card__content">
    <h3 class="jewelry-collection-card__title">{{ block.settings.title | escape }}</h3>
    <span class="jewelry-collection-card__cta">{{ block.settings.link_label | default: 'Shop now' | escape }}</span>
  </div>
</a>
`
};

const commerceSections = {
  "main-product.liquid": `<section class="commerce-shell main-product" id="shopify-section-{{ section.id }}">
  <div class="commerce-shell__inner main-product__grid">
    <div class="main-product__media">
      {% if product.featured_media %}
        {{ product.featured_media | image_url: width: 1600 | image_tag: loading: 'eager', class: 'main-product__image', alt: product.featured_media.alt | default: product.title }}
      {% else %}
        {{ 'product-1' | placeholder_svg_tag: 'main-product__image main-product__image--placeholder' }}
      {% endif %}
    </div>

    <div class="main-product__content">
      {% if section.settings.show_vendor and product.vendor != blank %}
        <p class="commerce-kicker">{{ product.vendor | escape }}</p>
      {% endif %}

      <h1 class="commerce-heading commerce-heading--product">{{ product.title | escape }}</h1>

      <div class="main-product__price">
        {% if product.compare_at_price_max > product.price %}
          <s>{{ product.compare_at_price_max | money }}</s>
        {% endif %}
        <span>{{ product.price | money }}</span>
      </div>

      {% if section.settings.show_description and product.description != blank %}
        <div class="commerce-copy rte">{{ product.description }}</div>
      {% endif %}

      {% form 'product', product, class: 'main-product__form' %}
        {% if product.has_only_default_variant == false %}
          <label class="main-product__label" for="variant-select-{{ section.id }}">Choose option</label>
          <select id="variant-select-{{ section.id }}" name="id" class="main-product__select">
            {% for variant in product.variants %}
              <option value="{{ variant.id }}" {% if variant == product.selected_or_first_available_variant %}selected{% endif %} {% unless variant.available %}disabled{% endunless %}>
                {{ variant.title | escape }}{% unless variant.available %} - Sold out{% endunless %}
              </option>
            {% endfor %}
          </select>
        {% else %}
          <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
        {% endif %}

        <button class="button-outline main-product__button" type="submit" {% unless product.available %}disabled{% endunless %}>
          {% if product.available %}Add to cart{% else %}Sold out{% endif %}
        </button>
      {% endform %}
    </div>
  </div>
</section>

{% stylesheet %}
  .commerce-shell {
    padding: 4rem 0;
    background: var(--surface);
  }

  .commerce-shell__inner {
    max-width: 88rem;
    margin: 0 auto;
    padding: 0 1.25rem;
  }

  .commerce-kicker {
    margin: 0 0 1rem;
    color: var(--accent);
    font-size: 0.625rem;
    letter-spacing: 0.35em;
    text-transform: uppercase;
  }

  .commerce-heading {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3.25rem);
    font-weight: 300;
    line-height: 1.05;
  }

  .commerce-heading--product {
    max-width: 20rem;
  }

  .commerce-copy {
    color: var(--muted-dark);
    font-size: 0.95rem;
    line-height: 1.8;
  }

  .main-product__grid {
    display: grid;
    gap: 2rem;
  }

  .main-product__media {
    background: #f6f2ec;
  }

  .main-product__image {
    width: 100%;
    height: auto;
    object-fit: cover;
  }

  .main-product__image--placeholder {
    width: 100%;
    min-height: 26rem;
    color: #d8d0c5;
  }

  .main-product__content {
    align-self: center;
  }

  .main-product__price {
    display: flex;
    gap: 0.75rem;
    align-items: baseline;
    margin: 1.25rem 0;
    font-family: var(--font-display);
    font-size: 1.5rem;
  }

  .main-product__price s {
    color: #b9b2aa;
    font-size: 1rem;
  }

  .main-product__form {
    margin-top: 1.75rem;
  }

  .main-product__label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .main-product__select {
    width: 100%;
    max-width: 22rem;
    margin-bottom: 1rem;
    padding: 0.9rem 1rem;
    border: 1px solid var(--border);
    background: #ffffff;
    font: inherit;
  }

  .main-product__button[disabled] {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (min-width: 960px) {
    .commerce-shell {
      padding: 6rem 0;
    }

    .commerce-shell__inner {
      padding: 0 3.5rem;
    }

    .main-product__grid {
      grid-template-columns: minmax(0, 1.1fr) minmax(20rem, 0.9fr);
      gap: 4rem;
    }
  }
{% endstylesheet %}

{% schema %}
{
  "name": "Main product",
  "settings": [
    { "type": "checkbox", "id": "show_vendor", "label": "Show vendor", "default": true },
    { "type": "checkbox", "id": "show_description", "label": "Show description", "default": true }
  ]
}
{% endschema %}
`,
  "main-collection.liquid": `<section class="commerce-shell main-collection" id="shopify-section-{{ section.id }}">
  <div class="commerce-shell__inner">
    <p class="commerce-kicker">Collection</p>
    <h1 class="commerce-heading">{{ collection.title | escape }}</h1>
    {% if collection.description != blank %}
      <div class="commerce-copy main-collection__copy rte">{{ collection.description }}</div>
    {% endif %}

    {% paginate collection.products by section.settings.products_per_page %}
      <div class="main-collection__grid">
        {% for product in collection.products %}
          <a class="main-collection__card" href="{{ product.url }}">
            <div class="main-collection__media">
              {% if product.featured_media %}
                {{ product.featured_media | image_url: width: 1200 | image_tag: loading: 'lazy', class: 'main-collection__image', alt: product.featured_media.alt | default: product.title }}
              {% else %}
                {{ 'product-1' | placeholder_svg_tag: 'main-collection__image main-collection__image--placeholder' }}
              {% endif %}
            </div>
            <div class="main-collection__content">
              <h2 class="main-collection__title">{{ product.title | escape }}</h2>
              <p class="main-collection__price">{{ product.price | money }}</p>
            </div>
          </a>
        {% endfor %}
      </div>

      {% if paginate.pages > 1 %}
        <nav class="main-collection__pagination" aria-label="Pagination">
          {% if paginate.previous %}
            <a class="button-outline" href="{{ paginate.previous.url }}">Previous</a>
          {% endif %}
          {% if paginate.next %}
            <a class="button-outline" href="{{ paginate.next.url }}">Next</a>
          {% endif %}
        </nav>
      {% endif %}
    {% endpaginate %}
  </div>
</section>

{% stylesheet %}
  .main-collection__copy {
    max-width: 38rem;
    margin: 1rem 0 0;
  }

  .main-collection__grid {
    display: grid;
    gap: 1rem;
    margin-top: 2.5rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-collection__card {
    display: block;
    background: #ffffff;
    text-decoration: none;
    border: 1px solid var(--border);
  }

  .main-collection__media {
    aspect-ratio: 1 / 1.2;
    background: #f6f2ec;
  }

  .main-collection__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .main-collection__image--placeholder {
    width: 100%;
    height: 100%;
    color: #d8d0c5;
  }

  .main-collection__content {
    padding: 1rem;
  }

  .main-collection__title {
    margin: 0 0 0.4rem;
    font-size: 0.9rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .main-collection__price {
    margin: 0;
    color: var(--muted-dark);
    font-family: var(--font-display);
    font-size: 1.1rem;
  }

  .main-collection__pagination {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
  }

  @media (min-width: 960px) {
    .main-collection__grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
{% endstylesheet %}

{% schema %}
{
  "name": "Main collection",
  "settings": [
    {
      "type": "range",
      "id": "products_per_page",
      "label": "Products per page",
      "min": 4,
      "max": 24,
      "step": 4,
      "default": 12
    }
  ]
}
{% endschema %}
`,
  "main-page.liquid": `<section class="commerce-shell main-page" id="shopify-section-{{ section.id }}">
  <div class="commerce-shell__inner main-page__inner">
    <p class="commerce-kicker">Page</p>
    <h1 class="commerce-heading">{{ page.title | escape }}</h1>
    <div class="commerce-copy main-page__content rte">{{ page.content }}</div>
  </div>
</section>

{% stylesheet %}
  .main-page__inner {
    max-width: 52rem;
  }

  .main-page__content {
    margin-top: 1.5rem;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "Main page",
  "settings": []
}
{% endschema %}
`
};

const commerceTemplates = {
  "product.json": {
    sections: {
      main: {
        type: "main-product",
        settings: {
          show_vendor: true,
          show_description: true
        }
      }
    },
    order: ["main"]
  },
  "collection.json": {
    sections: {
      main: {
        type: "main-collection",
        settings: {
          products_per_page: 12
        }
      }
    },
    order: ["main"]
  },
  "page.json": {
    sections: {
      main: {
        type: "main-page",
        settings: {}
      }
    },
    order: ["main"]
  }
};

const routeTemplates = {
  "product.vue-chain-necklace.json": commerceTemplates["product.json"],
  "product.dusk-box.json": commerceTemplates["product.json"],
  "collection.editorial.json": commerceTemplates["collection.json"],
  "page.membership.json": commerceTemplates["page.json"]
};

const themeCss = `@import url('${spec.theme.fontImport}');

:root {
  --page-background: ${spec.theme.background};
  --surface: ${spec.theme.surface};
  --page-text: ${spec.theme.text};
  --muted-dark: ${spec.theme.mutedDark};
  --hero-muted-text: ${spec.theme.mutedText};
  --hero-overlay-strong: ${spec.theme.overlayStrong};
  --hero-overlay-soft: ${spec.theme.overlaySoft};
  --accent: ${spec.theme.accent};
  --dark: ${spec.theme.dark};
  --border: ${spec.theme.border};
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

a {
  color: inherit;
}

.section-shell {
  padding: 4rem 0;
}

.section-shell__inner {
  max-width: 88rem;
  margin: 0 auto;
  padding: 0 1.25rem;
}

.section-shell__inner--narrow {
  text-align: center;
}

.section-shell__cta {
  margin-top: 3rem;
  text-align: center;
}

.section-eyebrow {
  margin: 0 0 0.75rem;
  color: var(--accent);
  font-size: 0.625rem;
  letter-spacing: 0.4em;
  text-transform: uppercase;
}

.section-heading {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3.25rem);
  font-weight: 300;
  line-height: 1.05;
}

.section-heading--light {
  color: #ffffff;
}

.section-accent {
  color: var(--accent);
  font-style: italic;
}

.section-rule {
  width: 2.25rem;
  height: 1px;
  margin: 1rem auto 0;
  background: var(--accent);
}

.section-intro {
  max-width: 26rem;
  margin: 1rem auto 0;
  color: var(--muted-dark);
  font-size: 0.8125rem;
  line-height: 1.75;
}

.section-intro--light {
  color: rgba(255, 255, 255, 0.4);
}

.button-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 2.5rem;
  border: 1px solid var(--dark);
  color: var(--dark);
  font-size: 0.625rem;
  letter-spacing: 0.26em;
  text-decoration: none;
  text-transform: uppercase;
  transition: background-color 180ms ease, color 180ms ease;
}

.button-outline:hover,
.button-outline:focus-visible {
  background: var(--dark);
  color: #ffffff;
}

.button-outline--accent {
  border-color: rgba(201, 169, 110, 0.4);
  color: var(--accent);
}

.button-outline--accent:hover,
.button-outline--accent:focus-visible {
  background: var(--accent);
  color: var(--dark);
}

@media (min-width: 768px) {
  .section-shell {
    padding: 6rem 0;
  }

  .section-shell__inner {
    padding: 0 3.5rem;
  }
}
`;

const homeSectionsCss = `.jewelry-hero{position:relative}.jewelry-hero__track{display:flex;height:85vh;min-height:36rem;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.jewelry-hero__track::-webkit-scrollbar,.jewelry-process__steps::-webkit-scrollbar{display:none}.jewelry-hero__panel{position:relative;min-width:100%;overflow:hidden;display:flex;align-items:flex-end;scroll-snap-align:center;color:#fff}.jewelry-hero__media,.jewelry-hero__overlay,.jewelry-collection-card__image,.jewelry-collection-card__overlay{position:absolute;inset:0}.jewelry-hero__image,.jewelry-collection-card__image{width:100%;height:100%;object-fit:cover;transition:transform 700ms ease}.jewelry-hero__panel:hover .jewelry-hero__image,.jewelry-collection-card:hover .jewelry-collection-card__image{transform:scale(1.05)}.jewelry-hero__overlay{background:linear-gradient(to top,var(--hero-overlay-strong) 0%,var(--hero-overlay-soft) 52%,transparent 100%)}.jewelry-hero__content{position:relative;z-index:1;width:100%;padding:1.75rem}.jewelry-hero__title{margin:0 0 .625rem;font-family:var(--font-display);font-size:clamp(1.75rem,7vw,4rem);font-weight:300;line-height:1.05;text-transform:uppercase}.jewelry-hero__panel:not(.is-featured) .jewelry-hero__title{font-size:clamp(1.625rem,5vw,2.875rem)}.jewelry-hero__subtitle{margin:0 0 .875rem;color:var(--hero-muted-text);font-size:.75rem;line-height:1.5;letter-spacing:.04em}.jewelry-hero__link,.jewelry-product-card__cta,.jewelry-collection-card__cta{display:inline-block;padding-bottom:.125rem;border-bottom:1px solid currentColor;font-size:.625rem;line-height:1;letter-spacing:.22em;text-decoration:none;text-transform:uppercase}.jewelry-hero__link{color:#fff;border-color:rgba(255,255,255,.5)}.jewelry-hero__link:hover,.jewelry-hero__link:focus-visible{color:var(--accent);border-color:var(--accent)}.jewelry-hero__hint{position:absolute;right:0;bottom:1.25rem;left:0;z-index:2;display:flex;justify-content:center;gap:.375rem;pointer-events:none}.jewelry-hero__dot{width:.375rem;height:.375rem;border-radius:999px;background:rgba(255,255,255,.4)}.jewelry-hero__dot.is-active{background:rgba(255,255,255,.8)}.jewelry-trending,.jewelry-collections,.jewelry-press{background:var(--surface)}.jewelry-trending__grid,.jewelry-collections__grid{display:grid;gap:1px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--border);grid-template-columns:repeat(2,minmax(0,1fr))}.jewelry-product-card{display:flex;min-height:100%;flex-direction:column;background:var(--surface);text-decoration:none;transition:background-color 180ms ease}.jewelry-product-card:hover{background:#fafafa}.jewelry-product-card__media{position:relative;display:flex;aspect-ratio:1/1;align-items:center;justify-content:center;overflow:hidden;padding:2rem}.jewelry-product-card__image{width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;transition:transform 700ms ease}.jewelry-product-card:hover .jewelry-product-card__image{transform:scale(1.08)}.jewelry-product-card__badge{position:absolute;top:1rem;left:1rem;padding:.35rem .55rem;background:#f6f4f1;font-size:.5rem;letter-spacing:.15em;text-transform:uppercase}.jewelry-product-card__badge.is-muted{color:#9d9d9d}.jewelry-product-card__content{display:flex;flex:1;flex-direction:column;align-items:center;padding:1.25rem 1rem 1.5rem;text-align:center}.jewelry-product-card__title{margin:0 0 .5rem;font-size:.6875rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase}.jewelry-product-card__price{margin:0 0 1rem;font-family:var(--font-display);font-size:1rem;color:var(--muted-dark)}.jewelry-product-card__price s{margin-right:.5rem;color:#c9c3bc;font-size:.875rem}.jewelry-product-card__price span{color:var(--page-text)}.jewelry-product-card__cta{margin-top:auto;color:var(--page-text);opacity:.8}.jewelry-press{border-top:1px solid #f1efec;border-bottom:1px solid #f1efec}.jewelry-press__logos{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:1.75rem 2.5rem;margin:0 auto 3rem;padding:0 1.25rem}.jewelry-press__logo{color:rgba(26,26,26,.75)}.jewelry-press__logo--bazaar{font-size:clamp(1.125rem,2.5vw,1.75rem);font-style:italic;font-weight:700;letter-spacing:.05em}.jewelry-press__logo--elle{font-size:clamp(1.5rem,3.5vw,2.625rem);font-weight:700}.jewelry-press__logo--cosmo{font-size:clamp(.8125rem,1.8vw,1.125rem);font-weight:800;letter-spacing:.08em}.jewelry-press__logo--red{font-family:var(--font-display);font-size:clamp(1.375rem,3vw,2.25rem);font-style:italic}.jewelry-press__copy{max-width:42.5rem;margin:0 auto;padding:0 1.25rem;text-align:center}.jewelry-press__heading{margin:0 0 1rem;font-family:var(--font-display);font-size:clamp(1.375rem,3vw,2.125rem);font-weight:300;line-height:1.2;letter-spacing:.1em;text-transform:uppercase}.jewelry-press__body{max-width:32.5rem;margin:0 auto;color:#7d7b77;font-size:.8125rem;line-height:1.8}.jewelry-process{background:var(--dark)}.jewelry-process__steps{display:flex;gap:2px;max-width:68.75rem;margin:2rem auto 0;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 1.25rem 1rem;scrollbar-width:none}.jewelry-process__card{position:relative;min-width:min(80vw,18rem);padding:2.5rem;background:#111;color:#fff;text-align:center;scroll-snap-align:center}.jewelry-process__number{position:absolute;top:1rem;right:0;left:0;color:rgba(201,169,110,.2);font-family:var(--font-display);font-size:clamp(3.75rem,8vw,5rem);font-weight:300;line-height:1}.jewelry-process__icon{position:relative;z-index:1;display:flex;justify-content:center;margin-bottom:1.5rem;color:var(--accent)}.jewelry-process__icon svg{width:1.75rem;height:1.75rem}.jewelry-process__title{position:relative;z-index:1;margin:0 0 .875rem;font-family:var(--font-display);font-size:1.5rem;font-weight:300}.jewelry-process__body{position:relative;z-index:1;margin:0;color:rgba(255,255,255,.45);font-size:.75rem;line-height:1.85}.jewelry-collection-card{position:relative;display:block;overflow:hidden;aspect-ratio:3/4;text-decoration:none}.jewelry-collection-card__overlay{background:linear-gradient(to top,rgba(0,0,0,.7) 0%,rgba(0,0,0,.1) 48%,transparent 100%)}.jewelry-collection-card__content{position:absolute;right:0;bottom:0;left:0;z-index:1;padding:1.25rem;color:#fff}.jewelry-collection-card__title{margin:0 0 .75rem;font-family:var(--font-display);font-size:clamp(1.375rem,3vw,1.75rem);font-weight:300;line-height:1}.jewelry-collection-card__cta{color:rgba(255,255,255,.8)}@media (min-width:768px){.jewelry-hero__track{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,50vh) minmax(0,50vh);height:100vh;overflow:visible}.jewelry-hero__panel{min-width:0;min-height:0}.jewelry-hero__panel.is-featured{grid-row:span 2}.jewelry-hero__content{padding:2rem}.jewelry-hero__hint{display:none}.jewelry-trending__grid,.jewelry-collections__grid{grid-template-columns:repeat(4,minmax(0,1fr))}.jewelry-product-card__media{padding:3rem}.jewelry-product-card__cta{opacity:0;transform:translateY(.5rem);transition:opacity 220ms ease,transform 220ms ease}.jewelry-product-card:hover .jewelry-product-card__cta{opacity:1;transform:translateY(0)}.jewelry-process__steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:visible;padding:0}.jewelry-process__card{min-width:0;padding:3rem}.jewelry-collection-card__content{padding:2rem}}`;

const layout = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ page_title | default: shop.name }}</title>
    {{ 'theme.css' | asset_url | stylesheet_tag }}
    {{ 'home-sections.css' | asset_url | stylesheet_tag }}
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
    theme_version: "0.2.0",
    theme_author: "Codex",
    theme_support_email: "support@example.com",
    theme_documentation_url: "https://example.com/figma-shopify-jewelry-starter"
  }
];

const locale = {};

const downloadAssets = async () => {
  const downloads = [];

  for (const section of spec.sections) {
    for (const [index, block] of (section.blocks || []).entries()) {
      if (!block.imageUrl) continue;
      downloads.push(
        (async () => {
          const response = await fetch(block.imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to download ${section.handle} image ${index + 1}: ${response.status}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          await writeFile(path.join(outputDir, "assets", assetNameFor(section.handle, index)), buffer);
        })()
      );
    }
  }

  await Promise.all(downloads);
};

const templateSections = {};
const templateOrder = [];
const sectionFiles = [];

for (const [index, section] of spec.sections.entries()) {
  const renderer = sectionRenderers[section.type];
  if (!renderer) throw new Error(`Unsupported section type: ${section.type}`);

  const rendered = renderer(section);
  const instanceId = `section_${index + 1}`;

  sectionFiles.push({
    filePath: path.join(outputDir, "sections", rendered.fileName),
    content: rendered.liquid
  });

  templateSections[instanceId] = {
    type: section.handle,
    settings: rendered.templateSettings
  };

  if (rendered.templateBlocks && Object.keys(rendered.templateBlocks).length > 0) {
    templateSections[instanceId].blocks = rendered.templateBlocks;
    templateSections[instanceId].block_order = Object.keys(rendered.templateBlocks);
  }

  templateOrder.push(instanceId);
}

await downloadAssets();

await Promise.all([
  ...sectionFiles.map((file) => writeFile(file.filePath, file.content, "utf8")),
  ...Object.entries(commerceSections).map(([name, content]) => writeFile(path.join(outputDir, "sections", name), content, "utf8")),
  ...Object.entries(snippets).map(([name, content]) => writeFile(path.join(outputDir, "snippets", name), content, "utf8")),
  writeFile(path.join(outputDir, "templates", "index.json"), JSON.stringify({ sections: templateSections, order: templateOrder }, null, 2), "utf8"),
  ...Object.entries(commerceTemplates).map(([name, content]) =>
    writeFile(path.join(outputDir, "templates", name), JSON.stringify(content, null, 2), "utf8")
  ),
  ...Object.entries(routeTemplates).map(([name, content]) =>
    writeFile(path.join(outputDir, "templates", name), JSON.stringify(content, null, 2), "utf8")
  ),
  writeFile(path.join(outputDir, "assets", "theme.css"), themeCss, "utf8"),
  writeFile(path.join(outputDir, "assets", "home-sections.css"), homeSectionsCss, "utf8"),
  writeFile(path.join(outputDir, "layout", "theme.liquid"), layout, "utf8"),
  writeFile(path.join(outputDir, "config", "settings_schema.json"), JSON.stringify(config, null, 2), "utf8"),
  writeFile(path.join(outputDir, "locales", "en.default.json"), JSON.stringify(locale, null, 2), "utf8")
]);

console.log(`Generated ${sectionFiles.length} Shopify sections in ${path.relative(rootDir, outputDir)}`);
