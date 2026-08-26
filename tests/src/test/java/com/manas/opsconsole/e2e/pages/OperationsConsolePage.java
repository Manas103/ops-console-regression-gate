package com.manas.opsconsole.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Page object for the incident list / status filter view.
 */
public class OperationsConsolePage {

  private final WebDriver driver;
  private final WebDriverWait wait;

  public OperationsConsolePage(WebDriver driver) {
    this.driver = driver;
    this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
  }

  public OperationsConsolePage open(String baseUrl) {
    driver.get(baseUrl + "/");
    waitForListToSettle();
    return this;
  }

  /**
   * The list container renders synchronously, empty, before the fetch to
   * GET /api/incidents resolves; only afterwards do the &lt;li&gt; rows
   * appear. An earlier version of this page object waited only for the
   * container's presence, which raced ahead of the fetch on a fast test
   * (or a slow browser start) and threw NoSuchElementException from
   * openIncident(). Waiting for the loading indicator to clear (or, if
   * the fetch was already fast enough that it never appeared, for at
   * least one row to exist) removes that race.
   */
  private void waitForListToSettle() {
    wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("[data-testid='incident-list']")));
    wait.until(d -> d.findElements(By.cssSelector("[data-testid='list-loading']")).isEmpty());
  }

  public List<WebElement> incidentRows() {
    return driver.findElements(By.cssSelector("[data-testid^='incident-row-'][data-testid*='-']"))
        .stream()
        .filter(el -> el.getTagName().equals("li"))
        .collect(Collectors.toList());
  }

  public int visibleIncidentCount() {
    return driver.findElements(By.cssSelector("li[data-testid^='incident-row-']")).size();
  }

  public String statusOf(int incidentId) {
    return driver.findElement(By.cssSelector("[data-testid='incident-row-status-" + incidentId + "']")).getText();
  }

  public OperationsConsolePage filterByStatus(String status) {
    Select select = new Select(driver.findElement(By.cssSelector("[data-testid='status-filter']")));
    select.selectByValue(status);
    // Wait for the refetch triggered by the filter change to finish, then
    // for every visible row to match. Checking only "every row matches"
    // (without also waiting out the loading flicker) is vacuously true
    // the instant the old rows are cleared and the new ones have not yet
    // arrived, which is the same race fixed in waitForListToSettle above.
    wait.until(d -> d.findElements(By.cssSelector("[data-testid='list-loading']")).isEmpty());
    wait.until(d -> {
      List<WebElement> statusCells = d.findElements(By.cssSelector("li[data-testid^='incident-row-'] [data-testid*='status-']"));
      if ("ALL".equals(status)) return true;
      return !statusCells.isEmpty() && statusCells.stream().allMatch(el -> el.getText().equals(status));
    });
    return this;
  }

  public IncidentDetailPage openIncident(int incidentId) {
    driver.findElement(By.cssSelector("[data-testid='view-incident-" + incidentId + "']")).click();
    wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("[data-testid='incident-status']")));
    return new IncidentDetailPage(driver);
  }
}
