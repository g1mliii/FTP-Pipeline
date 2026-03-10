import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDesignContext } from "./lib/design-context.mjs";

const designContext = getDesignContext(process.argv[2]);
const previewDir = designContext.previewDir;
const assetsDir = path.join(designContext.themeDir, "assets");

const homeSpec = JSON.parse(await readFile(designContext.files.home, "utf8"));
const siteShell = JSON.parse(await readFile(designContext.files.shell, "utf8"));
const collectionRoute = JSON.parse(await readFile(designContext.files.routeCollection, "utf8"));
const membershipRoute = JSON.parse(await readFile(designContext.files.routeMembership, "utf8"));
const productRoute = JSON.parse(await readFile(designContext.files.routeProduct, "utf8"));
const duskRoute = JSON.parse(await readFile(designContext.files.routeDuskBox, "utf8"));
const previewFilePath = (routePath) =>
  routePath === "/"
    ? path.join(previewDir, "index.html")
    : path.join(previewDir, ...routePath.split("/").filter(Boolean), "index.html");

const cssFiles = (await readdir(assetsDir)).filter((file) => file.endsWith(".css"));
const css = (await Promise.all(cssFiles.map((file) => readFile(path.join(assetsDir, file), "utf8")))).join("\n");

const pageWrapper = (title, content) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>${css}</style>
  </head>
  <body>${content}</body>
</html>`;

const renderHeader = () => `<section class="site-header-shell">
  <div class="site-header-shell__announcement">${siteShell.announcement}</div>
  <div class="site-header-shell__nav">
    <div class="site-header-shell__menu site-header-shell__menu--left">${siteShell.navigation
      .slice(0, 3)
      .map((link) => `<a class="site-header-shell__link" href="${link.url}">${link.label}</a>`)
      .join("")}</div>
    <a class="site-header-shell__brand" href="/">${siteShell.brand}</a>
    <div class="site-header-shell__menu site-header-shell__menu--right">${siteShell.navigation
      .slice(3)
      .map((link) => `<a class="site-header-shell__link" href="${link.url}">${link.label}</a>`)
      .join("")}</div>
  </div>
</section>`;

const renderFooter = () => `<section class="site-footer-shell">
  <div class="site-footer-shell__inner">
    <div class="site-footer-shell__brand">
      <a class="site-footer-shell__brand-link" href="/">${siteShell.brand}</a>
      <p class="site-footer-shell__body">${siteShell.footer.description}</p>
    </div>
    <div class="site-footer-shell__grid">${siteShell.footer.groups
      .map(
        (group) => `<div class="site-footer__group"><h4 class="site-footer__heading">${group.title}</h4><div class="site-footer__links">${group.links
          .map((link) => `<a class="site-footer__link" href="${link.url}">${link.label}</a>`)
          .join("")}</div></div>`
      )
      .join("")}</div>
  </div>
</section>`;

const renderHome = () => {
  const hero = homeSpec.sections[0];
  const trending = homeSpec.sections[1];
  const process = homeSpec.sections[3];
  const collections = homeSpec.sections[4];
  return `${renderHeader()}
  <section class="jewelry-hero">
    <div class="jewelry-hero__track">${hero.blocks
      .map(
        (block) => `<article class="jewelry-hero__panel${block.featured ? " is-featured" : ""}"><div class="jewelry-hero__media"><img class="jewelry-hero__image" src="${block.imageUrl}" alt="${block.imageAlt}"><div class="jewelry-hero__overlay"></div></div><div class="jewelry-hero__content"><h2 class="jewelry-hero__title">${block.title.replace(/\n/g, "<br>")}</h2>${block.subtitle ? `<p class="jewelry-hero__subtitle">${block.subtitle}</p>` : ""}<a class="jewelry-hero__link" href="${block.linkUrl}">${block.linkLabel}</a></div></article>`
      )
      .join("")}</div>
  </section>
  <section class="jewelry-trending section-shell"><div class="section-shell__inner section-shell__inner--narrow"><p class="section-eyebrow">${trending.settings.eyebrow}</p><h2 class="section-heading">${trending.settings.heading} <em class="section-accent">${trending.settings.accentText}</em></h2></div><div class="jewelry-trending__grid">${trending.blocks
    .map(
      (block) => `<a class="jewelry-product-card" href="${block.linkUrl}"><div class="jewelry-product-card__media"><img class="jewelry-product-card__image" src="${block.imageUrl}" alt="${block.imageAlt}"><span class="jewelry-product-card__badge">${block.tag}</span></div><div class="jewelry-product-card__content"><h3 class="jewelry-product-card__title">${block.title}</h3><p class="jewelry-product-card__price">${block.price}</p><span class="jewelry-product-card__cta">View</span></div></a>`
    )
    .join("")}</div></section>
  <section class="jewelry-process section-shell"><div class="section-shell__inner section-shell__inner--narrow"><p class="section-eyebrow">${process.settings.eyebrow}</p><h2 class="section-heading section-heading--light">${process.settings.heading}</h2><p class="section-intro section-intro--light">${process.settings.intro}</p></div><div class="jewelry-process__steps">${process.blocks
    .map((block) => `<article class="jewelry-process__card"><div class="jewelry-process__number">${block.stepNumber}</div><h3 class="jewelry-process__title">${block.title}</h3><p class="jewelry-process__body">${block.body}</p></article>`)
    .join("")}</div><div class="section-shell__cta"><a class="button-outline button-outline--accent" href="${process.settings.ctaUrl}">${process.settings.ctaLabel}</a></div></section>
  <section class="jewelry-collections section-shell"><div class="section-shell__inner section-shell__inner--narrow"><p class="section-eyebrow">${collections.settings.eyebrow}</p><h2 class="section-heading">${collections.settings.heading} <em class="section-accent">${collections.settings.accentText}</em></h2></div><div class="jewelry-collections__grid">${collections.blocks
    .map(
      (block) => `<a class="jewelry-collection-card" href="${block.linkUrl}"><img class="jewelry-collection-card__image" src="${block.imageUrl}" alt="${block.imageAlt}"><div class="jewelry-collection-card__overlay"></div><div class="jewelry-collection-card__content"><h3 class="jewelry-collection-card__title">${block.title}</h3><span class="jewelry-collection-card__cta">${block.linkLabel}</span></div></a>`
    )
    .join("")}</div></section>
  ${renderFooter()}`;
};

const renderCollection = () => `${renderHeader()}<section class="editorial-collection"><div class="editorial-collection__hero"><p class="section-eyebrow">${collectionRoute.eyebrow}</p><h1 class="section-heading">${collectionRoute.heading}</h1><p class="editorial-collection__intro">${collectionRoute.intro}</p></div><div class="editorial-collection__filters">${collectionRoute.filters.map((label) => `<span class="editorial-collection__filter">${label}</span>`).join("")}</div><div class="editorial-collection__grid">${collectionRoute.products.map((product) => `<a class="editorial-collection__card" href="${product.linkUrl}"><img class="editorial-collection__image" src="${product.imageUrl}" alt="${product.imageAlt}">${product.tag ? `<span class="editorial-collection__badge">${product.tag}</span>` : ""}<div class="editorial-collection__card-copy"><h3 class="editorial-collection__title">${product.title}</h3><p class="editorial-collection__price">${product.price}</p></div></a>`).join("")}<div class="editorial-collection__card editorial-collection__card--feature"><img class="editorial-collection__image" src="${collectionRoute.editorialImageUrl}" alt="${collectionRoute.editorialImageAlt}"></div></div></section>${renderFooter()}`;

const renderMembership = () => `${renderHeader()}<section class="membership-landing"><div class="membership-landing__hero"><img class="membership-landing__hero-image" src="${membershipRoute.hero.imageUrl}" alt="${membershipRoute.hero.imageAlt}"><div class="membership-landing__hero-copy"><p class="section-eyebrow">${membershipRoute.hero.eyebrow}</p><h1 class="section-heading section-heading--light">${membershipRoute.hero.heading}</h1><p class="membership-landing__hero-body">${membershipRoute.hero.body}</p><div class="membership-landing__hero-actions"><a class="button-outline button-outline--accent" href="${membershipRoute.hero.primaryUrl}">${membershipRoute.hero.primaryLabel}</a><a class="membership-landing__secondary-link" href="${membershipRoute.hero.secondaryUrl}">${membershipRoute.hero.secondaryLabel}</a></div></div></div><div class="membership-landing__trust">${membershipRoute.trustPerks.map((item) => `<div class="membership-landing__trust-item"><span class="membership-landing__trust-label">${item.label}</span><span class="membership-landing__trust-sub">${item.subLabel}</span></div>`).join("")}</div><div class="membership-landing__section"><div class="membership-landing__section-copy"><p class="section-eyebrow">The Process</p><h2 class="section-heading">How It Works</h2></div>${membershipRoute.steps.map((step) => `<div class="membership-landing__step"><img class="membership-landing__step-image" src="${step.imageUrl}" alt="${step.imageAlt}"><div class="membership-landing__step-copy"><span class="membership-landing__step-number">Step ${step.stepNumber}</span><h3 class="membership-landing__step-title">${step.title}</h3><p class="membership-landing__step-body">${step.body}</p><p class="membership-landing__step-detail">${step.detail}</p></div></div>`).join("")}</div><div class="membership-landing__tiers">${membershipRoute.tiers.map((tier) => `<article class="membership-landing__tier">${tier.badge ? `<span class="membership-landing__tier-badge">${tier.badge}</span>` : ""}<p class="membership-landing__tier-name">${tier.name}</p><h3 class="membership-landing__tier-price">${tier.price}</h3><p class="membership-landing__tier-meta">${tier.pieces} · ${tier.value}</p><p class="membership-landing__tier-tagline">${tier.tagline}</p><p class="membership-landing__tier-summary">${tier.summary}</p><a class="button-outline" href="${tier.ctaUrl}">${tier.ctaLabel}</a></article>`).join("")}</div><div class="membership-landing__faq">${membershipRoute.faqs.map((faq) => `<details class="membership-landing__faq-item"><summary>${faq.question}</summary><p>${faq.answer}</p></details>`).join("")}</div><div class="membership-landing__cta"><img class="membership-landing__cta-image" src="${membershipRoute.finalCta.imageUrl}" alt="${membershipRoute.finalCta.imageAlt}"><div class="membership-landing__cta-copy"><p class="section-eyebrow">${membershipRoute.finalCta.eyebrow}</p><h2 class="section-heading section-heading--light">${membershipRoute.finalCta.heading}</h2><p>${membershipRoute.finalCta.body}</p><div class="membership-landing__hero-actions"><a class="button-outline button-outline--accent" href="${membershipRoute.finalCta.primaryUrl}">${membershipRoute.finalCta.primaryLabel}</a><a class="membership-landing__secondary-link" href="${membershipRoute.finalCta.secondaryUrl}">${membershipRoute.finalCta.secondaryLabel}</a></div></div></div></section>${renderFooter()}`;

const renderProduct = () => `${renderHeader()}<section class="editorial-product"><div class="editorial-product__hero"><div class="editorial-product__gallery">${productRoute.gallery.map((image) => `<img class="editorial-product__gallery-image" src="${image.imageUrl}" alt="${image.imageAlt}">`).join("")}</div><div class="editorial-product__summary"><p class="commerce-kicker">${productRoute.vendor}</p><h1 class="commerce-heading">${productRoute.fallbackTitle}</h1><p class="editorial-product__subtitle">${productRoute.subtitle}</p><p class="editorial-product__rating">${productRoute.ratingText}</p><div class="editorial-product__price-row"><span class="editorial-product__price">${productRoute.priceLabel}</span><span class="editorial-product__badge">${productRoute.shippingBadge}</span></div><div class="editorial-product__stats">${productRoute.microStats.map((item) => `<span>${item}</span>`).join("")}</div><div class="editorial-product__actions"><a class="button-outline" href="/collections/all">Add to cart</a></div></div></div><div class="editorial-product__vip"><p class="section-eyebrow">${productRoute.vip.eyebrow}</p><h2 class="section-heading">${productRoute.vip.heading}</h2><p>${productRoute.vip.body}</p><div class="editorial-product__actions"><a class="button-outline button-outline--accent" href="${productRoute.vip.primaryUrl}">${productRoute.vip.primaryLabel}</a><a class="membership-landing__secondary-link" href="${productRoute.vip.secondaryUrl}">${productRoute.vip.secondaryLabel}</a></div></div><div class="editorial-product__companions">${productRoute.companions.map((item) => `<a class="editorial-product__companion" href="${item.linkUrl}"><img src="${item.imageUrl}" alt="${item.imageAlt}"><span class="editorial-product__companion-tag">${item.tag}</span><h3>${item.title}</h3><p>${item.price} · VIP ${item.vipPrice}</p></a>`).join("")}</div><div class="editorial-product__story"><p class="section-eyebrow">${productRoute.editorial.eyebrow}</p><h2 class="section-heading section-heading--light">${productRoute.editorial.heading}</h2><p>${productRoute.editorial.body}</p><div class="editorial-product__story-stats"><span>${productRoute.editorial.statOne}</span><span>${productRoute.editorial.statTwo}</span><span>${productRoute.editorial.statThree}</span></div></div><div class="editorial-product__reviews">${productRoute.reviews.map((review) => `<article class="editorial-product__review"><p class="editorial-product__review-meta">${review.name} · ${review.date}</p><h3>${review.title}</h3><p>${review.body}</p><span>${review.helpful}</span></article>`).join("")}</div><div class="editorial-product__faq">${productRoute.faqs.map((faq) => `<details class="membership-landing__faq-item"><summary>${faq.question}</summary><p>${faq.answer}</p></details>`).join("")}</div><div class="editorial-product__closing"><h2 class="section-heading">${productRoute.closingCta.heading}</h2><p>${productRoute.closingCta.body}</p><div class="editorial-product__actions"><a class="button-outline" href="${productRoute.closingCta.primaryUrl}">${productRoute.closingCta.primaryLabel}</a><a class="membership-landing__secondary-link" href="${productRoute.closingCta.secondaryUrl}">${productRoute.closingCta.secondaryLabel}</a></div></div></section>${renderFooter()}`;

const renderDusk = () => `${renderHeader()}<section class="subscription-box"><div class="subscription-box__hero"><div class="subscription-box__gallery">${duskRoute.gallery.map((image) => `<img class="subscription-box__gallery-image" src="${image.imageUrl}" alt="${image.imageAlt}">`).join("")}</div><div class="subscription-box__summary"><p class="commerce-kicker">${duskRoute.eyebrow}</p><h1 class="commerce-heading">${duskRoute.fallbackTitle}</h1><p class="editorial-product__subtitle">${duskRoute.subtitle}</p><p class="subscription-box__price">${duskRoute.priceLabel}</p><p class="subscription-box__value">${duskRoute.valueLabel}</p><p class="subscription-box__meta">${duskRoute.metaLabel}</p><a class="button-outline button-outline--accent" href="/pages/membership">Subscribe to Dusk</a></div></div><div class="subscription-box__pieces">${duskRoute.pieces.map((piece) => `<article class="subscription-box__piece"><img src="${piece.imageUrl}" alt="${piece.imageAlt}"><span class="subscription-box__piece-type">${piece.typeLabel}</span><h3>${piece.title}</h3><p>${piece.material} · ${piece.retail}</p></article>`).join("")}</div><div class="subscription-box__story"><img class="subscription-box__story-image" src="${duskRoute.story.imageUrl}" alt="${duskRoute.story.imageAlt}"><div class="subscription-box__story-copy"><p class="section-eyebrow">${duskRoute.story.eyebrow}</p><h2 class="section-heading section-heading--light">${duskRoute.story.heading}</h2><p>${duskRoute.story.bodyOne}</p><p>${duskRoute.story.bodyTwo}</p></div></div><div class="subscription-box__experience"><div class="subscription-box__experience-copy"><p class="section-eyebrow">${duskRoute.experience.eyebrow}</p><h2 class="section-heading">${duskRoute.experience.heading}</h2>${duskRoute.experienceSteps.map((step) => `<article class="subscription-box__experience-item"><h3>${step.title}</h3><p>${step.body}</p></article>`).join("")}</div><img class="subscription-box__experience-image" src="${duskRoute.experience.imageUrl}" alt="${duskRoute.experience.imageAlt}"></div><div class="subscription-box__past">${duskRoute.pastBoxes.map((item) => `<article class="subscription-box__past-card"><img src="${item.imageUrl}" alt="${item.imageAlt}"><div><p>${item.month}</p><h3>${item.theme}</h3><span>${item.value}</span></div></article>`).join("")}</div><div class="subscription-box__reviews">${duskRoute.reviews.map((review) => `<article class="editorial-product__review"><p class="editorial-product__review-meta">${review.name} · ${review.date} · ${review.rating}</p><p>${review.body}</p></article>`).join("")}</div><div class="subscription-box__tiers">${duskRoute.tiers.map((tier) => `<article class="membership-landing__tier"><p class="membership-landing__tier-name">${tier.name}</p><h3 class="membership-landing__tier-price">${tier.price}</h3><p class="membership-landing__tier-meta">${tier.pieces} · ${tier.value}</p><p class="membership-landing__tier-summary">${tier.state}</p></article>`).join("")}</div><div class="subscription-box__faq">${duskRoute.faqs.map((faq) => `<details class="membership-landing__faq-item"><summary>${faq.question}</summary><p>${faq.answer}</p></details>`).join("")}</div><div class="subscription-box__closing"><img class="subscription-box__closing-image" src="${duskRoute.finalCta.imageUrl}" alt="${duskRoute.finalCta.imageAlt}"><div class="subscription-box__closing-copy"><p class="section-eyebrow">${duskRoute.finalCta.eyebrow}</p><h2 class="section-heading section-heading--light">${duskRoute.finalCta.heading}</h2><p>${duskRoute.finalCta.body}</p><div class="editorial-product__actions"><a class="button-outline button-outline--accent" href="${duskRoute.finalCta.primaryUrl}">${duskRoute.finalCta.primaryLabel}</a><a class="membership-landing__secondary-link" href="${duskRoute.finalCta.secondaryUrl}">${duskRoute.finalCta.secondaryLabel}</a></div></div></div></section>${renderFooter()}`;

const pages = [
  { filePath: previewFilePath("/"), title: homeSpec.meta.name, body: renderHome() },
  { filePath: previewFilePath(collectionRoute.path), title: collectionRoute.heading, body: renderCollection() },
  { filePath: previewFilePath(membershipRoute.path), title: membershipRoute.hero.heading, body: renderMembership() },
  { filePath: previewFilePath(productRoute.path), title: productRoute.fallbackTitle, body: renderProduct() },
  { filePath: previewFilePath(duskRoute.path), title: duskRoute.fallbackTitle, body: renderDusk() }
];

for (const page of pages) {
  await mkdir(path.dirname(page.filePath), { recursive: true });
  await writeFile(page.filePath, pageWrapper(page.title, page.body), "utf8");
}

console.log(`Built site preview under ${path.relative(process.cwd(), previewDir)}`);
