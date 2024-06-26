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

import static org.openmetadata.common.utils.CommonUtil.listOrEmpty;
import static org.openmetadata.schema.type.Include.ALL;
import static org.openmetadata.service.Entity.DASHBOARD;
import static org.openmetadata.service.Entity.FIELD_DESCRIPTION;
import static org.openmetadata.service.Entity.FIELD_TAGS;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.entity.data.Chart;
import org.openmetadata.schema.entity.data.Dashboard;
import org.openmetadata.schema.entity.services.DashboardService;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.Relationship;
import org.openmetadata.schema.type.TaskType;
import org.openmetadata.service.Entity;
import org.openmetadata.service.exception.CatalogExceptionMessage;
import org.openmetadata.service.jdbi3.FeedRepository.TaskWorkflow;
import org.openmetadata.service.jdbi3.FeedRepository.ThreadContext;
import org.openmetadata.service.resources.dashboards.DashboardResource;
import org.openmetadata.service.resources.feeds.MessageParser.EntityLink;
import org.openmetadata.service.util.EntityUtil;
import org.openmetadata.service.util.EntityUtil.Fields;
import org.openmetadata.service.util.FullyQualifiedName;

public class DashboardRepository extends EntityRepository<Dashboard> {
  private static final String DASHBOARD_UPDATE_FIELDS = "charts,dataModels";
  private static final String DASHBOARD_PATCH_FIELDS = "charts,dataModels";
  private static final String DASHBOARD_URL = "sourceUrl";

  public DashboardRepository() {
    super(
        DashboardResource.COLLECTION_PATH,
        Entity.DASHBOARD,
        Dashboard.class,
        Entity.getCollectionDAO().dashboardDAO(),
        DASHBOARD_PATCH_FIELDS,
        DASHBOARD_UPDATE_FIELDS);
    supportsSearch = true;
  }

  @Override
  public void setFullyQualifiedName(Dashboard dashboard) {
    dashboard.setFullyQualifiedName(
        FullyQualifiedName.add(
            dashboard.getService().getFullyQualifiedName(), dashboard.getName()));
  }

  @Override
  public TaskWorkflow getTaskWorkflow(ThreadContext threadContext) {
    EntityLink entityLink = threadContext.getAbout();
    if (entityLink.getFieldName().equals("charts")) {
      TaskType taskType = threadContext.getThread().getTask().getType();
      if (entityLink.getArrayFieldValue() != null) {
        return new ChartDescriptionAndTagTaskWorkflow(threadContext);
      }
      throw new IllegalArgumentException(
          CatalogExceptionMessage.invalidFieldForTask(entityLink.getFieldName(), taskType));
    }
    return super.getTaskWorkflow(threadContext);
  }

  static class ChartDescriptionAndTagTaskWorkflow extends DescriptionTaskWorkflow {
    ChartDescriptionAndTagTaskWorkflow(ThreadContext threadContext) {
      super(threadContext);
      EntityLink entityLink = threadContext.getAbout();
      Dashboard dashboard =
          Entity.getEntity(DASHBOARD, threadContext.getAboutEntity().getId(), "charts", ALL);
      String chartName = threadContext.getAbout().getArrayFieldName();
      EntityReference chartReference =
          dashboard.getCharts().stream()
              .filter(c -> c.getName().equals(chartName))
              .findFirst()
              .orElseThrow(
                  () ->
                      new IllegalArgumentException(
                          CatalogExceptionMessage.invalidFieldName("chart", chartName)));
      Chart chart = Entity.getEntity(chartReference, "", ALL);
      if (entityLink.getArrayFieldValue().equals(FIELD_DESCRIPTION)) {
        threadContext.setAbout(
            new EntityLink(
                Entity.CHART, chart.getFullyQualifiedName(), FIELD_DESCRIPTION, null, null));
      } else if (entityLink.getArrayFieldValue().equals(FIELD_TAGS)) {
        threadContext.setAbout(
            new EntityLink(Entity.CHART, chart.getFullyQualifiedName(), FIELD_TAGS, null, null));
      }
      threadContext.setAboutEntity(chart);
    }
  }

  @Override
  public void setFields(Dashboard dashboard, Fields fields) {
    dashboard.setService(getContainer(dashboard.getId()));
    dashboard.setCharts(
        fields.contains("charts") ? getRelatedEntities(dashboard, Entity.CHART) : null);
    dashboard.setDataModels(
        fields.contains("dataModels")
            ? getRelatedEntities(dashboard, Entity.DASHBOARD_DATA_MODEL)
            : null);
    if (dashboard.getUsageSummary() == null) {
      dashboard.withUsageSummary(
          fields.contains("usageSummary")
              ? EntityUtil.getLatestUsage(daoCollection.usageDAO(), dashboard.getId())
              : null);
    }
  }

  @Override
  public void clearFields(Dashboard dashboard, Fields fields) {
    dashboard.setCharts(fields.contains("charts") ? dashboard.getCharts() : null);
    dashboard.setDataModels(fields.contains("dataModels") ? dashboard.getDataModels() : null);
    dashboard.withUsageSummary(
        fields.contains("usageSummary") ? dashboard.getUsageSummary() : null);
  }

  @Override
  public void restorePatchAttributes(Dashboard original, Dashboard updated) {
    // Patch can't make changes to following fields. Ignore the changes
    super.restorePatchAttributes(original, updated);
    updated.withService(original.getService());
  }

  private void populateService(Dashboard dashboard) {
    DashboardService service = Entity.getEntity(dashboard.getService(), "", Include.NON_DELETED);
    dashboard.setService(service.getEntityReference());
    dashboard.setServiceType(service.getServiceType());
  }

  @Override
  public void prepare(Dashboard dashboard, boolean update) {
    populateService(dashboard);
    dashboard.setCharts(EntityUtil.getEntityReferences(dashboard.getCharts(), Include.NON_DELETED));
    dashboard.setDataModels(
        EntityUtil.getEntityReferences(dashboard.getDataModels(), Include.NON_DELETED));
  }

  @Override
  public void storeEntity(Dashboard dashboard, boolean update) {
    // Relationships and fields such as service are not stored as part of json
    EntityReference service = dashboard.getService();
    List<EntityReference> charts = dashboard.getCharts();
    List<EntityReference> dataModels = dashboard.getDataModels();

    dashboard.withService(null).withCharts(null).withDataModels(null);
    store(dashboard, update);
    dashboard.withService(service).withCharts(charts).withDataModels(dataModels);
  }

  @Override
  public void storeRelationships(Dashboard dashboard) {
    addServiceRelationship(dashboard, dashboard.getService());

    // Add relationship from dashboard to chart
    for (EntityReference chart : listOrEmpty(dashboard.getCharts())) {
      addRelationship(
          dashboard.getId(), chart.getId(), Entity.DASHBOARD, Entity.CHART, Relationship.HAS);
    }

    // Add relationship from dashboard to data models
    for (EntityReference dataModel : listOrEmpty(dashboard.getDataModels())) {
      addRelationship(
          dashboard.getId(),
          dataModel.getId(),
          Entity.DASHBOARD,
          Entity.DASHBOARD_DATA_MODEL,
          Relationship.HAS);
    }
  }

  @Override
  public EntityUpdater getUpdater(Dashboard original, Dashboard updated, Operation operation) {
    return new DashboardUpdater(original, updated, operation);
  }

  @Override
  public EntityInterface getParentEntity(Dashboard entity, String fields) {
    return Entity.getEntity(entity.getService(), fields, Include.ALL);
  }

  private List<EntityReference> getRelatedEntities(Dashboard dashboard, String entityType) {
    return dashboard == null
        ? Collections.emptyList()
        : findTo(dashboard.getId(), Entity.DASHBOARD, Relationship.HAS, entityType);
  }

  /** Handles entity updated from PUT and POST operation. */
  public class DashboardUpdater extends EntityUpdater {
    public DashboardUpdater(Dashboard original, Dashboard updated, Operation operation) {
      super(original, updated, operation);
    }

    @Transaction
    @Override
    public void entitySpecificUpdate() {
      update(
          Entity.CHART,
          "charts",
          listOrEmpty(updated.getCharts()),
          listOrEmpty(original.getCharts()));
      update(
          Entity.DASHBOARD_DATA_MODEL,
          "dataModels",
          listOrEmpty(updated.getDataModels()),
          listOrEmpty(original.getDataModels()));
      updateDashboardUrl(original, updated);
      recordChange("sourceHash", original.getSourceHash(), updated.getSourceHash());
    }

    private void update(
        String entityType,
        String field,
        List<EntityReference> updEntities,
        List<EntityReference> oriEntities) {
      // Remove all entity type associated with this dashboard
      deleteFrom(updated.getId(), Entity.DASHBOARD, Relationship.HAS, entityType);

      // Add relationship from dashboard to entity type
      for (EntityReference entity : updEntities) {
        addRelationship(
            updated.getId(), entity.getId(), Entity.DASHBOARD, entityType, Relationship.HAS);
      }

      List<EntityReference> added = new ArrayList<>();
      List<EntityReference> deleted = new ArrayList<>();
      recordListChange(
          field, oriEntities, updEntities, added, deleted, EntityUtil.entityReferenceMatch);
    }

    public void updateDashboardUrl(Dashboard original, Dashboard updated) {
      recordChange(DASHBOARD_URL, original.getSourceUrl(), updated.getSourceUrl());
    }
  }
}
