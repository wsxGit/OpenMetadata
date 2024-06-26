/*
 *  Copyright 2022 Collate
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

package org.openmetadata.service.workflows.searchIndex;

import static org.openmetadata.service.apps.bundles.searchIndex.SearchIndexApp.TIME_SERIES_ENTITIES;
import static org.openmetadata.service.search.SearchClient.GLOBAL_SEARCH_ALIAS;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.ws.rs.core.Response;
import lombok.SneakyThrows;
import org.openmetadata.common.utils.CommonUtil;
import org.openmetadata.schema.system.EntityError;
import org.openmetadata.schema.system.StepStats;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.jdbi3.EntityRepository;
import org.openmetadata.service.jdbi3.EntityTimeSeriesRepository;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.search.SearchRequest;
import org.openmetadata.service.util.JsonUtils;
import os.org.opensearch.action.bulk.BulkItemResponse;
import os.org.opensearch.action.bulk.BulkResponse;

public class ReindexingUtil {
  private ReindexingUtil() {
    /*unused*/
  }

  public static final String ENTITY_TYPE_KEY = "entityType";
  public static final String ENTITY_NAME_LIST_KEY = "entityNameList";

  public static void getUpdatedStats(StepStats stats, int currentSuccess, int currentFailed) {
    stats.setSuccessRecords(stats.getSuccessRecords() + currentSuccess);
    stats.setFailedRecords(stats.getFailedRecords() + currentFailed);
  }

  public static boolean isDataInsightIndex(String entityType) {
    return Entity.getSearchRepository().getDataInsightReports().contains(entityType);
  }

  public static int getTotalRequestToProcess(Set<String> entities, CollectionDAO dao) {
    int total = 0;
    for (String entityType : entities) {
      if (!TIME_SERIES_ENTITIES.contains(entityType)) {
        EntityRepository<?> repository = Entity.getEntityRepository(entityType);
        total += repository.getDao().listTotalCount();
      } else {
        EntityTimeSeriesRepository<?> repository;
        ListFilter listFilter = new ListFilter(null);
        if (isDataInsightIndex(entityType)) {
          listFilter.addQueryParam("entityFQNHash", entityType);
          repository = Entity.getEntityTimeSeriesRepository(Entity.ENTITY_REPORT_DATA);
        } else {
          repository = Entity.getEntityTimeSeriesRepository(entityType);
        }
        total += repository.getTimeSeriesDao().listCount(listFilter);
      }
    }
    return total;
  }

  public static int getSuccessFromBulkResponse(BulkResponse response) {
    int success = 0;
    for (BulkItemResponse bulkItemResponse : response) {
      if (!bulkItemResponse.isFailed()) {
        success++;
      }
    }
    return success;
  }

  public static List<EntityError> getErrorsFromBulkResponse(BulkResponse response) {
    List<EntityError> entityErrors = new ArrayList<>();
    for (BulkItemResponse bulkItemResponse : response) {
      if (bulkItemResponse.isFailed()) {
        entityErrors.add(
            new EntityError()
                .withMessage(bulkItemResponse.getFailureMessage())
                .withEntity(bulkItemResponse.getItemId()));
      }
    }
    return entityErrors;
  }

  public static List<EntityError> getErrorsFromBulkResponse(
      es.org.elasticsearch.action.bulk.BulkResponse response) {
    List<EntityError> entityErrors = new ArrayList<>();
    for (es.org.elasticsearch.action.bulk.BulkItemResponse bulkItemResponse : response) {
      if (bulkItemResponse.isFailed()) {
        entityErrors.add(
            new EntityError()
                .withMessage(bulkItemResponse.getFailureMessage())
                .withEntity(bulkItemResponse.getItemId()));
      }
    }
    return entityErrors;
  }

  public static int getSuccessFromBulkResponseEs(
      es.org.elasticsearch.action.bulk.BulkResponse response) {
    int success = 0;
    for (es.org.elasticsearch.action.bulk.BulkItemResponse bulkItemResponse : response) {
      if (!bulkItemResponse.isFailed()) {
        success++;
      }
    }
    return success;
  }

  @SneakyThrows
  public static List<EntityReference> findReferenceInElasticSearchAcrossAllIndexes(
      String matchingKey, String sourceFqn, int from) {
    String key = "_source";
    SearchRequest searchRequest =
        new SearchRequest.ElasticSearchRequestBuilder(
                String.format("(%s:\"%s\")", matchingKey, sourceFqn),
                100,
                Entity.getSearchRepository().getIndexOrAliasName(GLOBAL_SEARCH_ALIAS))
            .from(from)
            .fetchSource(true)
            .trackTotalHits(false)
            .sortFieldParam("_score")
            .deleted(false)
            .sortOrder("desc")
            .includeSourceFields(new ArrayList<>())
            .build();
    List<EntityReference> entities = new ArrayList<>();
    Response response = Entity.getSearchRepository().search(searchRequest);
    String json = (String) response.getEntity();

    for (Iterator<JsonNode> it =
            ((ArrayNode) JsonUtils.extractValue(json, "hits", "hits")).elements();
        it.hasNext(); ) {
      JsonNode jsonNode = it.next();
      String id = JsonUtils.extractValue(jsonNode, key, "id");
      String fqn = JsonUtils.extractValue(jsonNode, key, "fullyQualifiedName");
      String type = JsonUtils.extractValue(jsonNode, key, "entityType");
      if (!CommonUtil.nullOrEmpty(fqn) && !CommonUtil.nullOrEmpty(type)) {
        entities.add(
            new EntityReference()
                .withId(UUID.fromString(id))
                .withFullyQualifiedName(fqn)
                .withType(type));
      }
    }

    return entities;
  }
}
