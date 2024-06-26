/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.service.jdbi3;

import static org.openmetadata.schema.type.EventType.ENTITY_FIELDS_CHANGED;
import static org.openmetadata.schema.type.EventType.ENTITY_UPDATED;

import java.util.List;
import java.util.UUID;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import lombok.Getter;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.json.JSONObject;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.entity.services.ingestionPipelines.AirflowConfig;
import org.openmetadata.schema.entity.services.ingestionPipelines.IngestionPipeline;
import org.openmetadata.schema.entity.services.ingestionPipelines.PipelineStatus;
import org.openmetadata.schema.metadataIngestion.LogLevels;
import org.openmetadata.schema.services.connections.metadata.OpenMetadataConnection;
import org.openmetadata.schema.type.ChangeDescription;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.FieldChange;
import org.openmetadata.schema.type.Include;
import org.openmetadata.sdk.PipelineServiceClient;
import org.openmetadata.service.Entity;
import org.openmetadata.service.OpenMetadataApplicationConfig;
import org.openmetadata.service.resources.services.ingestionpipelines.IngestionPipelineResource;
import org.openmetadata.service.secrets.SecretsManager;
import org.openmetadata.service.secrets.SecretsManagerFactory;
import org.openmetadata.service.util.EntityUtil;
import org.openmetadata.service.util.EntityUtil.Fields;
import org.openmetadata.service.util.FullyQualifiedName;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.RestUtil;
import org.openmetadata.service.util.ResultList;

public class IngestionPipelineRepository extends EntityRepository<IngestionPipeline> {
  private static final String UPDATE_FIELDS =
      "sourceConfig,airflowConfig,loggerLevel,enabled,deployed";
  private static final String PATCH_FIELDS =
      "sourceConfig,airflowConfig,loggerLevel,enabled,deployed";

  private static final String PIPELINE_STATUS_JSON_SCHEMA = "ingestionPipelineStatus";
  private static final String PIPELINE_STATUS_EXTENSION = "ingestionPipeline.pipelineStatus";
  private static final String RUN_ID_EXTENSION_KEY = "runId";
  private PipelineServiceClient pipelineServiceClient;

  @Getter private final OpenMetadataApplicationConfig openMetadataApplicationConfig;

  public IngestionPipelineRepository(OpenMetadataApplicationConfig config) {
    super(
        IngestionPipelineResource.COLLECTION_PATH,
        Entity.INGESTION_PIPELINE,
        IngestionPipeline.class,
        Entity.getCollectionDAO().ingestionPipelineDAO(),
        PATCH_FIELDS,
        UPDATE_FIELDS);
    this.supportsSearch = true;
    this.openMetadataApplicationConfig = config;
  }

  @Override
  public void setFullyQualifiedName(IngestionPipeline ingestionPipeline) {
    ingestionPipeline.setFullyQualifiedName(
        FullyQualifiedName.add(
            ingestionPipeline.getService().getFullyQualifiedName(), ingestionPipeline.getName()));
  }

  @Override
  public void setFields(IngestionPipeline ingestionPipeline, Fields fields) {
    if (ingestionPipeline.getService() == null) {
      ingestionPipeline.withService(getContainer(ingestionPipeline.getId()));
    }
    ingestionPipeline.setPipelineStatuses(
        fields.contains("pipelineStatuses")
            ? getLatestPipelineStatus(ingestionPipeline)
            : ingestionPipeline.getPipelineStatuses());
  }

  @Override
  public void clearFields(IngestionPipeline ingestionPipeline, Fields fields) {
    /* Nothing to do */
  }

  @Override
  public void prepare(IngestionPipeline ingestionPipeline, boolean update) {
    EntityReference entityReference =
        Entity.getEntityReference(ingestionPipeline.getService(), Include.NON_DELETED);
    ingestionPipeline.setService(entityReference);
  }

  @Transaction
  public IngestionPipeline deletePipelineStatus(UUID ingestionPipelineId) {
    // Validate the request content
    IngestionPipeline ingestionPipeline = find(ingestionPipelineId, Include.NON_DELETED);
    daoCollection
        .entityExtensionTimeSeriesDao()
        .delete(ingestionPipeline.getFullyQualifiedName(), PIPELINE_STATUS_EXTENSION);
    setFieldsInternal(ingestionPipeline, Fields.EMPTY_FIELDS);
    return ingestionPipeline;
  }

  @Override
  public void storeEntity(IngestionPipeline ingestionPipeline, boolean update) {
    // Relationships and fields such as service are derived and not stored as part of json
    EntityReference service = ingestionPipeline.getService();
    OpenMetadataConnection openmetadataConnection =
        ingestionPipeline.getOpenMetadataServerConnection();

    SecretsManager secretsManager = SecretsManagerFactory.getSecretsManager();

    if (secretsManager != null) {
      secretsManager.encryptIngestionPipeline(ingestionPipeline);
      // We store the OM sensitive values in SM separately
      openmetadataConnection =
          secretsManager.encryptOpenMetadataConnection(openmetadataConnection, true);
    }

    ingestionPipeline.withService(null).withOpenMetadataServerConnection(null);
    store(ingestionPipeline, update);
    ingestionPipeline.withService(service).withOpenMetadataServerConnection(openmetadataConnection);
  }

  @Override
  public void storeRelationships(IngestionPipeline ingestionPipeline) {
    addServiceRelationship(ingestionPipeline, ingestionPipeline.getService());
  }

  @Override
  public EntityUpdater getUpdater(
      IngestionPipeline original, IngestionPipeline updated, Operation operation) {
    return new IngestionPipelineUpdater(original, updated, operation);
  }

  @Override
  protected void postDelete(IngestionPipeline entity) {
    // Delete deployed pipeline in the Pipeline Service Client
    pipelineServiceClient.deletePipeline(entity);
    // Clean pipeline status
    daoCollection
        .entityExtensionTimeSeriesDao()
        .delete(entity.getFullyQualifiedName(), PIPELINE_STATUS_EXTENSION);
  }

  @Override
  public EntityInterface getParentEntity(IngestionPipeline entity, String fields) {
    return Entity.getEntity(entity.getService(), fields, Include.NON_DELETED);
  }

  public void setPipelineServiceClient(PipelineServiceClient client) {
    pipelineServiceClient = client;
  }

  private ChangeEvent getChangeEvent(
      EntityInterface updated, ChangeDescription change, String entityType, Double prevVersion) {
    return new ChangeEvent()
        .withId(UUID.randomUUID())
        .withEntity(updated)
        .withChangeDescription(change)
        .withEventType(ENTITY_UPDATED)
        .withEntityType(entityType)
        .withEntityId(updated.getId())
        .withEntityFullyQualifiedName(updated.getFullyQualifiedName())
        .withUserName(updated.getUpdatedBy())
        .withTimestamp(System.currentTimeMillis())
        .withCurrentVersion(updated.getVersion())
        .withPreviousVersion(prevVersion);
  }

  private ChangeDescription addPipelineStatusChangeDescription(
      Double version, Object newValue, Object oldValue) {
    FieldChange fieldChange =
        new FieldChange().withName("pipelineStatus").withNewValue(newValue).withOldValue(oldValue);
    ChangeDescription change = new ChangeDescription().withPreviousVersion(version);
    change.getFieldsUpdated().add(fieldChange);
    return change;
  }

  public RestUtil.PutResponse<?> addPipelineStatus(
      UriInfo uriInfo, String fqn, PipelineStatus pipelineStatus) {
    // Validate the request content
    IngestionPipeline ingestionPipeline = getByName(uriInfo, fqn, getFields("service"));
    PipelineStatus storedPipelineStatus =
        JsonUtils.readValue(
            daoCollection
                .entityExtensionTimeSeriesDao()
                .getLatestExtensionByKey(
                    RUN_ID_EXTENSION_KEY,
                    pipelineStatus.getRunId(),
                    ingestionPipeline.getFullyQualifiedName(),
                    PIPELINE_STATUS_EXTENSION),
            PipelineStatus.class);
    if (storedPipelineStatus != null) {
      daoCollection
          .entityExtensionTimeSeriesDao()
          .updateExtensionByKey(
              RUN_ID_EXTENSION_KEY,
              pipelineStatus.getRunId(),
              ingestionPipeline.getFullyQualifiedName(),
              PIPELINE_STATUS_EXTENSION,
              JsonUtils.pojoToJson(pipelineStatus));
    } else {
      daoCollection
          .entityExtensionTimeSeriesDao()
          .insert(
              ingestionPipeline.getFullyQualifiedName(),
              PIPELINE_STATUS_EXTENSION,
              PIPELINE_STATUS_JSON_SCHEMA,
              JsonUtils.pojoToJson(pipelineStatus));
    }
    ChangeDescription change =
        addPipelineStatusChangeDescription(
            ingestionPipeline.getVersion(), pipelineStatus, storedPipelineStatus);
    ingestionPipeline.setPipelineStatuses(pipelineStatus);

    // Update ES Indexes
    searchRepository.updateEntity(ingestionPipeline);

    ChangeEvent changeEvent =
        getChangeEvent(
            withHref(uriInfo, ingestionPipeline),
            change,
            entityType,
            ingestionPipeline.getVersion());

    return new RestUtil.PutResponse<>(Response.Status.CREATED, changeEvent, ENTITY_FIELDS_CHANGED);
  }

  public ResultList<PipelineStatus> listPipelineStatus(
      String ingestionPipelineFQN, Long startTs, Long endTs) {
    IngestionPipeline ingestionPipeline =
        getByName(null, ingestionPipelineFQN, getFields("service"));
    List<PipelineStatus> pipelineStatusList =
        JsonUtils.readObjects(
            getResultsFromAndToTimestamps(
                ingestionPipeline.getFullyQualifiedName(),
                PIPELINE_STATUS_EXTENSION,
                startTs,
                endTs),
            PipelineStatus.class);
    List<PipelineStatus> allPipelineStatusList =
        pipelineServiceClient.getQueuedPipelineStatus(ingestionPipeline);
    allPipelineStatusList.addAll(pipelineStatusList);
    return new ResultList<>(
        allPipelineStatusList,
        String.valueOf(startTs),
        String.valueOf(endTs),
        allPipelineStatusList.size());
  }

  public PipelineStatus getLatestPipelineStatus(IngestionPipeline ingestionPipeline) {
    return JsonUtils.readValue(
        getLatestExtensionFromTimeSeries(
            ingestionPipeline.getFullyQualifiedName(), PIPELINE_STATUS_EXTENSION),
        PipelineStatus.class);
  }

  public PipelineStatus getPipelineStatus(String ingestionPipelineFQN, UUID pipelineStatusRunId) {
    IngestionPipeline ingestionPipeline = findByName(ingestionPipelineFQN, Include.NON_DELETED);
    return JsonUtils.readValue(
        daoCollection
            .entityExtensionTimeSeriesDao()
            .getExtensionByKey(
                RUN_ID_EXTENSION_KEY,
                pipelineStatusRunId.toString(),
                ingestionPipeline.getFullyQualifiedName(),
                PIPELINE_STATUS_EXTENSION),
        PipelineStatus.class);
  }

  /** Handles entity updated from PUT and POST operation. */
  public class IngestionPipelineUpdater extends EntityUpdater {
    public IngestionPipelineUpdater(
        IngestionPipeline original, IngestionPipeline updated, Operation operation) {
      super(buildIngestionPipelineDecrypted(original), updated, operation);
    }

    @Transaction
    @Override
    public void entitySpecificUpdate() {
      updateSourceConfig();
      updateAirflowConfig(original.getAirflowConfig(), updated.getAirflowConfig());
      updateLogLevel(original.getLoggerLevel(), updated.getLoggerLevel());
      updateEnabled(original.getEnabled(), updated.getEnabled());
      updateDeployed(original.getDeployed(), updated.getDeployed());
    }

    private void updateSourceConfig() {
      JSONObject origSourceConfig =
          new JSONObject(JsonUtils.pojoToJson(original.getSourceConfig().getConfig()));
      JSONObject updatedSourceConfig =
          new JSONObject(JsonUtils.pojoToJson(updated.getSourceConfig().getConfig()));

      if (!origSourceConfig.similar(updatedSourceConfig)) {
        recordChange("sourceConfig", "old-encrypted-value", "new-encrypted-value", true);
      }
    }

    private void updateAirflowConfig(
        AirflowConfig origAirflowConfig, AirflowConfig updatedAirflowConfig) {
      if (!origAirflowConfig.equals(updatedAirflowConfig)) {
        recordChange("airflowConfig", origAirflowConfig, updatedAirflowConfig);
      }
    }

    private void updateLogLevel(LogLevels origLevel, LogLevels updatedLevel) {
      if (updatedLevel != null && !origLevel.equals(updatedLevel)) {
        recordChange("loggerLevel", origLevel, updatedLevel);
      }
    }

    private void updateDeployed(Boolean origDeployed, Boolean updatedDeployed) {
      if (updatedDeployed != null && !origDeployed.equals(updatedDeployed)) {
        recordChange("deployed", origDeployed, updatedDeployed);
      }
    }

    private void updateEnabled(Boolean origEnabled, Boolean updatedEnabled) {
      if (updatedEnabled != null && !origEnabled.equals(updatedEnabled)) {
        recordChange("enabled", origEnabled, updatedEnabled);
      }
    }
  }

  private static IngestionPipeline buildIngestionPipelineDecrypted(IngestionPipeline original) {
    IngestionPipeline decrypted =
        JsonUtils.convertValue(JsonUtils.getMap(original), IngestionPipeline.class);
    SecretsManagerFactory.getSecretsManager().decryptIngestionPipeline(decrypted);
    return decrypted;
  }

  public static void validateProfileSample(IngestionPipeline ingestionPipeline) {

    JSONObject sourceConfigJson =
        new JSONObject(JsonUtils.pojoToJson(ingestionPipeline.getSourceConfig().getConfig()));
    String profileSampleType = sourceConfigJson.optString("profileSampleType");
    double profileSample = sourceConfigJson.optDouble("profileSample");

    EntityUtil.validateProfileSample(profileSampleType, profileSample);
  }
}
