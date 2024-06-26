package org.openmetadata.service.resources.events;

import static javax.ws.rs.core.Response.Status.CONFLICT;
import static javax.ws.rs.core.Response.Status.NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hibernate.validator.internal.util.Contracts.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.openmetadata.schema.entity.events.SubscriptionStatus.Status.ACTIVE;
import static org.openmetadata.schema.entity.events.SubscriptionStatus.Status.AWAITING_RETRY;
import static org.openmetadata.schema.entity.events.SubscriptionStatus.Status.DISABLED;
import static org.openmetadata.schema.entity.events.SubscriptionStatus.Status.FAILED;
import static org.openmetadata.service.util.EntityUtil.fieldUpdated;
import static org.openmetadata.service.util.TestUtils.ADMIN_AUTH_HEADERS;
import static org.openmetadata.service.util.TestUtils.UpdateType.MINOR_UPDATE;
import static org.openmetadata.service.util.TestUtils.assertResponse;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.Response;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.HttpResponseException;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.TestMethodOrder;
import org.openmetadata.schema.api.events.AlertFilteringInput;
import org.openmetadata.schema.api.events.CreateEventSubscription;
import org.openmetadata.schema.entity.events.Argument;
import org.openmetadata.schema.entity.events.ArgumentsInput;
import org.openmetadata.schema.entity.events.EventSubscription;
import org.openmetadata.schema.entity.events.FilteringRules;
import org.openmetadata.schema.entity.events.SubscriptionDestination;
import org.openmetadata.schema.entity.events.SubscriptionStatus;
import org.openmetadata.schema.type.ChangeDescription;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.schema.type.EventType;
import org.openmetadata.schema.type.Webhook;
import org.openmetadata.service.Entity;
import org.openmetadata.service.apps.bundles.changeEvent.msteams.TeamsMessage;
import org.openmetadata.service.apps.bundles.changeEvent.slack.SlackMessage;
import org.openmetadata.service.events.subscription.AlertUtil;
import org.openmetadata.service.resources.EntityResourceTest;
import org.openmetadata.service.resources.events.subscription.EventSubscriptionResource;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.TestUtils;

@Slf4j
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class EventSubscriptionResourceTest
    extends EntityResourceTest<EventSubscription, CreateEventSubscription> {
  private static final UUID DESTINATION_ID = UUID.randomUUID();
  public static final FilteringRules PASS_ALL_FILTERING =
      new FilteringRules().withResources(List.of("all"));

  public EventSubscriptionResourceTest() {
    super(
        Entity.EVENT_SUBSCRIPTION,
        EventSubscription.class,
        EventSubscriptionResource.EventSubscriptionList.class,
        "events/subscriptions",
        EventSubscriptionResource.FIELDS);
    supportedNameCharacters = supportedNameCharacters.replace(" ", ""); // Space not supported
    supportsFieldsQueryParam = false;
  }

  @Test
  void post_alertActionWithEnabledStateChange(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    LOG.info("creating webhook in disabled state");
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/" + webhookName;
    // Create a Disabled Generic Webhook
    CreateEventSubscription genericWebhookActionRequest =
        createRequest(webhookName).withEnabled(false).withDestinations(getWebhook(uri));
    EventSubscription alert = createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);
    // For the DISABLED Publisher are not available, so it will have no status
    SubscriptionStatus status = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(DISABLED, status.getStatus());
    WebhookCallbackResource.EventDetails details =
        webhookCallbackResource.getEventDetails(webhookName);
    assertNull(details);
    //
    // Now enable the webhook
    //
    LOG.info("Enabling webhook Action");
    ChangeDescription change = getChangeDescription(alert, MINOR_UPDATE);
    fieldUpdated(change, "enabled", false, true);
    fieldUpdated(change, "batchSize", 10, 50);
    genericWebhookActionRequest.withEnabled(true).withBatchSize(50);

    alert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);

    SubscriptionStatus status2 = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status2.getStatus());

    // Ensure the call back notification has started
    details = waitForFirstEvent(alert.getId(), webhookName, 25);
    assertEquals(1, details.getEvents().size());
    SubscriptionStatus successDetails =
        getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, successDetails.getStatus());
    assertNull(successDetails.getLastFailedAt());
    //
    // Disable the webhook and ensure notification is disabled
    //
    LOG.info("Disabling webhook");
    genericWebhookActionRequest.withEnabled(false);
    change = getChangeDescription(alert, MINOR_UPDATE);
    fieldUpdated(change, "enabled", true, false);

    // Disabled webhook state is DISABLED
    alert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);
    SubscriptionStatus status3 = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(DISABLED, status3.getStatus());

    int iterations = 0;
    while (iterations < 10) {
      Awaitility.await().atLeast(Duration.ofMillis(100L)).untilTrue(new AtomicBoolean(true));
      iterations++;
      assertEquals(1, details.getEvents().size()); // Event counter remains the same
    }

    deleteEntity(alert.getId(), ADMIN_AUTH_HEADERS);
  }

  @Test
  void put_updateEndpointURL(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    String uri = "http://invalidUnknowHost";
    List<SubscriptionDestination> genericWebhook = getWebhook(uri);
    CreateEventSubscription genericWebhookActionRequest =
        createRequest(webhookName)
            .withEnabled(true)
            .withDestinations(genericWebhook)
            .withRetries(0);
    EventSubscription alert = createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);

    // Wait for webhook to be marked as failed
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), FAILED));

    SubscriptionStatus status = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(FAILED, status.getStatus());

    // Now change the webhook URL to a valid URL and ensure callbacks resume
    String baseUri =
        "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/" + test.getDisplayName();
    List<SubscriptionDestination> genericWebhook2 = getWebhook(baseUri);
    genericWebhookActionRequest = genericWebhookActionRequest.withDestinations(genericWebhook2);
    ChangeDescription change = getChangeDescription(alert, MINOR_UPDATE);
    fieldUpdated(change, "destinations", genericWebhook, genericWebhook2);

    alert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);

    // Wait for webhook to be marked as failed
    waitForAllEventToComplete(alert.getId());
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    SubscriptionStatus status2 = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status2.getStatus());
    deleteEntity(alert.getId(), ADMIN_AUTH_HEADERS);
  }

  public void waitForAllEventToComplete(UUID alertId) throws HttpResponseException {
    boolean result;
    do {
      WebTarget target =
          getResource(String.format("%s/%s/processedEvents", collectionName, alertId.toString()));
      result = TestUtils.getWithResponse(target, Boolean.class, ADMIN_AUTH_HEADERS, 200);
      LOG.info("waitForAllEventToComplete alertId: {} , result: {}", alertId, result);
      try {
        Thread.sleep(3000L);
      } catch (InterruptedException e) {
        LOG.error("waitForAllEventToComplete InterruptedException: {}", e.getMessage());
      }
    } while (!result);
  }

  @Test
  void put_updateAlertUpdateFields(TestInfo test) throws IOException {
    //
    String alertName = "filterUpdate";
    // Alert Action
    String endpoint =
        "http://localhost:"
            + APP.getLocalPort()
            + "/api/v1/test/webhook/counter/"
            + test.getDisplayName();
    CreateEventSubscription genericWebhookActionRequest =
        createRequest(alertName)
            .withDestinations(getWebhook(endpoint))
            .withResources(List.of("all"));

    AlertFilteringInput rule1 =
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(List.of("entityCreated"))))));

    AlertFilteringInput rule2 =
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(
                                        List.of(
                                            "entityCreated", "entityUpdated", "entityDeleted"))))));

    AlertFilteringInput rule3 =
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(List.of("entityUpdated", "entityDeleted"))))));

    AlertFilteringInput rule4 =
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(List.of("entityUpdated"))))));

    // Set Filter Rules
    genericWebhookActionRequest.withInput(rule1);
    EventSubscription createdAlert =
        createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);

    // Rule 2
    ChangeDescription change = getChangeDescription(createdAlert, MINOR_UPDATE);
    fieldUpdated(change, "input", rule1, rule2);
    genericWebhookActionRequest.withInput(rule2);
    fieldUpdated(
        change,
        "filteringRules",
        createdAlert.getFilteringRules(),
        AlertUtil.validateAndBuildFilteringConditions(
            genericWebhookActionRequest.getResources(),
            genericWebhookActionRequest.getAlertType(),
            genericWebhookActionRequest.getInput()));

    createdAlert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);

    // Rule 3
    change = getChangeDescription(createdAlert, MINOR_UPDATE);
    fieldUpdated(change, "input", rule2, rule3);
    genericWebhookActionRequest.withInput(rule3);
    fieldUpdated(
        change,
        "filteringRules",
        createdAlert.getFilteringRules(),
        AlertUtil.validateAndBuildFilteringConditions(
            genericWebhookActionRequest.getResources(),
            genericWebhookActionRequest.getAlertType(),
            genericWebhookActionRequest.getInput()));

    createdAlert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);

    // Rule 4
    change = getChangeDescription(createdAlert, MINOR_UPDATE);
    fieldUpdated(change, "input", rule3, rule4);
    genericWebhookActionRequest.withInput(rule4);
    fieldUpdated(
        change,
        "filteringRules",
        createdAlert.getFilteringRules(),
        AlertUtil.validateAndBuildFilteringConditions(
            genericWebhookActionRequest.getResources(),
            genericWebhookActionRequest.getAlertType(),
            genericWebhookActionRequest.getInput()));

    createdAlert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);

    // Delete Action and Alert
    deleteEntity(createdAlert.getId(), ADMIN_AUTH_HEADERS);
  }

  @Test
  void testDifferentTypesOfAlerts() throws IOException {
    // Create multiple webhooks each with different type of response to callback
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook";

    // SlowServer
    String alertName = "slowServer";
    // Alert Action
    List<SubscriptionDestination> w1 =
        getWebhook(baseUri + "/simulate/slowServer"); // Callback response 1 second slower
    CreateEventSubscription w1ActionRequest = createRequest(alertName).withDestinations(w1);
    EventSubscription w1Alert = createAndCheckEntity(w1ActionRequest, ADMIN_AUTH_HEADERS);

    // CallbackTimeout
    alertName = "callbackTimeout";
    List<SubscriptionDestination> w2 =
        getWebhook(baseUri + "/simulate/timeout"); // Callback response 12 seconds slower
    CreateEventSubscription w2ActionRequest = createRequest(alertName).withDestinations(w2);
    EventSubscription w2Alert = createAndCheckEntity(w2ActionRequest, ADMIN_AUTH_HEADERS);

    // callbackResponse300
    alertName = "callbackResponse300";
    List<SubscriptionDestination> w3 = getWebhook(baseUri + "/simulate/300"); // 3xx response
    CreateEventSubscription w3ActionRequest = createRequest(alertName).withDestinations(w3);
    EventSubscription w3Alert = createAndCheckEntity(w3ActionRequest, ADMIN_AUTH_HEADERS);

    // callbackResponse400
    alertName = "callbackResponse400";
    List<SubscriptionDestination> w4 = getWebhook(baseUri + "/simulate/400"); // 3xx response
    CreateEventSubscription w4ActionRequest = createRequest(alertName).withDestinations(w4);
    EventSubscription w4Alert = createAndCheckEntity(w4ActionRequest, ADMIN_AUTH_HEADERS);

    // callbackResponse500
    alertName = "callbackResponse500";
    List<SubscriptionDestination> w5 = getWebhook(baseUri + "/simulate/500"); // 3xx response
    CreateEventSubscription w5ActionRequest = createRequest(alertName).withDestinations(w5);
    EventSubscription w5Alert = createAndCheckEntity(w5ActionRequest, ADMIN_AUTH_HEADERS);

    // invalidEndpoint
    alertName = "invalidEndpoint";
    List<SubscriptionDestination> w6 = getWebhook("http://invalidUnknownHost"); // 3xx response
    CreateEventSubscription w6ActionRequest = createRequest(alertName).withDestinations(w6);
    EventSubscription w6Alert = createAndCheckEntity(w6ActionRequest, ADMIN_AUTH_HEADERS);

    // Now check state of webhooks created
    WebhookCallbackResource.EventDetails details =
        waitForFirstEvent(w1Alert.getId(), "simulate-slowServer", 25);
    ConcurrentLinkedQueue<ChangeEvent> callbackEvents = details.getEvents();
    assertNotNull(callbackEvents);
    assertNotNull(callbackEvents.peek());

    waitAndCheckForEvents(
        w1Alert.getId(),
        "*",
        "*",
        "*",
        "*",
        callbackEvents.peek().getTimestamp(),
        callbackEvents,
        30);

    // Check all webhook status
    assertAlertStatusSuccessWithId(w1Alert.getId());
    assertAlertStatus(w3Alert.getId(), FAILED, 301, "Moved Permanently");
    assertAlertStatus(w4Alert.getId(), AWAITING_RETRY, 400, "Bad Request");
    assertAlertStatus(w5Alert.getId(), AWAITING_RETRY, 500, "Internal Server Error");

    // Delete all webhooks
    deleteEntity(w1Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w2Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w3Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w4Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w5Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w6Alert.getId(), ADMIN_AUTH_HEADERS);
  }

  @Test
  public void post_createAndValidateEventSubscription(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/" + webhookName;

    CreateEventSubscription enabledWebhookRequest =
        new CreateEventSubscription()
            .withName(webhookName)
            .withResources(List.of("all"))
            .withDestinations(getWebhook(uri))
            .withEnabled(true)
            .withBatchSize(10)
            .withRetries(0)
            .withPollInterval(1)
            .withAlertType(CreateEventSubscription.AlertType.NOTIFICATION);

    EventSubscription alert = createEntity(enabledWebhookRequest, ADMIN_AUTH_HEADERS);

    assertNotNull(alert, "Webhook creation failed");

    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    SubscriptionStatus status = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status.getStatus());

    waitForAllEventToComplete(alert.getId());
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    validateCreatedEntity(alert, enabledWebhookRequest, ADMIN_AUTH_HEADERS);
  }

  @Test
  public void post_duplicateAlertsAreNotAllowed(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/" + webhookName;

    CreateEventSubscription genericWebhookRequest =
        new CreateEventSubscription()
            .withName(webhookName)
            .withResources(List.of("all"))
            .withDestinations(getWebhook(uri))
            .withEnabled(true)
            .withBatchSize(10)
            .withRetries(0)
            .withPollInterval(1)
            .withAlertType(CreateEventSubscription.AlertType.NOTIFICATION);

    EventSubscription alert = createAndCheckEntity(genericWebhookRequest, ADMIN_AUTH_HEADERS);

    assertNotNull(alert, "Webhook creation failed");

    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    SubscriptionStatus status1 = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status1.getStatus());

    assertResponse(
        () -> createAndCheckEntity(genericWebhookRequest, ADMIN_AUTH_HEADERS),
        CONFLICT,
        "Entity already exists");
  }

  @Test
  public void delete_eventSubscription(TestInfo test) throws IOException {
    CreateEventSubscription webhookRequest =
        new CreateEventSubscription()
            .withName(getEntityName(test))
            .withResources(List.of("all"))
            .withEnabled(true)
            .withBatchSize(10)
            .withRetries(0)
            .withPollInterval(1)
            .withAlertType(CreateEventSubscription.AlertType.NOTIFICATION);

    EventSubscription alert = createAndCheckEntity(webhookRequest, ADMIN_AUTH_HEADERS);
    deleteEntity(alert.getId(), ADMIN_AUTH_HEADERS);
  }

  @Test
  public void get_testFetchEventSubscription(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    CreateEventSubscription genericWebhookRequest = createRequest(webhookName);
    EventSubscription alert = createAndCheckEntity(genericWebhookRequest, ADMIN_AUTH_HEADERS);
    assertNotNull(alert, "Webhook creation failed");

    waitForAllEventToComplete(alert.getId());
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    // Fetch the alert by ID and assert its properties
    EventSubscription fetchedAlertById = getAndAssertAlert(alert.getId(), alert);

    // Fetch the alert by fully qualified name and assert its properties
    EventSubscription fetchedAlertByName =
        getAndAssertAlertByName(alert.getFullyQualifiedName(), alert);
  }

  @Test
  void get_checkSubscriptionStatusById(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    String uri =
        "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/" + test.getDisplayName();

    List<SubscriptionDestination> genericWebhook = getWebhook(uri);
    CreateEventSubscription genericWebhookActionRequest =
        createRequest(webhookName)
            .withEnabled(true)
            .withDestinations(genericWebhook)
            .withRetries(0);

    EventSubscription alert = createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);
    assertNotNull(alert, "Webhook creation failed");

    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    SubscriptionStatus status = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status.getStatus());
  }

  @Test
  public void get_fetchEventSubscription_ByInvalidId_returns404() {
    UUID wrongAlertId =
        new UUID(System.currentTimeMillis(), UUID.randomUUID().getMostSignificantBits());

    // Assert that the status code is 404 (Not Found)
    assertResponse(
        () -> getEntity(wrongAlertId, ADMIN_AUTH_HEADERS),
        NOT_FOUND,
        String.format("eventsubscription instance for %s not found", wrongAlertId));
  }

  @Test
  public void post_createAndValidateEventSubscription_SLACK(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/slack/" + webhookName;

    CreateEventSubscription enabledWebhookRequest =
        new CreateEventSubscription()
            .withName(webhookName)
            .withResources(List.of("all"))
            .withDestinations(getSlackWebhook(uri))
            .withEnabled(true)
            .withBatchSize(10)
            .withRetries(0)
            .withPollInterval(1)
            .withAlertType(CreateEventSubscription.AlertType.NOTIFICATION);

    EventSubscription alert = createEntity(enabledWebhookRequest, ADMIN_AUTH_HEADERS);
    waitForAllEventToComplete(alert.getId());
    SlackCallbackResource.EventDetails details = slackCallbackResource.getEventDetails(webhookName);
    ConcurrentLinkedQueue<SlackMessage> events = details.getEvents();
    for (SlackMessage event : events) {
      validateSlackMessage(alert, event);
    }

    assertNotNull(alert, "Webhook creation failed");

    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    SubscriptionStatus status = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status.getStatus());

    waitForAllEventToComplete(alert.getId());
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    validateCreatedEntity(alert, enabledWebhookRequest, ADMIN_AUTH_HEADERS);
  }

  @Test
  void post_alertActionWithEnabledStateChange_SLACK(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    LOG.info("creating webhook in disabled state");
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/slack/" + webhookName;

    // Create a Disabled Generic Webhook
    CreateEventSubscription genericWebhookActionRequest =
        createRequest(webhookName).withEnabled(false).withDestinations(getSlackWebhook(uri));
    EventSubscription alert = createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);

    // For the DISABLED Publisher are not available, so it will have no status
    SubscriptionStatus status = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(DISABLED, status.getStatus());
    SlackCallbackResource.EventDetails details = slackCallbackResource.getEventDetails(webhookName);
    assertNull(details);

    LOG.info("Enabling webhook Action");
    ChangeDescription change = getChangeDescription(alert, MINOR_UPDATE);
    fieldUpdated(change, "enabled", false, true);
    fieldUpdated(change, "batchSize", 10, 50);
    genericWebhookActionRequest.withEnabled(true).withBatchSize(50);

    alert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);

    SubscriptionStatus status2 = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status2.getStatus());

    // Ensure the call back notification has started
    details = waitForFirstSlackEvent(alert.getId(), webhookName, 25);
    assertEquals(1, details.getEvents().size());
    ConcurrentLinkedQueue<SlackMessage> messages = details.getEvents();
    for (SlackMessage sm : messages) {
      validateSlackMessage(alert, sm);
    }

    SubscriptionStatus successDetails =
        getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, successDetails.getStatus());
    assertNull(successDetails.getLastFailedAt());

    // Disable the webhook and ensure notification is disabled
    LOG.info("Disabling webhook");
    genericWebhookActionRequest.withEnabled(false);
    change = getChangeDescription(alert, MINOR_UPDATE);
    fieldUpdated(change, "enabled", true, false);

    // Disabled webhook state is DISABLED
    alert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);
    SubscriptionStatus status3 = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(DISABLED, status3.getStatus());

    int iterations = 0;
    while (iterations < 10) {
      Awaitility.await().atLeast(Duration.ofMillis(100L)).untilTrue(new AtomicBoolean(true));
      iterations++;
      assertEquals(1, details.getEvents().size()); // Event counter remains the same
    }

    deleteEntity(alert.getId(), ADMIN_AUTH_HEADERS);
  }

  @Test
  void testDifferentTypesOfAlerts_SLACK() throws IOException {
    // Create multiple webhooks each with different type of response to callback
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/slack";

    // SlowServer
    String alertName = "slowServer";
    // Alert Action
    List<SubscriptionDestination> w1 =
        getSlackWebhook(baseUri + "/simulate/slowServer"); // Callback response 1 second slower
    CreateEventSubscription w1ActionRequest = createRequest(alertName).withDestinations(w1);
    EventSubscription w1Alert = createAndCheckEntity(w1ActionRequest, ADMIN_AUTH_HEADERS);

    // CallbackTimeout
    alertName = "callbackTimeout";
    List<SubscriptionDestination> w2 =
        getSlackWebhook(baseUri + "/simulate/timeout"); // Callback response 12 seconds slower
    CreateEventSubscription w2ActionRequest = createRequest(alertName).withDestinations(w2);
    EventSubscription w2Alert = createAndCheckEntity(w2ActionRequest, ADMIN_AUTH_HEADERS);

    // callbackResponse300
    alertName = "callbackResponse300";
    List<SubscriptionDestination> w3 = getSlackWebhook(baseUri + "/simulate/300"); // 3xx response
    CreateEventSubscription w3ActionRequest = createRequest(alertName).withDestinations(w3);
    EventSubscription w3Alert = createAndCheckEntity(w3ActionRequest, ADMIN_AUTH_HEADERS);

    // callbackResponse400
    alertName = "callbackResponse400";
    List<SubscriptionDestination> w4 = getSlackWebhook(baseUri + "/simulate/400"); // 3xx response
    CreateEventSubscription w4ActionRequest = createRequest(alertName).withDestinations(w4);
    EventSubscription w4Alert = createAndCheckEntity(w4ActionRequest, ADMIN_AUTH_HEADERS);

    // callbackResponse500
    alertName = "callbackResponse500";
    List<SubscriptionDestination> w5 = getSlackWebhook(baseUri + "/simulate/500"); // 3xx response
    CreateEventSubscription w5ActionRequest = createRequest(alertName).withDestinations(w5);
    EventSubscription w5Alert = createAndCheckEntity(w5ActionRequest, ADMIN_AUTH_HEADERS);

    // invalidEndpoint
    alertName = "invalidEndpoint";
    List<SubscriptionDestination> w6 = getSlackWebhook("http://invalidUnknownHost"); // 3xx response
    CreateEventSubscription w6ActionRequest = createRequest(alertName).withDestinations(w6);
    EventSubscription w6Alert = createAndCheckEntity(w6ActionRequest, ADMIN_AUTH_HEADERS);

    // Now check state of webhooks created
    SlackCallbackResource.EventDetails details =
        waitForFirstSlackEvent(w1Alert.getId(), "simulate-slowServer", 25);

    Awaitility.await()
        .pollInterval(Duration.ofMillis(10000L))
        .atMost(Duration.ofMillis(10 * 1000L));

    ConcurrentLinkedQueue<SlackMessage> callbackEvents = details.getEvents();
    assertNotNull(callbackEvents);

    // Check all webhook status
    assertAlertStatusSuccessWithId(w1Alert.getId());
    assertAlertStatus(w3Alert.getId(), FAILED, 301, "Moved Permanently");
    assertAlertStatus(w4Alert.getId(), AWAITING_RETRY, 400, "Bad Request");
    assertAlertStatus(w5Alert.getId(), AWAITING_RETRY, 500, "Internal Server Error");

    // Delete all webhooks
    deleteEntity(w1Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w2Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w3Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w4Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w5Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w6Alert.getId(), ADMIN_AUTH_HEADERS);
  }

  @Test
  public void post_createAndValidateEventSubscription_MSTEAMS(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/msteams/" + webhookName;

    CreateEventSubscription enabledWebhookRequest =
        new CreateEventSubscription()
            .withName(webhookName)
            .withResources(List.of("all"))
            .withDestinations(getTeamsWebhook(uri))
            .withEnabled(true)
            .withBatchSize(10)
            .withRetries(0)
            .withPollInterval(1)
            .withAlertType(CreateEventSubscription.AlertType.NOTIFICATION);

    EventSubscription alert = createEntity(enabledWebhookRequest, ADMIN_AUTH_HEADERS);
    waitForAllEventToComplete(alert.getId());
    MSTeamsCallbackResource.EventDetails details =
        teamsCallbackResource.getEventDetails(webhookName);

    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    assertNotNull(alert, "Webhook creation failed");
    ConcurrentLinkedQueue<TeamsMessage> events = details.getEvents();
    for (TeamsMessage teamsMessage : events) {
      validateTeamsMessage(alert, teamsMessage);
    }

    SubscriptionStatus status = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status.getStatus());

    waitForAllEventToComplete(alert.getId());
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(100 * 100L))
        .untilTrue(testExpectedStatus(alert.getId(), ACTIVE));

    validateCreatedEntity(alert, enabledWebhookRequest, ADMIN_AUTH_HEADERS);
  }

  @Test
  void post_alertActionWithEnabledStateChange_MSTeams(TestInfo test) throws IOException {
    String webhookName = getEntityName(test);
    LOG.info("creating webhook in disabled state");
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/msteams/" + webhookName;

    // Create a Disabled Generic Webhook
    CreateEventSubscription genericWebhookActionRequest =
        createRequest(webhookName).withEnabled(false).withDestinations(getTeamsWebhook(uri));
    EventSubscription alert = createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);

    // For the DISABLED Publisher are not available, so it will have no status
    SubscriptionStatus status = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(DISABLED, status.getStatus());
    MSTeamsCallbackResource.EventDetails details =
        teamsCallbackResource.getEventDetails(webhookName);
    assertNull(details);

    LOG.info("Enabling webhook Action");
    ChangeDescription change = getChangeDescription(alert, MINOR_UPDATE);
    fieldUpdated(change, "enabled", false, true);
    fieldUpdated(change, "batchSize", 10, 50);
    genericWebhookActionRequest.withEnabled(true).withBatchSize(50);

    alert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);

    SubscriptionStatus status2 = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status2.getStatus());

    // Ensure the call back notification has started
    details = waitForFirstMSTeamsEvent(alert.getId(), webhookName, 25);
    assertEquals(1, details.getEvents().size());
    ConcurrentLinkedQueue<TeamsMessage> messages = details.getEvents();
    for (TeamsMessage teamsMessage : messages) {
      validateTeamsMessage(alert, teamsMessage);
    }

    SubscriptionStatus successDetails =
        getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, successDetails.getStatus());
    assertNull(successDetails.getLastFailedAt());

    // Disable the webhook and ensure notification is disabled
    LOG.info("Disabling webhook");
    genericWebhookActionRequest.withEnabled(false);
    change = getChangeDescription(alert, MINOR_UPDATE);
    fieldUpdated(change, "enabled", true, false);

    // Disabled webhook state is DISABLED
    alert =
        updateAndCheckEntity(
            genericWebhookActionRequest,
            Response.Status.OK,
            ADMIN_AUTH_HEADERS,
            MINOR_UPDATE,
            change);
    SubscriptionStatus status3 = getStatus(alert.getId(), Response.Status.OK.getStatusCode());
    assertEquals(DISABLED, status3.getStatus());

    int iterations = 0;
    while (iterations < 10) {
      Awaitility.await().atLeast(Duration.ofMillis(100L)).untilTrue(new AtomicBoolean(true));
      iterations++;
      assertEquals(1, details.getEvents().size()); // Event counter remains the same
    }

    deleteEntity(alert.getId(), ADMIN_AUTH_HEADERS);
  }

  @Test
  void testDifferentTypesOfAlerts_MSTeams() throws IOException {
    // Create multiple webhooks each with different type of response to callback
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/msteams";

    // SlowServer
    String alertName = "slowServer";
    // Alert Action
    List<SubscriptionDestination> w1 =
        getTeamsWebhook(baseUri + "/simulate/slowServer"); // Callback response 1 second slower
    CreateEventSubscription w1ActionRequest = createRequest(alertName).withDestinations(w1);
    EventSubscription w1Alert = createAndCheckEntity(w1ActionRequest, ADMIN_AUTH_HEADERS);

    // CallbackTimeout
    alertName = "callbackTimeout";
    List<SubscriptionDestination> w2 =
        getTeamsWebhook(baseUri + "/simulate/timeout"); // Callback response 12 seconds slower
    CreateEventSubscription w2ActionRequest = createRequest(alertName).withDestinations(w2);
    EventSubscription w2Alert = createAndCheckEntity(w2ActionRequest, ADMIN_AUTH_HEADERS);

    // callbackResponse300
    alertName = "callbackResponse300";
    List<SubscriptionDestination> w3 = getTeamsWebhook(baseUri + "/simulate/300"); // 3xx response
    CreateEventSubscription w3ActionRequest = createRequest(alertName).withDestinations(w3);
    EventSubscription w3Alert = createAndCheckEntity(w3ActionRequest, ADMIN_AUTH_HEADERS);

    // callbackResponse400
    alertName = "callbackResponse400";
    List<SubscriptionDestination> w4 = getTeamsWebhook(baseUri + "/simulate/400"); // 3xx response
    CreateEventSubscription w4ActionRequest = createRequest(alertName).withDestinations(w4);
    EventSubscription w4Alert = createAndCheckEntity(w4ActionRequest, ADMIN_AUTH_HEADERS);

    // callbackResponse500
    alertName = "callbackResponse500";
    List<SubscriptionDestination> w5 = getTeamsWebhook(baseUri + "/simulate/500"); // 3xx response
    CreateEventSubscription w5ActionRequest = createRequest(alertName).withDestinations(w5);
    EventSubscription w5Alert = createAndCheckEntity(w5ActionRequest, ADMIN_AUTH_HEADERS);

    // invalidEndpoint
    alertName = "invalidEndpoint";
    List<SubscriptionDestination> w6 = getTeamsWebhook("http://invalidUnknownHost"); // 3xx response
    CreateEventSubscription w6ActionRequest = createRequest(alertName).withDestinations(w6);
    EventSubscription w6Alert = createAndCheckEntity(w6ActionRequest, ADMIN_AUTH_HEADERS);

    // Now check state of webhooks created
    MSTeamsCallbackResource.EventDetails details =
        waitForFirstMSTeamsEvent(w1Alert.getId(), "simulate-slowServer", 25);

    Awaitility.await()
        .pollInterval(Duration.ofMillis(10000L))
        .atMost(Duration.ofMillis(10 * 1000L));

    ConcurrentLinkedQueue<TeamsMessage> callbackEvents = details.getEvents();
    assertNotNull(callbackEvents);

    // Check all webhook status
    assertAlertStatusSuccessWithId(w1Alert.getId());
    assertAlertStatus(w3Alert.getId(), FAILED, 301, "Moved Permanently");
    assertAlertStatus(w4Alert.getId(), AWAITING_RETRY, 400, "Bad Request");
    assertAlertStatus(w5Alert.getId(), AWAITING_RETRY, 500, "Internal Server Error");

    // Delete all webhooks
    deleteEntity(w1Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w2Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w3Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w4Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w5Alert.getId(), ADMIN_AUTH_HEADERS);
    deleteEntity(w6Alert.getId(), ADMIN_AUTH_HEADERS);
  }

  private void validateSlackMessage(EventSubscription alert, SlackMessage slackMessage) {
    // Validate the basic structure
    assertNotNull(slackMessage.getUsername(), "Username should not be null");
    assertNotNull(slackMessage.getText(), "Text should not be null");
    assertFalse(slackMessage.getText().isEmpty(), "Text should not be empty");

    // Validate the formatting of the text
    String expectedTextFormat = buildExpectedTextFormatSlack(alert); // Get the expected format

    // Check if the actual text matches the expected format
    String actualText = slackMessage.getText();
    assertEquals(
        actualText, expectedTextFormat, "Slack message text does not match expected format");
  }

  private String buildExpectedTextFormatSlack(EventSubscription alert) {
    String updatedBy = alert.getUpdatedBy();
    return String.format(
        "%s posted on " + Entity.EVENT_SUBSCRIPTION + " %s", updatedBy, getEntityUrlSlack(alert));
  }

  private String getEntityUrlSlack(EventSubscription alert) {
    return slackCallbackResource.getEntityUrl(
        Entity.EVENT_SUBSCRIPTION, alert.getFullyQualifiedName(), "");
  }

  private void validateTeamsMessage(EventSubscription alert, TeamsMessage message) {
    // Validate the basic structure
    assertThat(message.getSummary())
        .isNotNull()
        .isEqualTo("Change Event From OpenMetadata")
        .describedAs("Invalid summary in Teams message");

    assertThat(message.getType())
        .isNotNull()
        .isEqualTo("MessageCard")
        .describedAs("Invalid type in Teams message");

    assertThat(message.getContext())
        .isNotNull()
        .isEqualTo("http://schema.org/extensions")
        .describedAs("Invalid context in Teams message");

    TeamsMessage.Section firstSection = message.getSections().get(0);
    // Validate Activity
    String expectedTitle = buildExpectedActivityTitleTextFormatMSTeams(alert);
    String actualTitle = firstSection.getActivityTitle();
    assertEquals(
        expectedTitle, actualTitle, "Teams message activity title does not match expected format");

    // Validate sections
    assertNotNull(message.getSections(), "Sections should not be null");
    assertFalse(message.getSections().isEmpty(), "Sections should not be empty");

    for (TeamsMessage.Section section : message.getSections()) {
      assertNotNull(section.getActivityTitle(), "Activity title should not be null");
      assertFalse(section.getActivityTitle().isEmpty(), "Activity title should not be empty");

      assertNotNull(section.getActivityText(), "Activity text should not be null");
      assertFalse(section.getActivityText().isEmpty(), "Activity text should not be empty");
    }
  }

  private String buildExpectedActivityTitleTextFormatMSTeams(EventSubscription alert) {
    String updatedBy = alert.getUpdatedBy();
    return String.format(
        "%s posted on %s [\"%s\"](/%s)",
        updatedBy, Entity.EVENT_SUBSCRIPTION, alert.getName(), getEntityUrlMSTeams());
  }

  private String getEntityUrlMSTeams() {
    return teamsCallbackResource.getEntityUrlMSTeams();
  }

  private EventSubscription getAndAssertAlert(UUID id, EventSubscription expectedAlert)
      throws HttpResponseException {
    EventSubscription fetchedAlert = getEntity(id, ADMIN_AUTH_HEADERS);
    assertAlertEquals(expectedAlert, fetchedAlert);
    return fetchedAlert;
  }

  private EventSubscription getAndAssertAlertByName(
      String fullyQualifiedName, EventSubscription expectedAlert) throws HttpResponseException {
    EventSubscription fetchedAlert = getEntityByName(fullyQualifiedName, ADMIN_AUTH_HEADERS);
    assertAlertEquals(expectedAlert, fetchedAlert);
    return fetchedAlert;
  }

  private void assertAlertEquals(EventSubscription expected, EventSubscription actual) {
    assertNotNull(actual);
    assertEquals(expected.getId(), actual.getId());
    assertEquals(expected.getName(), actual.getName());
    assertEquals(expected.getFullyQualifiedName(), actual.getFullyQualifiedName());
  }

  private AtomicBoolean testExpectedStatus(UUID id, SubscriptionStatus.Status expectedStatus)
      throws HttpResponseException {
    waitForAllEventToComplete(id);
    SubscriptionStatus status = getStatus(id, Response.Status.OK.getStatusCode());
    LOG.info("webhook status {}", status.getStatus());
    return new AtomicBoolean(status.getStatus() == expectedStatus);
  }

  /**
   * Before a test for every entity resource, create a webhook subscription. At the end of the test, ensure all events
   * are delivered over web subscription comparing it with number of events stored in the system.
   */
  public void startWebhookSubscription() throws IOException {
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/healthy";
    CreateEventSubscription genericWebhookActionRequest =
        createRequest("healthy").withDestinations(getWebhook(baseUri));
    createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);
  }

  public void startSlackSubscription() throws IOException {
    String baseUri =
        "http://localhost:" + APP.getLocalPort() + "/api/v1/test/slack/slackHealthTest";
    CreateEventSubscription genericWebhookActionRequest =
        createRequest("slackHealthTest").withDestinations(getSlackWebhook(baseUri));
    createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);
  }

  public void startMSTeamsSubscription() throws IOException {
    String baseUri =
        "http://localhost:" + APP.getLocalPort() + "/api/v1/test/msteams/teamsHealthTest";
    CreateEventSubscription genericWebhookActionRequest =
        createRequest("teamsHealthTest").withDestinations(getTeamsWebhook(baseUri));
    createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);
  }

  /**
   * At the end of the test, ensure all events are delivered over web subscription comparing it with number of events
   * stored in the system.
   */
  public void validateWebhookEvents() throws HttpResponseException {
    // Check the healthy callback server received all the change events
    EventSubscription healthySub = getEntityByName("healthy", null, "", ADMIN_AUTH_HEADERS);
    waitForAllEventToComplete(healthySub.getId());
    WebhookCallbackResource.EventDetails details =
        webhookCallbackResource.getEventDetails("healthy");
    assertNotNull(details);
    ConcurrentLinkedQueue<ChangeEvent> callbackEvents = details.getEvents();
    assertNotNull(callbackEvents);
    assertNotNull(callbackEvents.peek());
    waitAndCheckForEvents(
        healthySub.getId(),
        "*",
        "*",
        "*",
        "*",
        callbackEvents.peek().getTimestamp(),
        callbackEvents,
        40);
    assertAlertStatusSuccessWithName("healthy");
  }

  public void validateSlackEvents() throws HttpResponseException {
    // Check the healthy callback server received all the change events
    EventSubscription healthySub = getEntityByName("slackHealthTest", null, "", ADMIN_AUTH_HEADERS);
    waitForAllEventToComplete(healthySub.getId());
    SlackCallbackResource.EventDetails details =
        slackCallbackResource.getEventDetails("slackHealthTest");
    assertNotNull(details);
    ConcurrentLinkedQueue<SlackMessage> callbackEvents = details.getEvents();
    assertNotNull(callbackEvents);
    assertNotNull(callbackEvents.peek());
    waitAndCheckForSlackEvents(healthySub.getId(), "*", "*", "*", "*", callbackEvents, 40);
    assertAlertStatusSuccessWithName("slackHealthTest");
  }

  public void validateMSTeamsEvents() throws HttpResponseException {
    // Check the healthy callback server received all the change events
    EventSubscription healthySub = getEntityByName("teamsHealthTest", null, "", ADMIN_AUTH_HEADERS);
    waitForAllEventToComplete(healthySub.getId());
    MSTeamsCallbackResource.EventDetails details =
        teamsCallbackResource.getEventDetails("teamsHealthTest");
    assertNotNull(details);
    ConcurrentLinkedQueue<TeamsMessage> callbackEvents = details.getEvents();
    assertNotNull(callbackEvents);
    assertNotNull(callbackEvents.peek());
    waitAndCheckForMSTeamsEvents(healthySub.getId(), "*", "*", "*", "*", callbackEvents, 40);
    assertAlertStatusSuccessWithName("teamsHealthTest");
  }

  /** At the end of the test, ensure all events are delivered for the combination of entity and eventTypes */
  public void validateWebhookEntityEvents(String entity) throws HttpResponseException {
    // Check the healthy callback server received all the change events
    // For the entity all the webhooks registered for created events have the right number of events
    EventSubscription createdSub =
        getEntityByName(EventType.ENTITY_CREATED + "_" + entity, null, "", ADMIN_AUTH_HEADERS);
    EventSubscription updatedSub =
        getEntityByName(EventType.ENTITY_UPDATED + "_" + entity, null, "", ADMIN_AUTH_HEADERS);

    waitForAllEventToComplete(createdSub.getId());
    waitForAllEventToComplete(updatedSub.getId());

    List<ChangeEvent> callbackEvents =
        webhookCallbackResource.getEntityCallbackEvents(EventType.ENTITY_CREATED, entity);
    assertTrue(callbackEvents.size() > 0);
    long timestamp = callbackEvents.get(0).getTimestamp();
    waitAndCheckForEvents(
        createdSub.getId(), entity, null, null, null, timestamp, callbackEvents, 50);

    // For the entity all the webhooks registered for updated events have the right number of events
    callbackEvents =
        webhookCallbackResource.getEntityCallbackEvents(EventType.ENTITY_UPDATED, entity);
    // Use previous date if no update events
    timestamp = callbackEvents.size() > 0 ? callbackEvents.get(0).getTimestamp() : timestamp;
    waitAndCheckForEvents(
        updatedSub.getId(), null, entity, null, null, timestamp, callbackEvents, 50);
  }

  public void validateSlackEntityEvents(String entity) throws HttpResponseException {
    EventSubscription createdSub =
        getEntityByName(
            EventType.ENTITY_CREATED + "_" + entity + "_SLACK", null, "", ADMIN_AUTH_HEADERS);
    EventSubscription updatedSub =
        getEntityByName(
            EventType.ENTITY_UPDATED + "_" + entity + "_SLACK", null, "", ADMIN_AUTH_HEADERS);

    waitForAllEventToComplete(createdSub.getId());
    waitForAllEventToComplete(updatedSub.getId());

    List<SlackMessage> callbackEvents =
        slackCallbackResource.getEntityCallbackEvents(EventType.ENTITY_CREATED, entity + "_SLACK");
    assertTrue(callbackEvents.size() > 0);
  }

  public void validateMSTeamsEntityEvents(String entity) throws HttpResponseException {
    EventSubscription createdSub =
        getEntityByName(
            EventType.ENTITY_CREATED + "_" + entity + "_MSTEAMS", null, "", ADMIN_AUTH_HEADERS);
    EventSubscription updatedSub =
        getEntityByName(
            EventType.ENTITY_UPDATED + "_" + entity + "_MSTEAMS", null, "", ADMIN_AUTH_HEADERS);

    waitForAllEventToComplete(createdSub.getId());
    waitForAllEventToComplete(updatedSub.getId());

    List<TeamsMessage> callbackEvents =
        teamsCallbackResource.getEntityCallbackEvents(
            EventType.ENTITY_CREATED, entity + "_MSTEAMS");
    assertTrue(callbackEvents.size() > 0);
  }

  public void waitAndCheckForEvents(
      UUID alertId,
      String entityCreated,
      String entityUpdated,
      String entityRestored,
      String entityDeleted,
      long timestamp,
      Collection<ChangeEvent> callbackEvents,
      int iteration)
      throws HttpResponseException {
    waitForAllEventToComplete(alertId);
    List<ChangeEvent> expected =
        getChangeEvents(
                entityCreated,
                entityUpdated,
                entityRestored,
                entityDeleted,
                timestamp,
                ADMIN_AUTH_HEADERS)
            .getData();

    Awaitility.await()
        .pollInterval(Duration.ofMillis(10000L))
        .atMost(Duration.ofMillis(iteration * 1000L))
        .untilTrue(receivedAllEvents(expected, callbackEvents));

    if (expected.size() > callbackEvents.size()) { // Failed to receive all the events
      expected.forEach(
          c1 ->
              LOG.info(
                  "expected {}:{}:{}:{}",
                  c1.getTimestamp(),
                  c1.getEventType(),
                  c1.getEntityType(),
                  c1.getEntityId()));
      callbackEvents.forEach(
          c1 ->
              LOG.info(
                  "received {}:{}:{}:{}",
                  c1.getTimestamp(),
                  c1.getEventType(),
                  c1.getEntityType(),
                  c1.getEntityId()));
    }
    assertTrue(expected.size() <= callbackEvents.size());
  }

  public void waitAndCheckForSlackEvents(
      UUID alertId,
      String entityCreated,
      String entityUpdated,
      String entityRestored,
      String entityDeleted,
      Collection<SlackMessage> messages,
      int iteration)
      throws HttpResponseException {
    waitForAllEventToComplete(alertId);
    List<ChangeEvent> expected =
        getChangeEvents(
                entityCreated, entityUpdated, entityRestored, entityDeleted, ADMIN_AUTH_HEADERS)
            .getData();

    Awaitility.await()
        .pollInterval(Duration.ofMillis(10000L))
        .atMost(Duration.ofMillis(iteration * 1000L));

    if (expected.size() > messages.size()) {
      LOG.info("Failed to receive all the messages");
    }
  }

  public void waitAndCheckForMSTeamsEvents(
      UUID alertId,
      String entityCreated,
      String entityUpdated,
      String entityRestored,
      String entityDeleted,
      Collection<TeamsMessage> messages,
      int iteration)
      throws HttpResponseException {
    waitForAllEventToComplete(alertId);
    List<ChangeEvent> expected =
        getChangeEvents(
                entityCreated, entityUpdated, entityRestored, entityDeleted, ADMIN_AUTH_HEADERS)
            .getData();

    Awaitility.await()
        .pollInterval(Duration.ofMillis(10000L))
        .atMost(Duration.ofMillis(iteration * 1000L));

    if (expected.size() > messages.size()) {
      LOG.info("Failed to receive all the messages");
    }
  }

  public void assertAlertStatusSuccessWithId(UUID alertId) throws HttpResponseException {
    SubscriptionStatus status = getStatus(alertId, Response.Status.OK.getStatusCode());
    assertEquals(SubscriptionStatus.Status.ACTIVE, status.getStatus());
    assertNull(status.getLastFailedAt());
  }

  public void assertAlertStatusSuccessWithName(String alertName) throws HttpResponseException {
    EventSubscription alert = getEntityByName(alertName, null, "", ADMIN_AUTH_HEADERS);
    testExpectedStatus(alert.getId(), ACTIVE);
  }

  public void assertAlertStatus(
      UUID alertId, SubscriptionStatus.Status status, Integer statusCode, String failedReason)
      throws HttpResponseException {
    SubscriptionStatus actionStatus = getStatus(alertId, Response.Status.OK.getStatusCode());
    assertEquals(status, actionStatus.getStatus());
    assertEquals(statusCode, actionStatus.getLastFailedStatusCode());
    assertEquals(failedReason, actionStatus.getLastFailedReason());
  }

  private SubscriptionStatus getStatus(UUID alertId, int statusCode) throws HttpResponseException {
    WebTarget target =
        getResource(String.format("%s/%s/status/%s", collectionName, alertId, DESTINATION_ID));
    return TestUtils.getWithResponse(
        target, SubscriptionStatus.class, ADMIN_AUTH_HEADERS, statusCode);
  }

  private static AtomicBoolean receivedAllEvents(
      List<ChangeEvent> expected, Collection<ChangeEvent> callbackEvents) {
    for (ChangeEvent expectedChangeEvent : expected) {
      boolean found = false;
      for (ChangeEvent changeEvent : callbackEvents) {
        if (changeEvent.getId().equals(expectedChangeEvent.getId())) {
          found = true;
          break;
        }
      }
      if (!found) {
        LOG.error(
            "[ChangeEventError] Change Events Missing from Callback: {}",
            expectedChangeEvent.toString());
      }
    }
    LOG.info("expected size {} callback events size {}", expected.size(), callbackEvents.size());
    return new AtomicBoolean(expected.size() <= callbackEvents.size());
  }

  /** Start webhook subscription for given entity and various event types */
  public void startWebhookEntitySubscriptions(String entity) throws IOException {
    String alertName = EventType.ENTITY_CREATED + "_" + entity;
    // Alert Action
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/filterBased";
    String uri = baseUri + "/" + EventType.ENTITY_CREATED + "/" + entity;

    // Alert Action
    // Callback response 1 second slower
    CreateEventSubscription genericWebhookActionRequest =
        createRequest(alertName).withDestinations(getWebhook(uri));

    genericWebhookActionRequest.setInput(
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(List.of("entityCreated")))))));
    createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);

    // Create webhook with endpoint api/v1/test/webhook/entityUpdated/<entity> to receive
    // entityUpdated events
    alertName = EventType.ENTITY_UPDATED + "_" + entity;
    uri = baseUri + "/" + EventType.ENTITY_UPDATED + "/" + entity;

    // Callback response 1 second slower
    CreateEventSubscription genericWebhookActionRequest2 =
        createRequest(alertName).withDestinations(getWebhook(uri));
    genericWebhookActionRequest2.setInput(
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(List.of("entityCreated")))))));
    createAndCheckEntity(genericWebhookActionRequest2, ADMIN_AUTH_HEADERS);

    // TODO entity deleted events
  }

  public void startSlackEntitySubscriptions(String entity) throws IOException {
    String alertName = EventType.ENTITY_CREATED + "_" + entity + "_SLACK";
    // Alert Action
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/slack/filterBased";
    String uri = baseUri + "/" + EventType.ENTITY_CREATED + "/" + entity + "_SLACK";

    // Alert Action
    // Callback response 1 second slower
    CreateEventSubscription genericWebhookActionRequest =
        createRequest(alertName).withDestinations(getSlackWebhook(uri));

    genericWebhookActionRequest.setInput(
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(List.of("entityCreated")))))));
    createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);

    // Create webhook with endpoint api/v1/test/webhook/entityUpdated/<entity> to receive
    // entityUpdated events
    alertName = EventType.ENTITY_UPDATED + "_" + entity + "_SLACK";
    uri = baseUri + "/" + EventType.ENTITY_UPDATED + "/" + entity + "_SLACK";

    // Callback response 1 second slower
    CreateEventSubscription genericWebhookActionRequest2 =
        createRequest(alertName).withDestinations(getSlackWebhook(uri));
    genericWebhookActionRequest2.setInput(
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(List.of("entityCreated")))))));
    createAndCheckEntity(genericWebhookActionRequest2, ADMIN_AUTH_HEADERS);
  }

  public void startMSTeamsEntitySubscription(String entity) throws IOException {
    String alertName = EventType.ENTITY_CREATED + "_" + entity + "_MSTEAMS";
    // Alert Action
    String baseUri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/msteams/filterBased";
    String uri = baseUri + "/" + EventType.ENTITY_CREATED + "/" + entity + "_MSTEAMS";

    // Alert Action
    // Callback response 1 second slower
    CreateEventSubscription genericWebhookActionRequest =
        createRequest(alertName).withDestinations(getTeamsWebhook(uri));

    genericWebhookActionRequest.setInput(
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(List.of("entityCreated")))))));
    createAndCheckEntity(genericWebhookActionRequest, ADMIN_AUTH_HEADERS);

    // Create webhook with endpoint api/v1/test/webhook/entityUpdated/<entity> to receive
    // entityUpdated events
    alertName = EventType.ENTITY_UPDATED + "_" + entity + "_MSTEAMS";
    uri = baseUri + "/" + EventType.ENTITY_UPDATED + "/" + entity + "_MSTEAMS";

    // Callback response 1 second slower
    CreateEventSubscription genericWebhookActionRequest2 =
        createRequest(alertName).withDestinations(getTeamsWebhook(uri));
    genericWebhookActionRequest2.setInput(
        new AlertFilteringInput()
            .withFilters(
                List.of(
                    new ArgumentsInput()
                        .withName("filterByEventType")
                        .withArguments(
                            List.of(
                                new Argument()
                                    .withName("eventTypeList")
                                    .withInput(List.of("entityCreated")))))));
    createAndCheckEntity(genericWebhookActionRequest2, ADMIN_AUTH_HEADERS);
  }

  @Override
  public CreateEventSubscription createRequest(String name) {
    String uri = "http://localhost:" + APP.getLocalPort() + "/api/v1/test/webhook/ignore";
    return new CreateEventSubscription()
        .withName(name)
        .withResources(List.of("all"))
        .withDestinations(getWebhook(uri))
        .withEnabled(true)
        .withBatchSize(10)
        .withRetries(0)
        .withPollInterval(1)
        .withAlertType(CreateEventSubscription.AlertType.NOTIFICATION);
  }

  @Override
  public void validateCreatedEntity(
      EventSubscription createdEntity,
      CreateEventSubscription createRequest,
      Map<String, String> authHeaders) {
    assertEquals(createRequest.getName(), createdEntity.getName());
    assertEquals(createRequest.getInput(), createdEntity.getInput());
    assertEquals(createRequest.getAlertType(), createdEntity.getAlertType());
  }

  @Override
  public void compareEntities(
      EventSubscription expected, EventSubscription updated, Map<String, String> authHeaders) {}

  @Override
  public EventSubscription validateGetWithDifferentFields(
      EventSubscription entity, boolean byName) {
    return entity;
  }

  @Override
  public void assertFieldChange(String fieldName, Object expected, Object actual) {
    if (expected == actual) {
      return;
    }
    if (fieldName.equals("destinations")) {
      List<SubscriptionDestination> actualDestination =
          JsonUtils.readObjects((String) actual, SubscriptionDestination.class);
      actualDestination.forEach(
          d -> d.setConfig(JsonUtils.convertValue(d.getConfig(), Webhook.class)));
      assertEquals(expected, actualDestination);
    } else if (fieldName.equals("filteringRules") || fieldName.equals("input")) {
      assertEquals(JsonUtils.pojoToJson(expected), actual);
    } else {
      assertCommonFieldChange(fieldName, expected, actual);
    }
  }

  public List<SubscriptionDestination> getWebhook(String uri) {
    return List.of(
        new SubscriptionDestination()
            .withId(DESTINATION_ID)
            .withCategory(SubscriptionDestination.SubscriptionCategory.EXTERNAL)
            .withType(SubscriptionDestination.SubscriptionType.WEBHOOK)
            .withConfig(
                new Webhook()
                    .withEndpoint(URI.create(uri))
                    .withReceivers(new HashSet<>())
                    .withSecretKey("webhookTest")));
  }

  public List<SubscriptionDestination> getSlackWebhook(String uri) {
    return List.of(
        new SubscriptionDestination()
            .withId(DESTINATION_ID)
            .withCategory(SubscriptionDestination.SubscriptionCategory.EXTERNAL)
            .withType(SubscriptionDestination.SubscriptionType.SLACK)
            .withConfig(
                new Webhook()
                    .withEndpoint(URI.create(uri))
                    .withReceivers(new HashSet<>())
                    .withSecretKey("slackTest")));
  }

  public List<SubscriptionDestination> getTeamsWebhook(String uri) {
    return List.of(
        new SubscriptionDestination()
            .withId(DESTINATION_ID)
            .withCategory(SubscriptionDestination.SubscriptionCategory.EXTERNAL)
            .withType(SubscriptionDestination.SubscriptionType.MS_TEAMS)
            .withConfig(
                new Webhook()
                    .withEndpoint(URI.create(uri))
                    .withReceivers(new HashSet<>())
                    .withSecretKey("teamsTest")));
  }

  public WebhookCallbackResource.EventDetails waitForFirstEvent(
      UUID alertId, String endpoint, int iteration) throws HttpResponseException {
    waitForAllEventToComplete(alertId);
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(iteration * 100L))
        .untilFalse(hasEventOccurred(endpoint));
    WebhookCallbackResource.EventDetails details =
        webhookCallbackResource.getEventDetails(endpoint);
    LOG.info("Returning for endpoint {} eventDetails {}", endpoint, details);
    return details;
  }

  public SlackCallbackResource.EventDetails waitForFirstSlackEvent(
      UUID alertId, String endpoint, int iteration) throws HttpResponseException {
    waitForAllEventToComplete(alertId);
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(iteration * 100L))
        .untilFalse(hasEventOccurredSlack(endpoint));
    SlackCallbackResource.EventDetails details = slackCallbackResource.getEventDetails(endpoint);
    LOG.info("Returning for endpoint {} eventDetails {}", endpoint, details);
    return details;
  }

  public MSTeamsCallbackResource.EventDetails waitForFirstMSTeamsEvent(
      UUID alertId, String endpoint, int iteration) throws HttpResponseException {
    waitForAllEventToComplete(alertId);
    Awaitility.await()
        .pollInterval(Duration.ofMillis(100L))
        .atMost(Duration.ofMillis(iteration * 100L))
        .untilFalse(hasEventOccurredMSTeams(endpoint));
    MSTeamsCallbackResource.EventDetails details = teamsCallbackResource.getEventDetails(endpoint);
    LOG.info("Returning for endpoint {} eventDetails {}", endpoint, details);
    return details;
  }

  private AtomicBoolean hasEventOccurred(String endpoint) {
    WebhookCallbackResource.EventDetails details =
        webhookCallbackResource.getEventDetails(endpoint);
    return new AtomicBoolean(
        details != null && details.getEvents() != null && details.getEvents().size() <= 0);
  }

  private AtomicBoolean hasEventOccurredSlack(String endpoint) {
    SlackCallbackResource.EventDetails details = slackCallbackResource.getEventDetails(endpoint);
    return new AtomicBoolean(
        details != null && details.getEvents() != null && details.getEvents().size() <= 0);
  }

  private AtomicBoolean hasEventOccurredMSTeams(String endpoint) {
    MSTeamsCallbackResource.EventDetails details = teamsCallbackResource.getEventDetails(endpoint);
    return new AtomicBoolean(
        details != null && details.getEvents() != null && details.getEvents().size() <= 0);
  }
}
