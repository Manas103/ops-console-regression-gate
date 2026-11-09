package com.manas.opsconsole.api

import com.manas.opsconsole.support.TestConfig
import io.restassured.RestAssured
import io.restassured.http.ContentType
import spock.lang.Shared
import spock.lang.Specification

import static io.restassured.RestAssured.given

/**
 * The new Spock and Groovy specification layer: REST contract tests over the
 * payment checkout flow, the same "beneath the Selenium journeys" role
 * IncidentApiContractTest plays for the operations console, written in
 * Groovy against the exact same live backend instead of duplicating the
 * Java REST Assured style. Data-driven cases (where blocks) are the one
 * thing this layer does that the Java layer does not.
 */
class CheckoutApiContractSpec extends Specification {

  @Shared
  int cartTotalCents

  def setupSpec() {
    RestAssured.baseURI = TestConfig.apiUrl()
    cartTotalCents = given().when().get('/checkout/cart')
        .then().statusCode(200)
        .extract().path('totalCents')
  }

  def "cart endpoint reports a positive total over at least one item"() {
    expect:
    given().when().get('/checkout/cart')
        .then()
            .statusCode(200)
            .contentType(ContentType.JSON)
            .body('items.size()', org.hamcrest.Matchers.greaterThanOrEqualTo(1))
            .body('totalCents', org.hamcrest.Matchers.greaterThan(0))
  }

  def "paying the exact cart total with an ordinary card approves and returns an order"() {
    when:
    def response = given()
        .contentType(ContentType.JSON)
        .body([cardNumber: '4111111111111111', amountCents: cartTotalCents])
        .post('/checkout/pay')

    then:
    response.then()
        .statusCode(201)
        .body('status', org.hamcrest.Matchers.equalTo('APPROVED'))
        .body('cardLast4', org.hamcrest.Matchers.equalTo('1111'))
  }

  def "paying with the fixture decline card is a successful call that reports DECLINED"() {
    when:
    def response = given()
        .contentType(ContentType.JSON)
        .body([cardNumber: '4111111111110002', amountCents: cartTotalCents])
        .post('/checkout/pay')

    then:
    response.then()
        .statusCode(201)
        .body('status', org.hamcrest.Matchers.equalTo('DECLINED'))
  }

  def "an order created by a payment can be looked up by id afterward"() {
    given:
    int orderId = given()
        .contentType(ContentType.JSON)
        .body([cardNumber: '4222222222221111', amountCents: cartTotalCents])
        .post('/checkout/pay')
        .then().statusCode(201)
        .extract().path('id')

    expect:
    given().when().get("/checkout/orders/${orderId}")
        .then()
            .statusCode(200)
            .body('id', org.hamcrest.Matchers.equalTo(orderId))
  }

  def "an unknown order id returns 404"() {
    expect:
    given().when().get('/checkout/orders/999999')
        .then().statusCode(404)
  }

  def "malformed payment requests are rejected with 400, naming #scenario"() {
    expect:
    given()
        .contentType(ContentType.JSON)
        .body(body)
        .post('/checkout/pay')
        .then().statusCode(400)

    where:
    scenario                  | body
    'a non-numeric card'      | [cardNumber: 'not-a-card-number', amountCents: cartTotalCents]
    'a too-short card'        | [cardNumber: '4111', amountCents: cartTotalCents]
    'a zero amount'           | [cardNumber: '4111111111111111', amountCents: 0]
    'a negative amount'       | [cardNumber: '4111111111111111', amountCents: -500]
  }

  def "an amount that does not match the cart total is rejected with 409, not silently charged"() {
    expect:
    given()
        .contentType(ContentType.JSON)
        .body([cardNumber: '4111111111111111', amountCents: cartTotalCents + 1])
        .post('/checkout/pay')
        .then().statusCode(409)
  }
}
