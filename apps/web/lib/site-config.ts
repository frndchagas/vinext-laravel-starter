import type { Metadata, MetadataRoute } from "next";

const defaultName = "Vinext Laravel Starter";
const defaultDescription =
  "A Laravel and Vinext foundation for coding agents, with typed contracts, queues and realtime.";
const defaultUrl = "http://localhost:13000";
const socialImagePath = "/opengraph-image.jpg";
const socialImageAlt = "Vinext Laravel Starter Tasks screen";

type SiteEnvironment = Record<string, string | undefined>;

export type SiteConfig = {
  description: string;
  indexable: boolean;
  name: string;
  socialImage: URL;
  url: URL;
};

function text(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function applicationUrl(value: string | undefined) {
  const url = new URL(text(value, defaultUrl));

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("APP_URL must be an HTTP(S) origin without credentials, path, query or hash.");
  }

  return url;
}

export function getSiteConfig(environment: SiteEnvironment = process.env): SiteConfig {
  const url = applicationUrl(environment.APP_URL);

  return {
    description: text(environment.APP_DESCRIPTION, defaultDescription),
    indexable: environment.APP_INDEXABLE?.trim().toLowerCase() === "true",
    name: text(environment.APP_NAME, defaultName),
    socialImage: new URL(socialImagePath, url),
    url,
  };
}

function socialMetadata(site: SiteConfig) {
  const image = {
    alt: socialImageAlt,
    height: 630,
    url: site.socialImage,
    width: 1200,
  };

  return {
    openGraph: {
      description: site.description,
      images: [image],
      title: site.name,
      type: "website" as const,
    },
    twitter: {
      card: "summary_large_image" as const,
      description: site.description,
      images: [image],
      title: site.name,
    },
  };
}

export function createRootMetadata(environment?: SiteEnvironment): Metadata {
  const site = getSiteConfig(environment);

  return {
    description: site.description,
    metadataBase: site.url,
    robots: { follow: false, index: false },
    title: site.name,
    ...socialMetadata(site),
  };
}

export function createHomeMetadata(environment?: SiteEnvironment): Metadata {
  const site = getSiteConfig(environment);

  return {
    alternates: { canonical: site.url },
    description: site.description,
    robots: { follow: site.indexable, index: site.indexable },
    title: site.name,
    ...socialMetadata(site),
    openGraph: {
      ...socialMetadata(site).openGraph,
      url: site.url,
    },
  };
}

export function createRobots(environment?: SiteEnvironment): MetadataRoute.Robots {
  const site = getSiteConfig(environment);

  return {
    rules: site.indexable ? { allow: "/", userAgent: "*" } : { disallow: "/", userAgent: "*" },
  };
}
