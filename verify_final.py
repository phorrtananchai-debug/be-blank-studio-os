import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # Test Landing Page
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        await page.goto('http://localhost:5173')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='verification/landing_page_final.png')

        # Check font on landing page
        font_family = await page.evaluate("window.getComputedStyle(document.body).fontFamily")
        print(f"Body Font Family: {font_family}")

        # Test /os (Dashboard) - Might show login
        await page.goto('http://localhost:5173/os')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='verification/dashboard_final.png')

        # Test /m (Mobile)
        mobile_context = await browser.new_context(
            viewport={'width': 375, 'height': 812},
            is_mobile=True
        )
        mobile_page = await mobile_context.new_page()
        await mobile_page.goto('http://localhost:5173/m')
        await mobile_page.wait_for_timeout(2000)
        await mobile_page.screenshot(path='verification/mobile_final.png')

        await browser.close()

if __name__ == "__main__":
    if not os.path.exists('verification'):
        os.makedirs('verification')
    asyncio.run(verify())
