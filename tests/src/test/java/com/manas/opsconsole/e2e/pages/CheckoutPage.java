package com.manas.opsconsole.e2e.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

/**
 * Page object for the payment checkout flow: the cart view and the resulting
 * order confirmation, alongside the operations-console journeys above.
 */
public class CheckoutPage {

  private final WebDriver driver;
  private final WebDriverWait wait;

  public CheckoutPage(WebDriver driver) {
    this.driver = driver;
    this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
  }

  public CheckoutPage open(String baseUrl) {
    driver.get(baseUrl + "/");
    driver.findElement(By.cssSelector("[data-testid='nav-checkout']")).click();
    wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector("[data-testid='checkout-cart']")));
    return this;
  }

  public String cartTotalText() {
    return driver.findElement(By.cssSelector("[data-testid='cart-total']")).getText();
  }

  public CheckoutPage enterCardNumber(String cardNumber) {
    var input = driver.findElement(By.cssSelector("[data-testid='card-number-input']"));
    input.clear();
    input.sendKeys(cardNumber);
    return this;
  }

  public CheckoutPage pay() {
    driver.findElement(By.cssSelector("[data-testid='pay-button']")).click();
    wait.until(d -> !d.findElements(By.cssSelector("[data-testid='order-confirmation']")).isEmpty()
        || !d.findElements(By.cssSelector("[data-testid='checkout-error']")).isEmpty());
    return this;
  }

  public boolean hasConfirmation() {
    return !driver.findElements(By.cssSelector("[data-testid='order-confirmation']")).isEmpty();
  }

  public String orderStatus() {
    return driver.findElement(By.cssSelector("[data-testid='order-status']")).getText();
  }

  public String errorText() {
    return driver.findElement(By.cssSelector("[data-testid='checkout-error']")).getText();
  }
}
