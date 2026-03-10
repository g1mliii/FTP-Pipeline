import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDesignContext, rootDir } from "./lib/design-context.mjs";

const designContext = getDesignContext(process.argv[2]);
const outputDir = designContext.themeDir;
const sourceDir = path.join(rootDir, "scripts", "theme-source");

const homeSpec = JSON.parse(await readFile(designContext.files.home, "utf8"));
const siteShell = JSON.parse(await readFile(designContext.files.shell, "utf8"));
const collectionRoute = JSON.parse(await readFile(designContext.files.routeCollection, "utf8"));
const membershipRoute = JSON.parse(await readFile(designContext.files.routeMembership, "utf8"));
const productRoute = JSON.parse(await readFile(designContext.files.routeProduct, "utf8"));
const duskRoute = JSON.parse(await readFile(designContext.files.routeDuskBox, "utf8"));

const baseGenerator = spawnSync(process.execPath, ["scripts/generate-shopify-home.mjs", designContext.files.home, outputDir], {
  cwd: rootDir,
  stdio: "inherit"
});

if (baseGenerator.status !== 0) {
  process.exit(baseGenerator.status ?? 1);
}

const toBlocks = (items) =>
  Object.fromEntries(items.map((block, index) => [`block_${index + 1}`, block]));

const withHeaderFooter = (bodyType, bodySettings, bodyBlocks = null) => {
  const template = {
    sections: {
      header: {
        type: "site-header",
        settings: {
          announcement_text: siteShell.announcement,
          brand: siteShell.brand
        }
      },
      body: {
        type: bodyType,
        settings: bodySettings
      },
      footer: {
        type: "site-footer",
        settings: {
          brand: siteShell.brand,
          body: siteShell.footer.description
        }
      }
    },
    order: ["header", "body", "footer"]
  };

  if (bodyBlocks) {
    template.sections.body.blocks = bodyBlocks;
    template.sections.body.block_order = Object.keys(bodyBlocks);
  }

  return template;
};

const collectionBlocks = toBlocks([
  ...collectionRoute.products.map((product) => ({
    type: "product",
    settings: {
      title: product.title,
      price: product.price,
      tag: product.tag,
      link_url: product.linkUrl,
      image_alt: product.imageAlt
    }
  })),
  {
    type: "editorial",
    settings: {
      image_alt: collectionRoute.editorialImageAlt
    }
  }
]);

const membershipBlocks = toBlocks([
  ...membershipRoute.trustPerks.map((item) => ({ type: "perk", settings: { label: item.label, sub_label: item.subLabel } })),
  ...membershipRoute.steps.map((item) => ({ type: "step", settings: { step_number: item.stepNumber, title: item.title, body: item.body, detail: item.detail, image_alt: item.imageAlt } })),
  ...membershipRoute.benefits.map((item) => ({ type: "benefit", settings: { title: item.title, body: item.body } })),
  ...membershipRoute.tiers.map((item) => ({ type: "tier", settings: { name: item.name, price: item.price, value: item.value, pieces: item.pieces, tagline: item.tagline, summary: item.summary, badge: item.badge, cta_label: item.ctaLabel, cta_url: item.ctaUrl } })),
  ...membershipRoute.comparison.map((item) => ({ type: "comparison", settings: { feature: item.feature, member: item.member, non_member: item.nonMember } })),
  ...membershipRoute.testimonials.map((item) => ({ type: "testimonial", settings: { name: item.name, location: item.location, tier: item.tier, quote: item.quote, image_alt: item.imageAlt } })),
  ...membershipRoute.faqs.map((item) => ({ type: "faq", settings: { question: item.question, answer: item.answer } }))
]);

const productBlocks = toBlocks([
  ...productRoute.gallery.map((item) => ({ type: "gallery", settings: { image_alt: item.imageAlt } })),
  ...productRoute.companions.map((item) => ({ type: "companion", settings: { title: item.title, price: item.price, vip_price: item.vipPrice, tag: item.tag, link_url: item.linkUrl, image_alt: item.imageAlt } })),
  ...productRoute.reviews.map((item) => ({ type: "review", settings: { name: item.name, date: item.date, title: item.title, body: item.body, helpful: item.helpful } })),
  ...productRoute.faqs.map((item) => ({ type: "faq", settings: { question: item.question, answer: item.answer } }))
]);

const duskBlocks = toBlocks([
  ...duskRoute.gallery.map((item) => ({ type: "gallery", settings: { image_alt: item.imageAlt } })),
  ...duskRoute.pieces.map((item) => ({ type: "piece", settings: { title: item.title, material: item.material, retail: item.retail, type_label: item.typeLabel, image_alt: item.imageAlt } })),
  ...duskRoute.experienceSteps.map((item) => ({ type: "experience_step", settings: { title: item.title, body: item.body } })),
  ...duskRoute.pastBoxes.map((item) => ({ type: "past_box", settings: { month: item.month, theme: item.theme, value: item.value, image_alt: item.imageAlt } })),
  ...duskRoute.reviews.map((item) => ({ type: "review", settings: { name: item.name, date: item.date, rating: item.rating, body: item.body } })),
  ...duskRoute.tiers.map((item) => ({ type: "tier", settings: { name: item.name, price: item.price, pieces: item.pieces, value: item.value, state: item.state } })),
  ...duskRoute.faqs.map((item) => ({ type: "faq", settings: { question: item.question, answer: item.answer } }))
]);

const copyPairs = [
  ["site-header.liquid", path.join(outputDir, "sections", "site-header.liquid")],
  ["site-footer.liquid", path.join(outputDir, "sections", "site-footer.liquid")],
  ["collection-editorial.liquid", path.join(outputDir, "sections", "collection-editorial.liquid")],
  ["membership-landing.liquid", path.join(outputDir, "sections", "membership-landing.liquid")],
  ["editorial-product-detail.liquid", path.join(outputDir, "sections", "editorial-product-detail.liquid")],
  ["subscription-box-detail.liquid", path.join(outputDir, "sections", "subscription-box-detail.liquid")],
  ["route-pages.css", path.join(outputDir, "assets", "route-pages.css")]
];

await Promise.all(copyPairs.map(([from, to]) => copyFile(path.join(sourceDir, from), to)));

const routeAssets = [
  [membershipRoute.hero.imageUrl, "membership-landing-hero.jpg"],
  [membershipRoute.finalCta.imageUrl, "membership-landing-cta.jpg"],
  ...membershipRoute.steps.map((item, index) => [item.imageUrl, `membership-landing-step-${index + 1}.jpg`]),
  ...membershipRoute.testimonials.map((item, index) => [item.imageUrl, `membership-landing-testimonial-${index + 1}.jpg`]),
  [collectionRoute.editorialImageUrl, "collection-editorial-feature.jpg"],
  ...collectionRoute.products.map((item, index) => [item.imageUrl, `collection-editorial-product-${index + 1}.jpg`]),
  ...productRoute.gallery.map((item, index) => [item.imageUrl, `editorial-product-detail-gallery-${index + 1}.jpg`]),
  ...productRoute.companions.map((item, index) => [item.imageUrl, `editorial-product-detail-companion-${index + 1}.jpg`]),
  ...duskRoute.gallery.map((item, index) => [item.imageUrl, `subscription-box-detail-gallery-${index + 1}.jpg`]),
  ...duskRoute.pieces.map((item, index) => [item.imageUrl, `subscription-box-detail-piece-${index + 1}.jpg`]),
  [duskRoute.story.imageUrl, "subscription-box-detail-story.jpg"],
  [duskRoute.experience.imageUrl, "subscription-box-detail-experience.jpg"],
  [duskRoute.finalCta.imageUrl, "subscription-box-detail-cta.jpg"],
  ...duskRoute.pastBoxes.map((item, index) => [item.imageUrl, `subscription-box-detail-past-${index + 1}.jpg`])
];

await Promise.all(
  routeAssets.map(async ([url, fileName]) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${fileName}: ${response.status}`);
    }
    await writeFile(path.join(outputDir, "assets", fileName), Buffer.from(await response.arrayBuffer()));
  })
);

const indexTemplate = JSON.parse(await readFile(path.join(outputDir, "templates", "index.json"), "utf8"));
indexTemplate.sections = {
  header: {
    type: "site-header",
    settings: {
      announcement_text: siteShell.announcement,
      brand: siteShell.brand
    }
  },
  ...indexTemplate.sections,
  footer: {
    type: "site-footer",
    settings: {
      brand: siteShell.brand,
      body: siteShell.footer.description
    }
  }
};
indexTemplate.order = ["header", ...indexTemplate.order, "footer"];

const layoutPath = path.join(outputDir, "layout", "theme.liquid");
const layout = await readFile(layoutPath, "utf8");
if (!layout.includes("route-pages.css")) {
  await writeFile(
    layoutPath,
    layout.replace("{{ 'home-sections.css' | asset_url | stylesheet_tag }}", "{{ 'home-sections.css' | asset_url | stylesheet_tag }}\n    {{ 'route-pages.css' | asset_url | stylesheet_tag }}"),
    "utf8"
  );
}

await mkdir(path.join(outputDir, "templates"), { recursive: true });

await Promise.all([
  writeFile(path.join(outputDir, "templates", "index.json"), JSON.stringify(indexTemplate, null, 2), "utf8"),
  writeFile(path.join(outputDir, "templates", "product.json"), JSON.stringify(withHeaderFooter("editorial-product-detail", { vendor: productRoute.vendor, fallback_title: productRoute.fallbackTitle, subtitle: productRoute.subtitle, price_label: productRoute.priceLabel, shipping_badge: productRoute.shippingBadge, rating_text: productRoute.ratingText, micro_stats: productRoute.microStats.join(" | "), vip_eyebrow: productRoute.vip.eyebrow, vip_heading: productRoute.vip.heading, vip_body: productRoute.vip.body, vip_primary_label: productRoute.vip.primaryLabel, vip_primary_url: productRoute.vip.primaryUrl, vip_secondary_label: productRoute.vip.secondaryLabel, vip_secondary_url: productRoute.vip.secondaryUrl, editorial_eyebrow: productRoute.editorial.eyebrow, editorial_heading: productRoute.editorial.heading, editorial_body: productRoute.editorial.body, editorial_stat_one: productRoute.editorial.statOne, editorial_stat_two: productRoute.editorial.statTwo, editorial_stat_three: productRoute.editorial.statThree, closing_heading: productRoute.closingCta.heading, closing_body: productRoute.closingCta.body, closing_primary_label: productRoute.closingCta.primaryLabel, closing_primary_url: productRoute.closingCta.primaryUrl, closing_secondary_label: productRoute.closingCta.secondaryLabel, closing_secondary_url: productRoute.closingCta.secondaryUrl }, productBlocks), null, 2), "utf8"),
  writeFile(path.join(outputDir, "templates", "collection.json"), JSON.stringify(withHeaderFooter("collection-editorial", { eyebrow: collectionRoute.eyebrow, heading: collectionRoute.heading, intro: collectionRoute.intro, filter_labels: collectionRoute.filters.join(" | ") }, collectionBlocks), null, 2), "utf8"),
  writeFile(path.join(outputDir, "templates", "page.json"), JSON.stringify(withHeaderFooter("main-page", {}), null, 2), "utf8"),
  writeFile(path.join(outputDir, "templates", "collection.editorial.json"), JSON.stringify(withHeaderFooter("collection-editorial", { eyebrow: collectionRoute.eyebrow, heading: collectionRoute.heading, intro: collectionRoute.intro, filter_labels: collectionRoute.filters.join(" | ") }, collectionBlocks), null, 2), "utf8"),
  writeFile(path.join(outputDir, "templates", "page.membership.json"), JSON.stringify(withHeaderFooter("membership-landing", { hero_eyebrow: membershipRoute.hero.eyebrow, hero_heading: membershipRoute.hero.heading, hero_body: membershipRoute.hero.body, hero_primary_label: membershipRoute.hero.primaryLabel, hero_primary_url: membershipRoute.hero.primaryUrl, hero_secondary_label: membershipRoute.hero.secondaryLabel, hero_secondary_url: membershipRoute.hero.secondaryUrl, hero_image_alt: membershipRoute.hero.imageAlt, cta_eyebrow: membershipRoute.finalCta.eyebrow, cta_heading: membershipRoute.finalCta.heading, cta_body: membershipRoute.finalCta.body, cta_primary_label: membershipRoute.finalCta.primaryLabel, cta_primary_url: membershipRoute.finalCta.primaryUrl, cta_secondary_label: membershipRoute.finalCta.secondaryLabel, cta_secondary_url: membershipRoute.finalCta.secondaryUrl, cta_image_alt: membershipRoute.finalCta.imageAlt }, membershipBlocks), null, 2), "utf8"),
  writeFile(path.join(outputDir, "templates", "product.vue-chain-necklace.json"), JSON.stringify(withHeaderFooter("editorial-product-detail", { vendor: productRoute.vendor, fallback_title: productRoute.fallbackTitle, subtitle: productRoute.subtitle, price_label: productRoute.priceLabel, shipping_badge: productRoute.shippingBadge, rating_text: productRoute.ratingText, micro_stats: productRoute.microStats.join(" | "), vip_eyebrow: productRoute.vip.eyebrow, vip_heading: productRoute.vip.heading, vip_body: productRoute.vip.body, vip_primary_label: productRoute.vip.primaryLabel, vip_primary_url: productRoute.vip.primaryUrl, vip_secondary_label: productRoute.vip.secondaryLabel, vip_secondary_url: productRoute.vip.secondaryUrl, editorial_eyebrow: productRoute.editorial.eyebrow, editorial_heading: productRoute.editorial.heading, editorial_body: productRoute.editorial.body, editorial_stat_one: productRoute.editorial.statOne, editorial_stat_two: productRoute.editorial.statTwo, editorial_stat_three: productRoute.editorial.statThree, closing_heading: productRoute.closingCta.heading, closing_body: productRoute.closingCta.body, closing_primary_label: productRoute.closingCta.primaryLabel, closing_primary_url: productRoute.closingCta.primaryUrl, closing_secondary_label: productRoute.closingCta.secondaryLabel, closing_secondary_url: productRoute.closingCta.secondaryUrl }, productBlocks), null, 2), "utf8"),
  writeFile(path.join(outputDir, "templates", "product.dusk-box.json"), JSON.stringify(withHeaderFooter("subscription-box-detail", { eyebrow: duskRoute.eyebrow, fallback_title: duskRoute.fallbackTitle, subtitle: duskRoute.subtitle, price_label: duskRoute.priceLabel, value_label: duskRoute.valueLabel, meta_label: duskRoute.metaLabel, story_eyebrow: duskRoute.story.eyebrow, story_heading: duskRoute.story.heading, story_body_one: duskRoute.story.bodyOne, story_body_two: duskRoute.story.bodyTwo, story_image_alt: duskRoute.story.imageAlt, experience_eyebrow: duskRoute.experience.eyebrow, experience_heading: duskRoute.experience.heading, experience_image_alt: duskRoute.experience.imageAlt, final_eyebrow: duskRoute.finalCta.eyebrow, final_heading: duskRoute.finalCta.heading, final_body: duskRoute.finalCta.body, final_primary_label: duskRoute.finalCta.primaryLabel, final_primary_url: duskRoute.finalCta.primaryUrl, final_secondary_label: duskRoute.finalCta.secondaryLabel, final_secondary_url: duskRoute.finalCta.secondaryUrl, final_image_alt: duskRoute.finalCta.imageAlt }, duskBlocks), null, 2), "utf8")
]);

console.log(`Generated site-wide Shopify theme for ${designContext.designSlug} with ${homeSpec.sections.length} home sections and route templates.`);
