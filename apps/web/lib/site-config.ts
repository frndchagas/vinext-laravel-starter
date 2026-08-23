import type { Metadata, MetadataRoute } from "next";

const defaultName = "Vinext Laravel Starter";
const defaultDescription =
  "A Laravel and Vinext foundation for coding agents, with typed contracts, queues and realtime.";
const defaultUrl = "http://localhost:13000";

type SiteEnvironment = Record<string, string | undefined>;

export type SiteConfig = {
  description: string;
  indexable: boolean;
  name: string;
  repositoryUrl: URL | null;
  socialImage: URL | null;
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

function optionalUrl(value: string | undefined, base?: URL) {
  if (!value?.trim()) return null;

  const url = new URL(value.trim(), base);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Optional public URLs must use HTTP(S) without credentials.");
  }

  return url;
}

export function getSiteConfig(environment: SiteEnvironment = process.env): SiteConfig {
  const url = applicationUrl(environment.APP_URL);

  return {
    description: text(environment.APP_DESCRIPTION, defaultDescription),
    indexable: environment.APP_INDEXABLE?.trim().toLowerCase() === "true",
    name: text(environment.APP_NAME, defaultName),
    repositoryUrl: optionalUrl(environment.APP_REPOSITORY_URL),
    socialImage: optionalUrl(environment.APP_SOCIAL_IMAGE, url),
    url,
  };
}

function socialMetadata(site: SiteConfig) {
  const image = site.socialImage
    ? {
        alt: `${site.name} application preview`,
        height: 630,
        url: site.socialImage,
        width: 1200,
      }
    : undefined;

  return {
    openGraph: {
      description: site.description,
      ...(image ? { images: [image] } : {}),
      title: site.name,
      type: "website" as const,
    },
    twitter: {
      card: image ? ("summary_large_image" as const) : ("summary" as const),
      description: site.description,
      ...(image ? { images: [image] } : {}),
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
