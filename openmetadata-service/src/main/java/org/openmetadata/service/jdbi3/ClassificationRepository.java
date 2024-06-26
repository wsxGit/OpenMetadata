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

import static org.openmetadata.service.Entity.CLASSIFICATION;
import static org.openmetadata.service.Entity.TAG;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.jdbi.v3.core.mapper.RowMapper;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.schema.entity.classification.Classification;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.ProviderType;
import org.openmetadata.schema.type.Relationship;
import org.openmetadata.schema.type.TagLabel;
import org.openmetadata.schema.type.TagLabel.TagSource;
import org.openmetadata.service.Entity;
import org.openmetadata.service.exception.CatalogExceptionMessage;
import org.openmetadata.service.jdbi3.CollectionDAO.EntityRelationshipRecord;
import org.openmetadata.service.resources.tags.ClassificationResource;
import org.openmetadata.service.util.EntityUtil.Fields;

@Slf4j
public class ClassificationRepository extends EntityRepository<Classification> {
  public ClassificationRepository() {
    super(
        ClassificationResource.TAG_COLLECTION_PATH,
        Entity.CLASSIFICATION,
        Classification.class,
        Entity.getCollectionDAO().classificationDAO(),
        "",
        "");
    quoteFqn = true;
    supportsSearch = true;
    renameAllowed = true;
  }

  @Override
  public EntityUpdater getUpdater(
      Classification original, Classification updated, Operation operation) {
    return new ClassificationUpdater(original, updated, operation);
  }

  @Override
  public void setFields(Classification classification, Fields fields) {
    classification.withTermCount(
        fields.contains("termCount") ? getTermCount(classification) : null);
    classification.withUsageCount(
        fields.contains("usageCount") ? getUsageCount(classification) : null);
  }

  @Override
  public void clearFields(Classification classification, Fields fields) {
    classification.withTermCount(
        fields.contains("termCount") ? classification.getTermCount() : null);
    classification.withUsageCount(
        fields.contains("usageCount") ? classification.getUsageCount() : null);
  }

  @Override
  public void prepare(Classification entity, boolean update) {
    /* Nothing to do */
  }

  @Override
  public void storeEntity(Classification classification, boolean update) {
    store(classification, update);
  }

  @Override
  public void storeRelationships(Classification entity) {
    // No relationships to store beyond what is stored in the super class
  }

  private int getTermCount(Classification classification) {
    ListFilter filter =
        new ListFilter(Include.NON_DELETED)
            .addQueryParam("parent", classification.getFullyQualifiedName());
    return daoCollection.tagDAO().listCount(filter);
  }

  private Integer getUsageCount(Classification classification) {
    return daoCollection
        .tagUsageDAO()
        .getTagCount(TagSource.CLASSIFICATION.ordinal(), classification.getFullyQualifiedName());
  }

  public static class TagLabelMapper implements RowMapper<TagLabel> {
    @Override
    public TagLabel map(ResultSet r, org.jdbi.v3.core.statement.StatementContext ctx)
        throws SQLException {
      return new TagLabel()
          .withLabelType(TagLabel.LabelType.values()[r.getInt("labelType")])
          .withState(TagLabel.State.values()[r.getInt("state")])
          .withTagFQN(r.getString("tagFQN"));
    }
  }

  public class ClassificationUpdater extends EntityUpdater {
    public ClassificationUpdater(
        Classification original, Classification updated, Operation operation) {
      super(original, updated, operation);
    }

    @Transaction
    @Override
    public void entitySpecificUpdate() {
      // Mutually exclusive cannot be updated
      updated.setMutuallyExclusive(original.getMutuallyExclusive());
      recordChange("disabled", original.getDisabled(), updated.getDisabled());
      updateName(original, updated);
    }

    public void updateName(Classification original, Classification updated) {
      if (!original.getName().equals(updated.getName())) {
        if (ProviderType.SYSTEM.equals(original.getProvider())) {
          throw new IllegalArgumentException(
              CatalogExceptionMessage.systemEntityRenameNotAllowed(original.getName(), entityType));
        }
        // Classification name changed - update tag names starting from classification and all the
        // children tags
        LOG.info(
            "Classification name changed from {} to {}", original.getName(), updated.getName());
        setFullyQualifiedName(updated);
        daoCollection.tagDAO().updateFqn(original.getName(), updated.getName());
        daoCollection
            .tagUsageDAO()
            .updateTagPrefix(
                TagSource.CLASSIFICATION.ordinal(), original.getName(), updated.getName());
        recordChange("name", original.getName(), updated.getName());
        invalidateClassification(original.getId());
      }
    }

    private void invalidateClassification(UUID classificationId) {
      // Name of the classification changed. Invalidate the classification and all the children tags
      CACHE_WITH_ID.invalidate(new ImmutablePair<>(CLASSIFICATION, classificationId));
      List<EntityRelationshipRecord> tagRecords =
          findToRecords(classificationId, CLASSIFICATION, Relationship.CONTAINS, TAG);
      for (EntityRelationshipRecord tagRecord : tagRecords) {
        invalidateTags(tagRecord.getId());
      }
    }

    private void invalidateTags(UUID tagId) {
      // The name of the tag changed. Invalidate that tag and all the children from the cache
      List<EntityRelationshipRecord> tagRecords =
          findToRecords(tagId, TAG, Relationship.CONTAINS, TAG);
      CACHE_WITH_ID.invalidate(new ImmutablePair<>(TAG, tagId));
      for (EntityRelationshipRecord tagRecord : tagRecords) {
        invalidateTags(tagRecord.getId());
      }
    }
  }
}
