import { describe, expect, it } from "vitest";

import { createHomeMetadata, createRobots, createRootMetadata, getSiteConfig } from "./site-config";

describe("site configuration", () => {
  it("uses safe local and noindex defaults", () => {
    const site = getSiteConfig({});
    const root = createRootMetadata({});

    expect(site.url.href).toBe("http://localhost:13000/");
    expect(site.indexable).toBe(false);
    expect(site.repositoryUrl).toBeNull();
    expect(site.socialImage).toBeNull();
    expect(root.robots).toEqual({ follow: false, index: false });
    expect(root.twitter).toMatchObject({ card: "summary" });
    expect(createRobots({}).rules).toEqual({ disallow: "/", userAgent: "*" });
  });

  it("builds one consistent public identity from explicit values", () => {
    const environment = {
      APP_DESCRIPTION: "A configured application.",
      APP_INDEXABLE: "true",
      APP_NAME: "Example product",
      APP_REPOSITORY_URL: "https://github.com/example/product",
      APP_SOCIAL_IMAGE: "/opengraph-image.jpg",
      APP_URL: "https://example.com",
    };
    const metadata = createHomeMetadata(environment);

    expect(metadata).toMatchObject({
      alternates: { canonical: new URL("https://example.com") },
      description: "A configured application.",
      openGraph: {
        description: "A configured application.",
        title: "Example product",
        type: "website",
        url: new URL("https://example.com"),
      },
      robots: { follow: true, index: true },
      title: "Example product",
      twitter: {
        card: "summary_large_image",
        description: "A configured application.",
        title: "Example product",
      },
    });
    expect(createRobots(environment).rules).toEqual({ allow: "/", userAgent: "*" });
    expect(getSiteConfig(environment)).toMatchObject({
      repositoryUrl: new URL("https://github.com/example/product"),
      socialImage: new URL("https://example.com/opengraph-image.jpg"),
    });
  });

  it("rejects an APP_URL that cannot be a canonical origin", () => {
    expect(() => getSiteConfig({ APP_URL: "https://user@example.com/path?query=1" })).toThrow(
      "APP_URL must be an HTTP(S) origin",
    );
  });
});
