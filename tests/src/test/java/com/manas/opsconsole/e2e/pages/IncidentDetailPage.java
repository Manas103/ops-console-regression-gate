package com.manas.opsconsole.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/**
 * Page object for the incident detail view: status, acknowledge, resolve.
 */
public class IncidentDetailPage {

  private final WebDriver driver;
  private final WebDriverWait wait;

  public IncidentDetailPage(WebDriver driver) {
    this.driver = driver;
    this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
  }

  public String title() {
    return driver.findElement(By.cssSelector("[data-testid='incident-detail'] h2")).getText();
  }

  public String status() {
    return driver.findElement(By.cssSelector("[data-testid='incident-status']")).getText();
  }

  public boolean ackButtonEnabled() {
    return driver.findElement(By.cssSelector("[data-testid='ack-button']")).isEnabled();
  }

  public boolean resolveButtonEnabled() {
    return driver.findElement(By.cssSelector("[data-testid='resolve-button']")).isEnabled();
  }

  public IncidentDetailPage acknowledge() {
    driver.findElement(By.cssSelector("[data-testid='ack-button']")).click();
    wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid='incident-status']"), "ACKNOWLEDGED"));
    return this;
  }

  public IncidentDetailPage resolve() {
    driver.findElement(By.cssSelector("[data-testid='resolve-button']")).click();
    wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid='incident-status']"), "RESOLVED"));
    return this;
  }

  public OperationsConsolePage back() {
    driver.findElement(By.cssSelector("[data-testid='back-to-list']")).click();
    wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("[data-testid='incident-list']")));
    return new OperationsConsolePage(driver);
  }
}
