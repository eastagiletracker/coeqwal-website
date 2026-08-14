import { test, expect, type Page } from "@playwright/test"
import { collectConsoleErrors, setupNetwork } from "./support/network"

// The partner grid keys each logo by its src, so a repeated entry rendered the
// same partner twice and collided on that key. These checks read the shipped
// About page, the artifact the static export serves.

type RenderedLogo = { file: string; alt: string }

async function partnerLogos(page: Page): Promise<RenderedLogo[]> {
  await page.goto("/about")
  await expect(
    page.getByRole("heading", { name: "Our Partners" }),
  ).toBeVisible()
  const logos = await page
    .locator('section[aria-label="our partners"] img')
    .evaluateAll((images) =>
      images.map((image) => ({
        file: new URL((image as HTMLImageElement).src).pathname,
        alt: (image as HTMLImageElement).alt,
      })),
    )
  expect(logos.length).toBeGreaterThan(0)
  return logos
}

test("partner grid renders each logo once", async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await setupNetwork(page)
  const files = (await partnerLogos(page)).map((logo) => logo.file)
  expect(files).toEqual([...new Set(files)])
  expect(errors).toEqual([])
})

test("each partner logo carries its own alt text", async ({ page }) => {
  await setupNetwork(page)
  const logos = await partnerLogos(page)
  // NOAA Fisheries was announced as "AGWA logo": two different partners
  // sharing one alt text is the shape of that defect.
  const alts = logos.map((logo) => logo.alt)
  expect(alts).toEqual([...new Set(alts)])
  for (const { alt } of logos) expect(alt.trim()).not.toBe("")
  const noaa = logos.find((logo) => logo.file.includes("noaa"))
  expect(noaa?.alt).toMatch(/noaa/i)
})
