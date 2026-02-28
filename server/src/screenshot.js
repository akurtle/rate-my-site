import { chromium } from 'playwright'

const DEFAULT_VIEWPORT = { width: 1280, height: 720 }

const normalizeUrl = (value) => {
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  return `https://${value}`
}

export async function captureSiteScreenshot({ url, timeoutMs = 20000 }) {
  const targetUrl = normalizeUrl(url)
  if (!targetUrl) {
    throw new Error('Invalid URL')
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: DEFAULT_VIEWPORT })

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: timeoutMs })
    const buffer = await page.screenshot({ type: 'jpeg', quality: 75, fullPage: true })
    return { buffer, url: targetUrl }
  } finally {
    await page.close()
    await browser.close()
  }
}

