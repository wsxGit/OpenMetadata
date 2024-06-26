package org.openmetadata.service.jdbi3;

import static org.openmetadata.schema.type.EventType.ENTITY_UPDATED;

import java.beans.BeanInfo;
import java.beans.IntrospectionException;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import javax.json.JsonPatch;
import javax.ws.rs.core.Response;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.api.feed.CloseTask;
import org.openmetadata.schema.api.feed.ResolveTask;
import org.openmetadata.schema.entity.feed.Thread;
import org.openmetadata.schema.entity.teams.User;
import org.openmetadata.schema.tests.TestCase;
import org.openmetadata.schema.tests.type.Assigned;
import org.openmetadata.schema.tests.type.Resolved;
import org.openmetadata.schema.tests.type.Severity;
import org.openmetadata.schema.tests.type.TestCaseResolutionStatus;
import org.openmetadata.schema.tests.type.TestCaseResolutionStatusTypes;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.Relationship;
import org.openmetadata.schema.type.TaskDetails;
import org.openmetadata.schema.type.TaskStatus;
import org.openmetadata.schema.type.TaskType;
import org.openmetadata.schema.type.ThreadType;
import org.openmetadata.service.Entity;
import org.openmetadata.service.exception.EntityNotFoundException;
import org.openmetadata.service.exception.IncidentManagerException;
import org.openmetadata.service.resources.feeds.MessageParser;
import org.openmetadata.service.util.EntityUtil;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.RestUtil;
import org.openmetadata.service.util.ResultList;
import org.openmetadata.service.util.WebsocketNotificationHandler;
import org.openmetadata.service.util.incidentSeverityClassifier.IncidentSeverityClassifierInterface;

public class TestCaseResolutionStatusRepository
    extends EntityTimeSeriesRepository<TestCaseResolutionStatus> {
  public static final String COLLECTION_PATH = "/v1/dataQuality/testCases/testCaseIncidentStatus";

  public TestCaseResolutionStatusRepository() {
    super(
        COLLECTION_PATH,
        Entity.getCollectionDAO().testCaseResolutionStatusTimeSeriesDao(),
        TestCaseResolutionStatus.class,
        Entity.TEST_CASE_RESOLUTION_STATUS);
  }

  public ResultList<TestCaseResolutionStatus> listTestCaseResolutionStatusesForStateId(
      UUID stateId) {
    List<TestCaseResolutionStatus> testCaseResolutionStatuses = new ArrayList<>();
    List<String> jsons =
        ((CollectionDAO.TestCaseResolutionStatusTimeSeriesDAO) timeSeriesDao)
            .listTestCaseResolutionStatusesForStateId(stateId.toString());

    for (String json : jsons) {
      TestCaseResolutionStatus testCaseResolutionStatus =
          JsonUtils.readValue(json, TestCaseResolutionStatus.class);
      setInheritedFields(testCaseResolutionStatus);
      testCaseResolutionStatuses.add(testCaseResolutionStatus);
    }

    return getResultList(testCaseResolutionStatuses, null, null, testCaseResolutionStatuses.size());
  }

  public RestUtil.PatchResponse<TestCaseResolutionStatus> patch(
      UUID id, JsonPatch patch, String user)
      throws IntrospectionException, InvocationTargetException, IllegalAccessException {
    String originalJson = timeSeriesDao.getById(id);
    if (originalJson == null) {
      throw new EntityNotFoundException(String.format("Entity with id %s not found", id));
    }
    TestCaseResolutionStatus original = JsonUtils.readValue(originalJson, entityClass);
    TestCaseResolutionStatus updated = JsonUtils.applyPatch(original, patch, entityClass);

    updated.setUpdatedAt(System.currentTimeMillis());
    updated.setUpdatedBy(EntityUtil.getEntityReference("User", user));
    validatePatchFields(updated, original);

    timeSeriesDao.update(JsonUtils.pojoToJson(updated), id);
    return new RestUtil.PatchResponse<>(Response.Status.OK, updated, ENTITY_UPDATED);
  }

  private void validatePatchFields(
      TestCaseResolutionStatus updated, TestCaseResolutionStatus original)
      throws IntrospectionException, InvocationTargetException, IllegalAccessException {
    // Validate that only updatedAt and updatedBy fields are updated
    BeanInfo beanInfo = Introspector.getBeanInfo(TestCaseResolutionStatus.class);

    for (PropertyDescriptor propertyDescriptor : beanInfo.getPropertyDescriptors()) {
      String propertyName = propertyDescriptor.getName();
      if ((!propertyName.equals("updatedBy"))
          && (!propertyName.equals("updatedAt"))
          && (!propertyName.equals("severity"))) {
        Object originalValue = propertyDescriptor.getReadMethod().invoke(original);
        Object updatedValue = propertyDescriptor.getReadMethod().invoke(updated);
        if (originalValue != null && !originalValue.equals(updatedValue)) {
          throw new IllegalArgumentException(
              String.format("Field %s is not allowed to be updated", propertyName));
        }
      }
    }
  }

  public Boolean unresolvedIncident(TestCaseResolutionStatus incident) {
    return incident != null
        && !incident
            .getTestCaseResolutionStatusType()
            .equals(TestCaseResolutionStatusTypes.Resolved);
  }

  private Thread getIncidentTask(TestCaseResolutionStatus incident) {
    // Fetch the latest task (which comes from the NEW state) and close it
    String jsonThread =
        Entity.getCollectionDAO()
            .feedDAO()
            .fetchThreadByTestCaseResolutionStatusId(incident.getStateId());
    return JsonUtils.readValue(jsonThread, Thread.class);
  }

  /**
   * Ensure we are following the correct status flow
   */
  private void validateStatus(
      TestCaseResolutionStatusTypes lastStatus, TestCaseResolutionStatusTypes newStatus) {
    switch (lastStatus) {
      case New -> {
        /* New can go to any status */
      }
      case Ack -> {
        if (newStatus.equals(TestCaseResolutionStatusTypes.New)) {
          throw IncidentManagerException.invalidStatus(lastStatus, newStatus);
        }
      }
      case Assigned -> {
        if (List.of(TestCaseResolutionStatusTypes.New, TestCaseResolutionStatusTypes.Ack)
            .contains(newStatus)) {
          throw IncidentManagerException.invalidStatus(lastStatus, newStatus);
        }
      }
        // We only validate status if the last one is unresolved, so we should
        // never land here
      default -> throw IncidentManagerException.invalidStatus(lastStatus, newStatus);
    }
  }

  @Override
  @Transaction
  public void storeInternal(TestCaseResolutionStatus recordEntity, String recordFQN) {

    TestCaseResolutionStatus lastIncident = getLatestRecord(recordFQN);

    if (recordEntity.getStateId() == null) {
      recordEntity.setStateId(UUID.randomUUID());
    }

    // if we have an ongoing incident, set the stateId if the new record to be created
    // and validate the flow
    if (Boolean.TRUE.equals(unresolvedIncident(lastIncident))) {
      validateStatus(
          lastIncident.getTestCaseResolutionStatusType(),
          recordEntity.getTestCaseResolutionStatusType());
      // If there is an unresolved incident update the state ID
      recordEntity.setStateId(lastIncident.getStateId());
      // If the last incident had a severity assigned and the incoming incident does not, inherit
      // the old severity
      recordEntity.setSeverity(
          recordEntity.getSeverity() == null
              ? lastIncident.getSeverity()
              : recordEntity.getSeverity());
    }

    inferIncidentSeverity(recordEntity);

    switch (recordEntity.getTestCaseResolutionStatusType()) {
      case New -> {
        // If there is already an existing New incident we'll return it
        if (Boolean.TRUE.equals(unresolvedIncident(lastIncident))) {
          return;
        }
      }
      case Ack, Assigned -> openOrAssignTask(recordEntity);
      case Resolved -> {
        // When the incident is Resolved, we will close the Assigned task.
        resolveTask(recordEntity, lastIncident);
        // We don't create a new record. The new status will be added via the
        // TestCaseFailureResolutionTaskWorkflow
        // implemented in the TestCaseRepository.
        return;
      }
      default -> throw new IllegalArgumentException(
          String.format("Invalid status %s", recordEntity.getTestCaseResolutionStatusType()));
    }
    EntityReference testCaseReference = recordEntity.getTestCaseReference();
    recordEntity.withTestCaseReference(null); // we don't want to store the reference in the record
    super.storeInternal(recordEntity, recordFQN);
    recordEntity.withTestCaseReference(testCaseReference);
  }

  @Override
  protected void storeRelationship(TestCaseResolutionStatus recordEntity) {
    addRelationship(
        recordEntity.getTestCaseReference().getId(),
        recordEntity.getId(),
        Entity.TEST_CASE,
        Entity.TEST_CASE_RESOLUTION_STATUS,
        Relationship.PARENT_OF,
        null,
        false);
  }

  @Override
  protected void setInheritedFields(TestCaseResolutionStatus recordEntity) {
    recordEntity.setTestCaseReference(
        getFromEntityRef(recordEntity.getId(), Relationship.PARENT_OF, Entity.TEST_CASE, true));
  }

  private void openOrAssignTask(TestCaseResolutionStatus incidentStatus) {
    switch (incidentStatus.getTestCaseResolutionStatusType()) {
      case Ack -> // If the incident has been acknowledged, the task will be assigned to the user
      // who acknowledged it
      createTask(
          incidentStatus, Collections.singletonList(incidentStatus.getUpdatedBy()), "New Incident");
      case Assigned -> {
        // If no existing task is found (New -> Assigned), we'll create a new one,
        // otherwise (Ack -> Assigned) we'll update the existing
        Thread existingTask = getIncidentTask(incidentStatus);
        Assigned assigned =
            JsonUtils.convertValue(
                incidentStatus.getTestCaseResolutionStatusDetails(), Assigned.class);
        if (existingTask == null) {
          // New -> Assigned flow
          createTask(
              incidentStatus, Collections.singletonList(assigned.getAssignee()), "New Incident");
        } else {
          // Ack -> Assigned or Assigned -> Assigned flow
          patchTaskAssignee(
              existingTask, assigned.getAssignee(), incidentStatus.getUpdatedBy().getName());
        }
      }
        // Should not land in the default case as we only call this method for Ack and Assigned
      default -> throw new IllegalArgumentException(
          String.format(
              "Task cannot be opened for status `%s`",
              incidentStatus.getTestCaseResolutionStatusType()));
    }
  }

  private void resolveTask(
      TestCaseResolutionStatus newIncidentStatus, TestCaseResolutionStatus lastIncidentStatus) {

    if (lastIncidentStatus == null) {
      throw new IncidentManagerException(
          String.format(
              "Cannot find the last incident status for stateId %s",
              newIncidentStatus.getStateId()));
    }

    Resolved resolved =
        JsonUtils.convertValue(
            newIncidentStatus.getTestCaseResolutionStatusDetails(), Resolved.class);
    TestCase testCase =
        Entity.getEntity(
            Entity.TEST_CASE, newIncidentStatus.getTestCaseReference().getId(), "", Include.ALL);
    User updatedBy =
        Entity.getEntity(Entity.USER, newIncidentStatus.getUpdatedBy().getId(), "", Include.ALL);
    ResolveTask resolveTask =
        new ResolveTask()
            .withTestCaseFQN(testCase.getFullyQualifiedName())
            .withTestCaseFailureReason(resolved.getTestCaseFailureReason())
            .withNewValue(resolved.getTestCaseFailureComment());

    Thread thread = getIncidentTask(lastIncidentStatus);

    if (thread != null) {
      // If there is an existing task, we'll close it without performing the workflow
      // (i.e. creating a new incident which will be handled here).
      FeedRepository.ThreadContext threadContext = new FeedRepository.ThreadContext(thread);
      threadContext.getThread().getTask().withNewValue(resolveTask.getNewValue());
      Entity.getFeedRepository()
          .closeTaskWithoutWorkflow(
              threadContext.getThread(), updatedBy.getFullyQualifiedName(), new CloseTask());
    }
    // if there is no task, we'll simply create a new incident status (e.g. New -> Resolved)
    EntityReference testCaseReference = newIncidentStatus.getTestCaseReference();
    newIncidentStatus.setTestCaseReference(
        null); // we don't want to store the reference in the record
    super.storeInternal(newIncidentStatus, testCase.getFullyQualifiedName());
    newIncidentStatus.setTestCaseReference(testCaseReference);
  }

  private void createTask(
      TestCaseResolutionStatus incidentStatus, List<EntityReference> assignees, String message) {

    TaskDetails taskDetails =
        new TaskDetails()
            .withAssignees(assignees)
            .withType(TaskType.RequestTestCaseFailureResolution)
            .withStatus(TaskStatus.Open)
            // Each incident flow - flagged by its State ID - will have a single unique Task
            .withTestCaseResolutionStatusId(incidentStatus.getStateId());

    MessageParser.EntityLink entityLink =
        new MessageParser.EntityLink(
            Entity.TEST_CASE, incidentStatus.getTestCaseReference().getFullyQualifiedName());
    Thread thread =
        new Thread()
            .withId(UUID.randomUUID())
            .withThreadTs(System.currentTimeMillis())
            .withMessage(message)
            .withCreatedBy(incidentStatus.getUpdatedBy().getName())
            .withAbout(entityLink.getLinkString())
            .withType(ThreadType.Task)
            .withTask(taskDetails)
            .withUpdatedBy(incidentStatus.getUpdatedBy().getName())
            .withUpdatedAt(System.currentTimeMillis());
    FeedRepository feedRepository = Entity.getFeedRepository();
    feedRepository.create(thread);

    // Send WebSocket Notification
    WebsocketNotificationHandler.handleTaskNotification(thread);
  }

  private void patchTaskAssignee(Thread originalTask, EntityReference newAssignee, String user) {
    Thread updatedTask = JsonUtils.deepCopy(originalTask, Thread.class);
    updatedTask.setTask(
        updatedTask.getTask().withAssignees(Collections.singletonList(newAssignee)));

    JsonPatch patch = JsonUtils.getJsonPatch(originalTask, updatedTask);

    FeedRepository feedRepository = Entity.getFeedRepository();
    RestUtil.PatchResponse<Thread> thread =
        feedRepository.patchThread(null, originalTask.getId(), user, patch);

    // Send WebSocket Notification
    WebsocketNotificationHandler.handleTaskNotification(thread.entity());
  }

  public void inferIncidentSeverity(TestCaseResolutionStatus incident) {
    if (incident.getSeverity() != null) {
      // If the severity is already set, we don't need to infer it
      return;
    }
    IncidentSeverityClassifierInterface incidentSeverityClassifier =
        IncidentSeverityClassifierInterface.getInstance();
    EntityReference testCaseReference = incident.getTestCaseReference();
    TestCase testCase =
        Entity.getEntityByName(
            testCaseReference.getType(),
            testCaseReference.getFullyQualifiedName(),
            "",
            Include.ALL);
    MessageParser.EntityLink entityLink = MessageParser.EntityLink.parse(testCase.getEntityLink());
    EntityInterface entity =
        Entity.getEntityByName(
            entityLink.getEntityType(),
            entityLink.getEntityFQN(),
            "followers,owner,tags,votes",
            Include.ALL);
    Severity severity = incidentSeverityClassifier.classifyIncidentSeverity(entity);
    incident.setSeverity(severity);
  }

  public void deleteTestCaseFailedSamples(TestCaseResolutionStatus entity) {
    TestCaseRepository testCaseRepository =
        (TestCaseRepository) Entity.getEntityRepository(Entity.TEST_CASE);
    testCaseRepository.deleteTestCaseFailedRowsSample(entity.getTestCaseReference().getId());
  }
}
