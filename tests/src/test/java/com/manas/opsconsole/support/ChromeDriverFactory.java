package com.manas.opsconsole.support;

import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

/**
 * Builds a headless Chrome WebDriver. Selenium 4's built-in Selenium
 * Manager resolves a matching chromedriver automatically; no manual
 * driver management is needed as long as Chrome itself is installed
 * (or {@code webdriver.chrome.binary} points at it, which the CI
 * workflow and the local pom.xml both set).
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
