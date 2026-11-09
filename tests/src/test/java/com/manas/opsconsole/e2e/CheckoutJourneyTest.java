package com.manas.opsconsole.e2e;

import com.manas.opsconsole.e2e.pages.CheckoutPage;
import com.manas.opsconsole.support.ChromeDriverFactory;
import com.manas.opsconsole.support.TestConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.WebDriver;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Selenium page-object journeys over the payment checkout flow, alongside
 * IncidentJourneysTest's operations-console journeys. Uses the same headless
 * Chromium (Playwright's, never the host browser) and the same real built
 * React app as the rest of the suite.
 */
class CheckoutJourneyTest {

  private WebDriver driver;

  @BeforeEach
  void startBrowser() {
    driver = ChromeDriverFactory.create();
  }

  @AfterEach
  void stopBrowser() {
    if (driver != null) {
      driver.quit();
    }
  }

  @Test
  void approvesPaymentWithAnOrdinaryCard() {
    CheckoutPage checkout = new CheckoutPage(driver).open(TestConfig.baseUrl());
    assertTrue(checkout.cartTotalText().contains("$"), "cart total should render as currency");

    checkout.enterCardNumber("4111111111111111").pay();
    assertTrue(checkout.hasConfirmation());
    assertEquals("APPROVED", checkout.orderStatus());
  }

  @Test
  void declinesPaymentWithTheFixtureDeclineCard() {
    CheckoutPage checkout = new CheckoutPage(driver).open(TestConfig.baseUrl());
    checkout.enterCardNumber("4111111111110002").pay();
    assertTrue(checkout.hasConfirmation());
    assertEquals("DECLINED", checkout.orderStatus());
  }

  @Test
  void rejectsAMalformedCardNumberBeforeCharging() {
    CheckoutPage checkout = new CheckoutPage(driver).open(TestConfig.baseUrl());
    checkout.enterCardNumber("123").pay();
    assertTrue(checkout.errorText().toLowerCase().contains("16 digits"));
  }
}
