import { test, expect, Page } from '@playwright/test';

/**
 * Discoverability.
 *
 * These assertions exist because the failures they catch are invisible: a
 * sitemap that silently omits a new page, a canonical pointing at the wrong
 * URL, or -- as actually happened here -- structured data naming a social
 * account the company does not own. Nothing about the rendered page looks
 * wrong in any of those cases, and nobody notices for months.
 *
 * They assert on served bytes rather than on layout, so they are
 * viewport-independent -- both projects run them and both should agree.
 */

/** Routes the export is expected to publish, without the trailing slash rule applied. */
const PUBLIC_ROUTES = ['/', '/about/', '/privacy/', '/terms/'];

const SITE = 'https://invoice.dewiride.com';

const jsonLdTypes = async (page: Page): Promise<string[]> =>
  page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.map((n) => {
      try {
        return (JSON.parse(n.textContent ?? '{}') as { '@type'?: string })['@type'] ?? 'UNTYPED';
      } catch {
        return 'PARSE-FAIL';
      }
    }),
  );

test.describe('discoverability', () => {
  test('the sitemap lists every published route, exactly once', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);

    const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

    expect(locs).toEqual(PUBLIC_ROUTES.map((route) => SITE + route));
    expect(new Set(locs).size).toBe(locs.length);
    // A hand-maintained sitemap went stale the moment a page was added; this
    // is the assertion that would have caught it.
    expect(locs).not.toContain(`${SITE}/404/`);
  });

  test('every published route is reachable and self-canonical', async ({ page }) => {
    const seenTitles = new Set<string>();
    const seenDescriptions = new Set<string>();

    for (const route of PUBLIC_ROUTES) {
      const response = await page.goto(route);
      expect(response?.status(), `${route} should be served`).toBe(200);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical, `${route} canonical`).toBe(SITE + route);

      // Duplicate titles and descriptions across pages are the single most
      // common reason a small site's subpages never rank separately.
      const title = await page.title();
      expect(title.length, `${route} needs a title`).toBeGreaterThan(10);
      expect(seenTitles.has(title), `${route} duplicates a title`).toBe(false);
      seenTitles.add(title);

      const description = await page
        .locator('meta[name="description"]')
        .first()
        .getAttribute('content');
      expect(description, `${route} needs a description`).toBeTruthy();
      expect(seenDescriptions.has(description!), `${route} duplicates a description`).toBe(false);
      seenDescriptions.add(description!);
    }
  });

  test('only the tool itself claims to be the tool', async ({ page }) => {
    await page.goto('/');
    const home = await jsonLdTypes(page);
    expect(home).toContain('WebApplication');
    expect(home).toContain('HowTo');
    expect(home).toContain('FAQPage');
    expect(home).toContain('WebSite');
    expect(home).not.toContain('PARSE-FAIL');

    // WebApplication used to be emitted from _document, so /privacy/ and
    // /terms/ each carried a node asserting they were the app at the site
    // root, alongside HowTo steps they do not contain.
    for (const route of ['/about/', '/privacy/', '/terms/']) {
      await page.goto(route);
      const types = await jsonLdTypes(page);
      expect(types, `${route} JSON-LD`).toContain('BreadcrumbList');
      expect(types, `${route} JSON-LD`).toContain('WebSite');
      expect(types, `${route} must not claim to be the app`).not.toContain('WebApplication');
      expect(types, `${route} does not contain the steps`).not.toContain('HowTo');
      expect(types).not.toContain('PARSE-FAIL');
    }
  });

  test('the entity graph names only accounts Dewiride controls', async ({ page }) => {
    await page.goto('/');

    // The handle is @dewiridetech. sameAs and the card tags both used to claim
    // @dewiride, which resolves to someone else entirely.
    for (const name of ['twitter:site', 'twitter:creator']) {
      expect(await page.locator(`meta[name="${name}"]`).getAttribute('content')).toBe(
        '@dewiridetech',
      );
    }

    const html = await page.content();
    expect(html).not.toContain('twitter.com/dewiride"');
    expect(html).not.toContain('"https://twitter.com/dewiride"');

    const sameAs = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
      nodes.flatMap((n) => {
        const parsed = JSON.parse(n.textContent ?? '{}') as {
          sameAs?: string[];
          publisher?: { sameAs?: string[] };
        };
        return [...(parsed.sameAs ?? []), ...(parsed.publisher?.sameAs ?? [])];
      }),
    );
    expect(sameAs.length).toBeGreaterThan(0);
    expect(sameAs).toContain('https://x.com/dewiridetech');
    expect(sameAs.some((url) => url.includes('twitter.com/dewiride'))).toBe(false);
  });

  test('nothing published is orphaned', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.$$eval('a[href]', (links) =>
      links.map((l) => new URL((l as HTMLAnchorElement).href).pathname),
    );

    // A page in the sitemap that nothing links to is crawled late and ranks
    // poorly. Every route must be reachable from the home page.
    for (const route of PUBLIC_ROUTES.filter((r) => r !== '/')) {
      const withoutSlash = route.replace(/\/$/, '');
      expect(
        hrefs.some((href) => href === route || href === withoutSlash),
        `${route} is not linked from the home page`,
      ).toBe(true);
    }
  });

  test('robots.txt and llms.txt are served and point at the right places', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const robotsBody = await robots.text();
    expect(robotsBody).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    expect(robotsBody).not.toMatch(/^Disallow: \/$/m);

    const llms = await request.get('/llms.txt');
    expect(llms.status()).toBe(200);
    const llmsBody = await llms.text();
    expect(llmsBody).toContain('# Dewiride Invoice Generator');
    // Every page it advertises has to exist, or it teaches models a dead URL.
    for (const url of [...llmsBody.matchAll(/\]\((https:\/\/invoice\.dewiride\.com[^)]*)\)/g)]) {
      expect(PUBLIC_ROUTES.map((r) => SITE + r)).toContain(url[1]);
    }
  });
});
