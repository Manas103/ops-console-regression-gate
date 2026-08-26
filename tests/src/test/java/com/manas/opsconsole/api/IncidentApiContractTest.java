package com.manas.opsconsole.api;

import com.manas.opsconsole.support.TestConfig;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * REST Assured contract tests against the real running backend (no
 * mocking). These sit beneath the Selenium journeys: they check status
 * codes, response shape, and state-machine transitions directly against
 * the API, independent of anything the React app does with the data.
 */
class IncidentApiContractTest {

  @BeforeAll
  static void setup() {
    RestAssured.baseURI = TestConfig.apiUrl();
  }

  @Test
  void healthEndpointReportsOk() {
    given().when().get("/health")
        .then().statusCode(200)
        .body("ok", is(true));
  }

  @Test
  void listReturnsSeededIncidentsWithExpectedShape() {
    given().when().get("/incidents")
        .then()
        .statusCode(200)
        .contentType(ContentType.JSON)
        .header("X-Total-Count", notNullValue())
        .body("size()", equalTo(8))
        .body("[0].id", notNullValue())
        .body("[0].title", not(emptyString()))
        .body("[0].severity", isOneOf("SEV1", "SEV2", "SEV3"))
        .body("status", everyItem(isOneOf("OPEN", "ACKNOWLEDGED", "RESOLVED")))
        .body("severity", everyItem(isOneOf("SEV1", "SEV2", "SEV3")))
        .body("createdAt", everyItem(matchesPattern("^\\d{4}-\\d{2}-\\d{2}T.*Z$")))
        .body("internalNotes", everyItem(nullValue()));
  }

  @Test
  void listIsSortedNewestFirst() {
    var createdAt = given().when().get("/incidents").then().extract().jsonPath().getList("createdAt", String.class);
    for (int i = 0; i + 1 < createdAt.size(); i++) {
      org.junit.jupiter.api.Assertions.assertTrue(
          createdAt.get(i).compareTo(createdAt.get(i + 1)) >= 0,
          "expected newest-first ordering, but " + createdAt.get(i) + " came before " + createdAt.get(i + 1));
    }
  }

  @Test
  void listFiltersByStatus() {
    given().queryParam("status", "OPEN").when().get("/incidents")
        .then().statusCode(200)
        .body("status", everyItem(equalTo("OPEN")));
  }

  @Test
  void listFiltersByStatusCaseInsensitively() {
    given().queryParam("status", "open").when().get("/incidents")
        .then().statusCode(200)
        .body("status", everyItem(equalTo("OPEN")));
  }

  @Test
  void listRejectsUnknownStatusValue() {
    given().queryParam("status", "NOT_A_STATUS").when().get("/incidents")
        .then().statusCode(400)
        .body("error", not(emptyString()));
  }

  @Test
  void listFiltersBySeverity() {
    given().queryParam("severity", "SEV1").when().get("/incidents")
        .then().statusCode(200)
        .body("severity", everyItem(equalTo("SEV1")));
  }

  @Test
  void listCombinesStatusAndSeverityWithAnd() {
    var results = given().queryParam("status", "OPEN").queryParam("severity", "SEV1")
        .when().get("/incidents").then().statusCode(200).extract().jsonPath().getList("$");
    for (Object item : results) {
      var map = (java.util.Map<?, ?>) item;
      org.junit.jupiter.api.Assertions.assertEquals("OPEN", map.get("status"));
      org.junit.jupiter.api.Assertions.assertEquals("SEV1", map.get("severity"));
    }
  }

  @Test
  void getSingleIncidentReturnsFullRecord() {
    given().when().get("/incidents/2")
        .then().statusCode(200)
        .body("id", equalTo(2))
        .body("description", not(emptyString()));
  }

  @Test
  void getUnknownIncidentReturns404() {
    given().when().get("/incidents/9999")
        .then().statusCode(404)
        .body("error", not(emptyString()));
  }

  @Test
  void getNonNumericIncidentIdReturns400() {
    given().when().get("/incidents/not-a-number")
        .then().statusCode(400);
  }

  @Test
  void unsupportedMethodOnIncidentResourceReturns405() {
    given().when().delete("/incidents/3")
        .then().statusCode(405);
  }

  @Test
  void ackTransitionsOpenIncidentToAcknowledged() {
    given().when().post("/incidents/3/ack")
        .then().statusCode(200)
        .body("status", equalTo("ACKNOWLEDGED"))
        .body("acknowledgedAt", notNullValue());
  }

  @Test
  void ackOnAlreadyAcknowledgedIncidentIsRejected() {
    given().when().post("/incidents/4/ack").then().statusCode(200);
    given().when().post("/incidents/4/ack")
        .then().statusCode(409)
        .body("error", not(emptyString()));
  }

  @Test
  void ackOnUnknownIncidentReturns404() {
    given().when().post("/incidents/9999/ack")
        .then().statusCode(404);
  }

  @Test
  void resolveRequiresAcknowledgedFirst() {
    given().when().post("/incidents/5/resolve")
        .then().statusCode(409)
        .body("error", not(emptyString()));
  }

  @Test
  void resolveTransitionsAcknowledgedIncidentToResolved() {
    given().when().post("/incidents/6/ack").then().statusCode(200);
    given().when().post("/incidents/6/resolve")
        .then().statusCode(200)
        .body("status", equalTo("RESOLVED"))
        .body("resolvedAt", notNullValue())
        .body("title", equalTo("Search index replica drift"));
  }

  @Test
  void resolveOnAlreadyResolvedIncidentIsRejected() {
    given().when().post("/incidents/7/ack").then().statusCode(200);
    given().when().post("/incidents/7/resolve").then().statusCode(200);
    given().when().post("/incidents/7/resolve")
        .then().statusCode(409)
        .body("error", not(emptyString()));
  }

  @Test
  void resolveOnUnknownIncidentReturns404() {
    given().when().post("/incidents/9999/resolve")
        .then().statusCode(404);
  }

  @Test
  void concurrentAcksOnSameIncidentOnlyOneSucceeds() throws Exception {
    // Incident 8 is untouched by any earlier test in this class run.
    int id = 8;
    java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(2);
    java.util.concurrent.Callable<Integer> ackCall = () ->
        given().when().post("/incidents/" + id + "/ack").then().extract().statusCode();

    var f1 = pool.submit(ackCall);
    var f2 = pool.submit(ackCall);
    int s1 = f1.get();
    int s2 = f2.get();
    pool.shutdown();

    long successes = java.util.stream.Stream.of(s1, s2).filter(s -> s == 200).count();
    long conflicts = java.util.stream.Stream.of(s1, s2).filter(s -> s == 409).count();

    org.junit.jupiter.api.Assertions.assertEquals(1, successes,
        "expected exactly one of two concurrent acks to succeed, got codes " + s1 + " and " + s2);
    org.junit.jupiter.api.Assertions.assertEquals(1, conflicts,
        "expected exactly one of two concurrent acks to be rejected, got codes " + s1 + " and " + s2);
  }
}
