package com.manas.opsconsole.support;

import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

/**
 * Builds a headless Chrome WebDriver against Playwright's own bundled Chromium
 * (a Chrome for Testing build installed by {@code browser/package.json}'s
 * {@code playwright install chromium}), never the machine's installed browser.
 * {@code webdriver.chrome.binary} points at that binary; {@code webdriver.chrome.driver}
 * (both set in pom.xml and the CI workflow) points at the exact-matching-version
 * driver executable {@code browser/fetch_driver.py} downloads straight from the
 * Chrome for Testing dashboard into this project, used directly instead of letting
 * Selenium Manager resolve (and cache) one on its own.
 */
public final class ChromeDriverFactory {

  private ChromeDriverFactory() {
  }

  public static ChromeDriver create() {
    ChromeOptions options = new ChromeOptions();
    options.addArguments("--headless=new");
    options.addArguments("--disable-gpu");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--window-size=1280,900");

    String binary = System.getProperty("webdriver.chrome.binary");
    if (binary != null && !binary.isBlank() && new java.io.File(binary).exists()) {
      options.setBinary(binary);
    }

    return new ChromeDriver(options);
  }
}
