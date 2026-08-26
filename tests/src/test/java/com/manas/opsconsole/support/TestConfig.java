package com.manas.opsconsole.support;

/**
 * Central place to read the base URL the whole suite targets. Both the
 * REST Assured API tests and the Selenium page objects use this so a
 * single {@code -Dapp.baseUrl=...} flips the entire suite onto a
 * different running instance (used by the regression matrix runner,
 * which restarts the backend once per seeded defect).
 */
public final class TestConfig {

  private TestConfig() {
  }

  public static String baseUrl() {
    return System.getProperty("app.baseUrl", "http://localhost:4000");
  }

  public static String apiUrl() {
    return baseUrl() + "/api";
  }
}
