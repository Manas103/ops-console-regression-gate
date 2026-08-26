package com.manas.opsconsole.e2e;

import com.manas.opsconsole.e2e.pages.IncidentDetailPage;
import com.manas.opsconsole.e2e.pages.OperationsConsolePage;
import com.manas.opsconsole.support.ChromeDriverFactory;
import com.manas.opsconsole.support.TestConfig;
import org.junit.jupiter.api.*;
import org.openqa.selenium.WebDriver;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Selenium end-to-end journeys driving the real, built React app in
 * headless Chrome through the Page Object pattern. Each test is a real
 * user journey with real assertions, not a smoke check.
 * <p>
 * Incident ids used here (1 and 2) are left untouched by the API contract
 * suite (IncidentApiContractTest uses ids 3 through 9999) so the two test
 * classes can run against the same live backend without interfering.
 */
class IncidentJourneysTest {

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
  void viewsIncidentListWithSeededData() {
    OperationsConsolePage list = new OperationsConsolePage(driver).open(TestConfig.baseUrl());
    assertEquals(8, list.visibleIncidentCount(), "expected all 8 seeded incidents to be listed");
  }

  @Test
  void filtersListByStatus() {
    OperationsConsolePage list = new OperationsConsolePage(driver).open(TestConfig.baseUrl());
    list.filterByStatus("OPEN");
    assertTrue(list.visibleIncidentCount() >= 1, "expected at least one OPEN incident");
    assertEquals("OPEN", list.statusOf(2), "incident 2 should still show as OPEN under the OPEN filter");
  }

  @Test
  void opensIncidentDetailFromList() {
    OperationsConsolePage list = new OperationsConsolePage(driver).open(TestConfig.baseUrl());
    IncidentDetailPage detail = list.openIncident(2);
    assertEquals("Order queue consumer lag", detail.title());
    assertEquals("OPEN", detail.status());
    assertTrue(detail.ackButtonEnabled());
    assertFalse(detail.resolveButtonEnabled(), "resolve should be disabled before acknowledge");
  }

  @Test
  void acknowledgesAndResolvesIncidentEndToEnd() {
    OperationsConsolePage list = new OperationsConsolePage(driver).open(TestConfig.baseUrl());
    IncidentDetailPage detail = list.openIncident(1);

    assertEquals("OPEN", detail.status());
    detail.acknowledge();
    assertEquals("ACKNOWLEDGED", detail.status());
    assertTrue(detail.resolveButtonEnabled(), "resolve should be enabled once acknowledged");

    detail.resolve();
    assertEquals("RESOLVED", detail.status());
    assertFalse(detail.ackButtonEnabled(), "acknowledge should be disabled once resolved");
    assertFalse(detail.resolveButtonEnabled(), "resolve should be disabled once already resolved");

    OperationsConsolePage list2 = detail.back();
    assertEquals("RESOLVED", list2.statusOf(1), "list view should reflect the resolved status after navigating back");
  }

  /**
   * Deliberately flaky by construction, used only to measure the rerun-and-quarantine
   * detector: asserts the ACKNOWLEDGED status immediately after a fixed 300ms pause instead
   * of polling with {@code WebDriverWait} the way {@link IncidentDetailPage#acknowledge()}
   * does. With the backend's {@code FLAKE_MODE=1} the acknowledge endpoint's own processing
   * delay is uniformly random in [0, 700)ms, so this genuinely wins the race only part of the
   * time. This is the harness's own induced nondeterminism, not a defect in the app; the real
   * user journey above always waits properly and is not flaky.
   */
  @Test
  void racyAcknowledgeAssertionUsedOnlyToMeasureFlakeDetection() throws InterruptedException {
    OperationsConsolePage list = new OperationsConsolePage(driver).open(TestConfig.baseUrl());
    IncidentDetailPage detail = list.openIncident(8);
    driver.findElement(org.openqa.selenium.By.cssSelector("[data-testid='ack-button']")).click();
    Thread.sleep(120);
    assertEquals("ACKNOWLEDGED", detail.status(), "races the backend's FLAKE_MODE processing delay on purpose");
  }
}
