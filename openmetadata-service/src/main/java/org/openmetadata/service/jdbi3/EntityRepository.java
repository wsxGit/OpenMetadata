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
import static org.openmetadata.common.utils.CommonUtil.nullOrEmpty;
import static org.openmetadata.schema.type.EventType.ENTITY_CREATED;
import static org.openmetadata.schema.type.EventType.ENTITY_DELETED;
import static org.openmetadata.schema.type.EventType.ENTITY_FIELDS_CHANGED;
import static org.openmetadata.schema.type.EventType.ENTITY_NO_CHANGE;
import static org.openmetadata.schema.type.EventType.ENTITY_RESTORED;
import static org.openmetadata.schema.type.EventType.ENTITY_SOFT_DELETED;
import static org.openmetadata.schema.type.EventType.ENTITY_UPDATED;
import static org.openmetadata.schema.type.Include.ALL;
import static org.openmetadata.schema.type.Include.DELETED;
import static org.openmetadata.schema.type.Include.NON_DELETED;
import static org.openmetadata.schema.utils.EntityInterfaceUtil.quoteName;
import static org.openmetadata.service.Entity.ADMIN_USER_NAME;
import static org.openmetadata.service.Entity.DATA_PRODUCT;
import static org.openmetadata.service.Entity.DOMAIN;
import static org.openmetadata.service.Entity.FIELD_CHILDREN;
import static org.openmetadata.service.Entity.FIELD_DATA_PRODUCTS;
import static org.openmetadata.service.Entity.FIELD_DELETED;
import static org.openmetadata.service.Entity.FIELD_DESCRIPTION;
import static org.openmetadata.service.Entity.FIELD_DISPLAY_NAME;
import static org.openmetadata.service.Entity.FIELD_DOMAIN;
import static org.openmetadata.service.Entity.FIELD_EXPERTS;
import static org.openmetadata.service.Entity.FIELD_EXTENSION;
import static org.openmetadata.service.Entity.FIELD_FOLLOWERS;
import static org.openmetadata.service.Entity.FIELD_LIFE_CYCLE;
import static org.openmetadata.service.Entity.FIELD_OWNER;
import static org.openmetadata.service.Entity.FIELD_REVIEWERS;
import static org.openmetadata.service.Entity.FIELD_STYLE;
import static org.openmetadata.service.Entity.FIELD_TAGS;
import static org.openmetadata.service.Entity.FIELD_VOTES;
import static org.openmetadata.service.Entity.TEAM;
import static org.openmetadata.service.Entity.USER;
import static org.openmetadata.service.Entity.getEntityByName;
import static org.openmetadata.service.Entity.getEntityFields;
import static org.openmetadata.service.exception.CatalogExceptionMessage.csvNotSupported;
import static org.openmetadata.service.exception.CatalogExceptionMessage.entityNotFound;
import static org.openmetadata.service.resources.tags.TagLabelUtil.addDerivedTags;
import static org.openmetadata.service.resources.tags.TagLabelUtil.checkMutuallyExclusive;
import static org.openmetadata.service.util.EntityUtil.compareTagLabel;
import static org.openmetadata.service.util.EntityUtil.entityReferenceMatch;
import static org.openmetadata.service.util.EntityUtil.fieldAdded;
import static org.openmetadata.service.util.EntityUtil.fieldDeleted;
import static org.openmetadata.service.util.EntityUtil.fieldUpdated;
import static org.openmetadata.service.util.EntityUtil.getColumnField;
import static org.openmetadata.service.util.EntityUtil.getEntityReferences;
import static org.openmetadata.service.util.EntityUtil.getExtensionField;
import static org.openmetadata.service.util.EntityUtil.getId;
import static org.openmetadata.service.util.EntityUtil.nextMajorVersion;
import static org.openmetadata.service.util.EntityUtil.nextVersion;
import static org.openmetadata.service.util.EntityUtil.objectMatch;
import static org.openmetadata.service.util.EntityUtil.tagLabelMatch;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.annotations.VisibleForTesting;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.util.concurrent.UncheckedExecutionException;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.ValidationMessage;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.function.BiPredicate;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.json.JsonPatch;
import javax.validation.constraints.NotNull;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.UriInfo;
import lombok.Getter;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.common.utils.CommonUtil;
import org.openmetadata.schema.CreateEntity;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.api.VoteRequest;
import org.openmetadata.schema.api.VoteRequest.VoteType;
import org.openmetadata.schema.api.feed.ResolveTask;
import org.openmetadata.schema.api.teams.CreateTeam;
import org.openmetadata.schema.entity.data.Table;
import org.openmetadata.schema.entity.feed.Suggestion;
import org.openmetadata.schema.entity.teams.Team;
import org.openmetadata.schema.entity.teams.User;
import org.openmetadata.schema.system.EntityError;
import org.openmetadata.schema.type.ApiStatus;
import org.openmetadata.schema.type.ChangeDescription;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.schema.type.Column;
import org.openmetadata.schema.type.EntityHistory;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.EventType;
import org.openmetadata.schema.type.FieldChange;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.LifeCycle;
import org.openmetadata.schema.type.ProviderType;
import org.openmetadata.schema.type.Relationship;
import org.openmetadata.schema.type.SuggestionType;
import org.openmetadata.schema.type.TagLabel;
import org.openmetadata.schema.type.TaskType;
import org.openmetadata.schema.type.ThreadType;
import org.openmetadata.schema.type.Votes;
import org.openmetadata.schema.type.api.BulkAssets;
import org.openmetadata.schema.type.api.BulkOperationResult;
import org.openmetadata.schema.type.api.BulkResponse;
import org.openmetadata.schema.type.csv.CsvImportResult;
import org.openmetadata.schema.utils.EntityInterfaceUtil;
import org.openmetadata.service.Entity;
import org.openmetadata.service.OpenMetadataApplicationConfig;
import org.openmetadata.service.TypeRegistry;
import org.openmetadata.service.exception.CatalogExceptionMessage;
import org.openmetadata.service.exception.EntityNotFoundException;
import org.openmetadata.service.exception.UnhandledServerException;
import org.openmetadata.service.jdbi3.CollectionDAO.EntityRelationshipRecord;
import org.openmetadata.service.jdbi3.CollectionDAO.EntityVersionPair;
import org.openmetadata.service.jdbi3.CollectionDAO.ExtensionRecord;
import org.openmetadata.service.jdbi3.FeedRepository.TaskWorkflow;
import org.openmetadata.service.jdbi3.FeedRepository.ThreadContext;
import org.openmetadata.service.resources.tags.TagLabelUtil;
import org.openmetadata.service.search.SearchClient;
import org.openmetadata.service.search.SearchListFilter;
import org.openmetadata.service.search.SearchRepository;
import org.openmetadata.service.search.SearchSortFilter;
import org.openmetadata.service.util.EntityUtil;
import org.openmetadata.service.util.EntityUtil.Fields;
import org.openmetadata.service.util.FullyQualifiedName;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.RestUtil;
import org.openmetadata.service.util.RestUtil.DeleteResponse;
import org.openmetadata.service.util.RestUtil.PatchResponse;
import org.openmetadata.service.util.RestUtil.PutResponse;
import org.openmetadata.service.util.ResultList;

/**
 * This is the base class used by Entity Resources to perform READ and WRITE operations to the backend database to
 * Create, Retrieve, Update, and Delete entities.
 *
 * <p>An entity has two types of fields - `attributes` and `relationships`.
 *
 * <ul>
 *   <li>The `attributes` are the core properties of the entity, example - entity id, name, fullyQualifiedName, columns
 *       for a table, etc.
 *   <li>The `relationships` are an associated between two entities, example - table belongs to a database, table has a
 *       tag, user owns a table, etc. All relationships are captured using {@code EntityReference}.
 * </ul>
 *
 * Entities are stored as JSON documents in the database. Each entity is stored in a separate table and is accessed
 * through a <i>Data Access Object</i> or <i>DAO</i> that corresponds to each of the entity. For example,
 * <i>table_entity</i> is the database table used to store JSON docs corresponding to <i>table</i> entity and {@link
 * org.openmetadata.service.jdbi3.CollectionDAO.TableDAO} is used as the DAO object to access the table_entity table.
 * All DAO objects for an entity are available in {@code daoCollection}. <br>
 * <br>
 * Relationships between entity is stored in a separate table that captures the edge - fromEntity, toEntity, and the
 * relationship name <i>entity_relationship</i> table and are supported by {@link
 * org.openmetadata.service.jdbi3.CollectionDAO.EntityRelationshipDAO} DAO object.
 *
 * <p>JSON document of an entity stores only <i>required</i> attributes of an entity. Some attributes such as
 * <i>href</i> are not stored and are created on the fly. <br>
 * <br>
 * Json document of an entity does not store relationships. As an example, JSON document for <i>table</i> entity does
 * not store the relationship <i>database</i> which is of type <i>EntityReference</i>. This is always retrieved from the
 * relationship table when required to ensure, the data stored is efficiently and consistently, and relationship
 * information does not become stale.
 */
@Slf4j
@Repository()
public abstract class EntityRepository<T extends EntityInterface> {

  public static final LoadingCache<Pair<String, String>, EntityInterface> CACHE_WITH_NAME =
      CacheBuilder.newBuilder()
          .maximumSize(5000)
          .expireAfterWrite(30, TimeUnit.SECONDS)
          .recordStats()
          .build(new EntityLoaderWithName());
  public static final LoadingCache<Pair<String, UUID>, EntityInterface> CACHE_WITH_ID =
      CacheBuilder.newBuilder()
          .maximumSize(5000)
          .expireAfterWrite(30, TimeUnit.SECONDS)
          .recordStats()
          .build(new EntityLoaderWithId());
  private final String collectionPath;
  private final Class<T> entityClass;
  @Getter protected final String entityType;
  @Getter protected final EntityDAO<T> dao;
  @Getter protected final CollectionDAO daoCollection;
  @Getter protected final SearchRepository searchRepository;
  @Getter protected final Set<String> allowedFields;
  public final boolean supportsSoftDelete;
  @Getter protected final boolean supportsTags;
  @Getter protected final boolean supportsOwner;
  @Getter protected final boolean supportsStyle;
  @Getter protected final boolean supportsLifeCycle;
  protected final boolean supportsFollower;
  protected final boolean supportsExtension;
  protected final boolean supportsVotes;
  @Getter protected final boolean supportsDomain;
  protected final boolean supportsDataProducts;
  @Getter protected final boolean supportsReviewers;
  @Getter protected final boolean supportsExperts;
  protected boolean quoteFqn =
      false; // Entity FQNS not hierarchical such user, teams, services need to be quoted
  protected boolean renameAllowed = false; // Entity can be renamed

  /** Fields that can be updated during PATCH operation */
  @Getter private final Fields patchFields;

  /** Fields that can be updated during PUT operation */
  @Getter protected final Fields putFields;

  protected boolean supportsSearch = false;

  protected EntityRepository(
      String collectionPath,
      String entityType,
      Class<T> entityClass,
      EntityDAO<T> entityDAO,
      String patchFields,
      String putFields) {
    this.collectionPath = collectionPath;
    this.entityClass = entityClass;
    allowedFields = getEntityFields(entityClass);
    this.dao = entityDAO;
    this.daoCollection = Entity.getCollectionDAO();
    this.searchRepository = Entity.getSearchRepository();
    this.entityType = entityType;
    this.patchFields = getFields(patchFields);
    this.putFields = getFields(putFields);

    this.supportsTags = allowedFields.contains(FIELD_TAGS);
    if (supportsTags) {
      this.patchFields.addField(allowedFields, FIELD_TAGS);
      this.putFields.addField(allowedFields, FIELD_TAGS);
    }
    this.supportsOwner = allowedFields.contains(FIELD_OWNER);
    if (supportsOwner) {
      this.patchFields.addField(allowedFields, FIELD_OWNER);
      this.putFields.addField(allowedFields, FIELD_OWNER);
    }
    this.supportsSoftDelete = allowedFields.contains(FIELD_DELETED);
    this.supportsFollower = allowedFields.contains(FIELD_FOLLOWERS);
    if (supportsFollower) {
      this.patchFields.addField(allowedFields, FIELD_FOLLOWERS);
      this.putFields.addField(allowedFields, FIELD_FOLLOWERS);
    }
    this.supportsExtension = allowedFields.contains(FIELD_EXTENSION);
    if (supportsExtension) {
      this.patchFields.addField(allowedFields, FIELD_EXTENSION);
      this.putFields.addField(allowedFields, FIELD_EXTENSION);
    }
    this.supportsVotes = allowedFields.contains(FIELD_VOTES);
    if (supportsVotes) {
      this.patchFields.addField(allowedFields, FIELD_VOTES);
      this.putFields.addField(allowedFields, FIELD_VOTES);
    }
    this.supportsDomain = allowedFields.contains(FIELD_DOMAIN);
    if (supportsDomain) {
      this.patchFields.addField(allowedFields, FIELD_DOMAIN);
      this.putFields.addField(allowedFields, FIELD_DOMAIN);
    }
    this.supportsReviewers = allowedFields.contains(FIELD_REVIEWERS);
    if (supportsReviewers) {
      this.patchFields.addField(allowedFields, FIELD_REVIEWERS);
      this.putFields.addField(allowedFields, FIELD_REVIEWERS);
    }
    this.supportsExperts = allowedFields.contains(FIELD_EXPERTS);
    if (supportsExperts) {
      this.patchFields.addField(allowedFields, FIELD_EXPERTS);
      this.putFields.addField(allowedFields, FIELD_EXPERTS);
    }
    this.supportsDataProducts = allowedFields.contains(FIELD_DATA_PRODUCTS);
    if (supportsDataProducts) {
      this.patchFields.addField(allowedFields, FIELD_DATA_PRODUCTS);
      this.putFields.addField(allowedFields, FIELD_DATA_PRODUCTS);
    }
    this.supportsStyle = allowedFields.contains(FIELD_STYLE);
    if (supportsStyle) {
      this.patchFields.addField(allowedFields, FIELD_STYLE);
      this.putFields.addField(allowedFields, FIELD_STYLE);
    }
    this.supportsLifeCycle = allowedFields.contains(FIELD_LIFE_CYCLE);
    if (supportsLifeCycle) {
      this.patchFields.addField(allowedFields, FIELD_LIFE_CYCLE);
      this.putFields.addField(allowedFields, FIELD_LIFE_CYCLE);
    }
    Entity.registerEntity(entityClass, entityType, this);
  }

  /**
   * Set the requested fields in an entity. This is used for requesting specific fields in the object during GET
   * operations. It is also used during PUT and PATCH operations to set up fields that can be updated.
   */
  protected abstract void setFields(T entity, Fields fields);

  /**
   * Set the requested fields in an entity. This is used for requesting specific fields in the object during GET
   * operations. It is also used during PUT and PATCH operations to set up fields that can be updated.
   */
  protected abstract void clearFields(T entity, Fields fields);

  /**
   * This method is used for validating an entity to be created during POST, PUT, and PATCH operations and prepare the
   * entity with all the required attributes and relationships.
   *
   * <p>The implementation of this method must perform the following:
   *
   * <ol>
   *   <li>Prepare the values for attributes that are not required in the request but can be derived on the server side.
   *       Example - <i>>FullyQualifiedNames</i> of an entity can be derived from the hierarchy that an entity belongs
   *       to .
   *   <li>Validate all the attributes of an entity.
   *   <li>Validate all the relationships of an entity. As an example - during <i>table</i> creation, relationships such
   *       as <i>Tags</i>, <i>Owner</i>, <i>Database</i>a table belongs to are validated. During validation additional
   *       information that is not required in the create/update request are set up in the corresponding relationship
   *       fields.
   * </ol>
   *
   * At the end of this operation, entity is expected to be valid and fully constructed with all the fields that will be
   * sent as payload in the POST, PUT, and PATCH operations response.
   *
   * @see TableRepository#prepare(Table, boolean) for an example implementation
   */
  protected abstract void prepare(T entity, boolean update);

  /**
   * An entity is stored in the backend database as JSON document. The JSON includes some attributes of the entity and
   * does not include attributes such as <i>href</i>. The relationship fields of an entity is never stored in the JSON
   * document. It is always reconstructed based on relationship edges from the backend database. <br>
   * <br>
   * As an example, when <i>table</i> entity is stored, the attributes such as <i>href</i> and the relationships such as
   * <i>owner</i>, <i>database</i>, and <i>tags</i> are set to null. These attributes are restored back after the JSON
   * document is stored to be sent as response.
   *
   * @see TableRepository#storeEntity(Table, boolean) for an example implementation
   */
  protected abstract void storeEntity(T entity, boolean update);

  /**
   * This method is called to store all the relationships of an entity. It is expected that all relationships are
   * already validated and completely setup before this method is called and no validation of relationships is required.
   *
   * @see TableRepository#storeRelationships(Table) for an example implementation
   */
  protected abstract void storeRelationships(T entity);

  /**
   * This method is called to set inherited fields that an entity inherits from its parent.
   *
   * @see TableRepository#setInheritedFields(Table, Fields) for an example implementation
   */
  @SuppressWarnings("unused")
  protected void setInheritedFields(T entity, Fields fields) {
    EntityInterface parent = supportsDomain ? getParentEntity(entity, "domain") : null;
    if (parent != null) {
      inheritDomain(entity, fields, parent);
    }
  }

  protected final void addServiceRelationship(T entity, EntityReference service) {
    if (service != null) {
      addRelationship(
          service.getId(), entity.getId(), service.getType(), entityType, Relationship.CONTAINS);
    }
  }

  /**
   * PATCH operations can't overwrite certain fields, such as entity ID, fullyQualifiedNames etc. Instead of throwing an
   * error, we take lenient approach of ignoring the user error and restore those attributes based on what is already
   * stored in the original entity.
   */
  protected void restorePatchAttributes(T original, T updated) {
    updated.setId(original.getId());
    updated.setName(renameAllowed ? updated.getName() : original.getName());
    updated.setFullyQualifiedName(original.getFullyQualifiedName());
    updated.setChangeDescription(original.getChangeDescription());
  }

  /** Set fullyQualifiedName of an entity */
  public void setFullyQualifiedName(T entity) {
    entity.setFullyQualifiedName(quoteName(entity.getName()));
  }

  /**
   * Initialize data from json files if seed data does not exist in corresponding tables. Seed data is stored under
   * openmetadata-service/src/main/resources/json/data/{entityType}
   *
   * <p>This method needs to be explicitly called, typically from initialize method. See {@link
   * org.openmetadata.service.resources.teams.RoleResource#initialize(OpenMetadataApplicationConfig)}
   */
  public final void initSeedDataFromResources() throws IOException {
    List<T> entities = getEntitiesFromSeedData();
    for (T entity : entities) {
      initializeEntity(entity);
    }
  }

  public final List<T> getEntitiesFromSeedData() throws IOException {
    return getEntitiesFromSeedData(String.format(".*json/data/%s/.*\\.json$", entityType));
  }

  public final List<T> getEntitiesFromSeedData(String path) throws IOException {
    return getEntitiesFromSeedData(entityType, path, entityClass);
  }

  public static <U> List<U> getEntitiesFromSeedData(String entityType, String path, Class<U> clazz)
      throws IOException {
    List<U> entities = new ArrayList<>();
    List<String> jsonDataFiles = EntityUtil.getJsonDataResources(path);
    jsonDataFiles.forEach(
        jsonDataFile -> {
          try {
            String json =
                CommonUtil.getResourceAsStream(
                    EntityRepository.class.getClassLoader(), jsonDataFile);
            json = json.replace("<separator>", Entity.SEPARATOR);
            entities.add(JsonUtils.readValue(json, clazz));
          } catch (Exception e) {
            LOG.warn("Failed to initialize the {} from file {}", entityType, jsonDataFile, e);
          }
        });
    return entities;
  }

  /** Initialize a given entity if it does not exist. */
  @Transaction
  public final void initializeEntity(T entity) {
    T existingEntity = findByNameOrNull(entity.getFullyQualifiedName(), ALL);
    if (existingEntity != null) {
      LOG.debug("{} {} is already initialized", entityType, entity.getFullyQualifiedName());
      return;
    }

    LOG.debug("{} {} is not initialized", entityType, entity.getFullyQualifiedName());
    entity.setUpdatedBy(ADMIN_USER_NAME);
    entity.setUpdatedAt(System.currentTimeMillis());
    entity.setId(UUID.randomUUID());
    create(null, entity);
    LOG.debug("Created a new {} {}", entityType, entity.getFullyQualifiedName());
  }

  public final T copy(T entity, CreateEntity request, String updatedBy) {
    EntityReference owner = validateOwner(request.getOwner());
    EntityReference domain = validateDomain(request.getDomain());
    validateReviewers(request.getReviewers());
    entity.setId(UUID.randomUUID());
    entity.setName(request.getName());
    entity.setDisplayName(request.getDisplayName());
    entity.setDescription(request.getDescription());
    entity.setOwner(owner);
    entity.setDomain(domain);
    entity.setTags(request.getTags());
    entity.setDataProducts(getEntityReferences(Entity.DATA_PRODUCT, request.getDataProducts()));
    entity.setLifeCycle(request.getLifeCycle());
    entity.setExtension(request.getExtension());
    entity.setUpdatedBy(updatedBy);
    entity.setUpdatedAt(System.currentTimeMillis());
    entity.setReviewers(request.getReviewers());
    return entity;
  }

  protected EntityUpdater getUpdater(T original, T updated, Operation operation) {
    return new EntityUpdater(original, updated, operation);
  }

  public final T get(UriInfo uriInfo, UUID id, Fields fields) {
    return get(uriInfo, id, fields, NON_DELETED, false);
  }

  /** Used for getting an entity with a set of requested fields */
  public final T get(UriInfo uriInfo, UUID id, Fields fields, Include include, boolean fromCache) {
    if (!fromCache) {
      // Clear the cache and always get the entity from the database to ensure read-after-write
      // consistency
      CACHE_WITH_ID.invalidate(new ImmutablePair<>(entityType, id));
    }
    // Find the entity from the cache. Set all the fields that are not already set
    T entity = find(id, include);
    setFieldsInternal(entity, fields);
    setInheritedFields(entity, fields);

    // Clone the entity from the cache and reset all the fields that are not already set
    // Cloning is necessary to ensure different threads making a call to this method don't
    // overwrite the fields of the entity being returned
    T entityClone = JsonUtils.deepCopy(entity, entityClass);
    clearFieldsInternal(entityClone, fields);
    return withHref(uriInfo, entityClone);
  }

  /** getReference is used for getting the entity references from the entity in the cache. */
  public final EntityReference getReference(UUID id, Include include)
      throws EntityNotFoundException {
    return find(id, include).getEntityReference();
  }

  /**
   * Find method is used for getting an entity only with core fields stored as JSON without any relational fields set
   */
  public final T find(UUID id, Include include) throws EntityNotFoundException {
    try {
      @SuppressWarnings("unchecked")
      T entity = (T) CACHE_WITH_ID.get(new ImmutablePair<>(entityType, id));
      if (include == NON_DELETED && Boolean.TRUE.equals(entity.getDeleted())
          || include == DELETED && !Boolean.TRUE.equals(entity.getDeleted())) {
        throw new EntityNotFoundException(entityNotFound(entityType, id));
      }
      return entity;
    } catch (ExecutionException | UncheckedExecutionException e) {
      throw new EntityNotFoundException(entityNotFound(entityType, id));
    }
  }

  public T getByName(UriInfo uriInfo, String fqn, Fields fields) {
    return getByName(uriInfo, fqn, fields, NON_DELETED, false);
  }

  public final T getByName(
      UriInfo uriInfo, String fqn, Fields fields, Include include, boolean fromCache) {
    fqn = quoteFqn ? EntityInterfaceUtil.quoteName(fqn) : fqn;
    if (!fromCache) {
      // Clear the cache and always get the entity from the database to ensure read-after-write
      // consistency
      CACHE_WITH_NAME.invalidate(new ImmutablePair<>(entityType, fqn));
    }
    // Find the entity from the cache. Set all the fields that are not already set
    T entity = findByName(fqn, include);
    setFieldsInternal(entity, fields);
    setInheritedFields(entity, fields);

    // Clone the entity from the cache and reset all the fields that are not already set
    // Cloning is necessary to ensure different threads making a call to this method don't
    // overwrite the fields of the entity being returned
    T entityClone = JsonUtils.deepCopy(entity, entityClass);
    clearFieldsInternal(entityClone, fields);
    return withHref(uriInfo, entityClone);
  }

  public final EntityReference getReferenceByName(String fqn, Include include) {
    fqn = quoteFqn ? EntityInterfaceUtil.quoteName(fqn) : fqn;
    return findByName(fqn, include).getEntityReference();
  }

  public final T findByNameOrNull(String fqn, Include include) {
    try {
      return findByName(fqn, include);
    } catch (EntityNotFoundException e) {
      return null;
    }
  }

  /**
   * Find method is used for getting an entity only with core fields stored as JSON without any relational fields set
   */
  public final T findByName(String fqn, Include include) {
    fqn = quoteFqn ? EntityInterfaceUtil.quoteName(fqn) : fqn;
    try {
      @SuppressWarnings("unchecked")
      T entity = (T) CACHE_WITH_NAME.get(new ImmutablePair<>(entityType, fqn));
      if (include == NON_DELETED && Boolean.TRUE.equals(entity.getDeleted())
          || include == DELETED && !Boolean.TRUE.equals(entity.getDeleted())) {
        throw new EntityNotFoundException(entityNotFound(entityType, fqn));
      }
      return entity;
    } catch (ExecutionException | UncheckedExecutionException e) {
      throw new EntityNotFoundException(entityNotFound(entityType, fqn));
    }
  }

  public final List<T> listAll(Fields fields, ListFilter filter) {
    // forward scrolling, if after == null then first page is being asked
    List<String> jsons = dao.listAfter(filter, Integer.MAX_VALUE, "");
    List<T> entities = new ArrayList<>();
    for (String json : jsons) {
      T entity = setFieldsInternal(JsonUtils.readValue(json, entityClass), fields);
      setInheritedFields(entity, fields);
      clearFieldsInternal(entity, fields);
      entities.add(entity);
    }
    return entities;
  }

  public ResultList<T> listAfter(
      UriInfo uriInfo, Fields fields, ListFilter filter, int limitParam, String after) {
    int total = dao.listCount(filter);
    List<T> entities = new ArrayList<>();
    if (limitParam > 0) {
      // forward scrolling, if after == null then first page is being asked
      List<String> jsons =
          dao.listAfter(filter, limitParam + 1, after == null ? "" : RestUtil.decodeCursor(after));

      for (String json : jsons) {
        T entity = setFieldsInternal(JsonUtils.readValue(json, entityClass), fields);
        setInheritedFields(entity, fields);
        clearFieldsInternal(entity, fields);
        entities.add(withHref(uriInfo, entity));
      }

      String beforeCursor;
      String afterCursor = null;
      beforeCursor = after == null ? null : entities.get(0).getName();
      if (entities.size()
          > limitParam) { // If extra result exists, then next page exists - return after cursor
        entities.remove(limitParam);
        afterCursor = entities.get(limitParam - 1).getName();
      }
      return getResultList(entities, beforeCursor, afterCursor, total);
    } else {
      // limit == 0 , return total count of entity.
      return getResultList(entities, null, null, total);
    }
  }

  public final ResultList<T> listAfterWithSkipFailure(
      UriInfo uriInfo, Fields fields, ListFilter filter, int limitParam, String after) {
    List<EntityError> errors = new ArrayList<>();
    List<T> entities = new ArrayList<>();
    int beforeOffset = Integer.parseInt(RestUtil.decodeCursor(after));
    int currentOffset = beforeOffset;
    int total = dao.listCount(filter);
    if (limitParam > 0) {
      // forward scrolling, if after == null then first page is being asked
      List<String> jsons = dao.listAfterWithOffset(limitParam, currentOffset);

      for (String json : jsons) {
        T parsedEntity = JsonUtils.readValue(json, entityClass);
        try {
          T entity = setFieldsInternal(parsedEntity, fields);
          setInheritedFields(entity, fields);
          clearFieldsInternal(entity, fields);
          entities.add(withHref(uriInfo, entity));
        } catch (Exception e) {
          clearFieldsInternal(parsedEntity, fields);
          EntityError entityError =
              new EntityError().withMessage(e.getMessage()).withEntity(parsedEntity);
          errors.add(entityError);
          LOG.error("[ListForIndexing] Failed for Entity : {}", entityError);
        }
      }
      currentOffset = currentOffset + limitParam;
      String newAfter = currentOffset > total ? null : String.valueOf(currentOffset);
      return getResultList(entities, errors, String.valueOf(beforeOffset), newAfter, total);
    } else {
      // limit == 0 , return total count of entity.
      return getResultList(entities, errors, null, null, total);
    }
  }

  public ResultList<T> listBefore(
      UriInfo uriInfo, Fields fields, ListFilter filter, int limitParam, String before) {
    // Reverse scrolling - Get one extra result used for computing before cursor
    List<String> jsons = dao.listBefore(filter, limitParam + 1, RestUtil.decodeCursor(before));

    List<T> entities = new ArrayList<>();
    for (String json : jsons) {
      T entity = setFieldsInternal(JsonUtils.readValue(json, entityClass), fields);
      setInheritedFields(entity, fields);
      clearFieldsInternal(entity, fields);
      entities.add(withHref(uriInfo, entity));
    }
    int total = dao.listCount(filter);

    String beforeCursor = null;
    String afterCursor;
    if (entities.size()
        > limitParam) { // If extra result exists, then previous page exists - return before cursor
      entities.remove(0);
      beforeCursor = entities.get(0).getName();
    }
    afterCursor = entities.get(entities.size() - 1).getName();
    return getResultList(entities, beforeCursor, afterCursor, total);
  }

  public final T getVersion(UUID id, String version) {
    Double requestedVersion = Double.parseDouble(version);
    String extension = EntityUtil.getVersionExtension(entityType, requestedVersion);

    // Get previous version from version history
    String json = daoCollection.entityExtensionDAO().getExtension(id, extension);
    if (json != null) {
      return JsonUtils.readValue(json, entityClass);
    }
    // If requested the latest version, return it from current version of the entity
    T entity = setFieldsInternal(find(id, ALL), putFields);
    if (entity.getVersion().equals(requestedVersion)) {
      return entity;
    }
    throw EntityNotFoundException.byMessage(
        CatalogExceptionMessage.entityVersionNotFound(entityType, id, requestedVersion));
  }

  public final EntityHistory listVersions(UUID id) {
    T latest = setFieldsInternal(find(id, ALL), putFields);
    setInheritedFields(latest, putFields);
    String extensionPrefix = EntityUtil.getVersionExtensionPrefix(entityType);
    List<ExtensionRecord> records =
        daoCollection.entityExtensionDAO().getExtensions(id, extensionPrefix);
    List<EntityVersionPair> oldVersions = new ArrayList<>();
    records.forEach(r -> oldVersions.add(new EntityVersionPair(r)));
    oldVersions.sort(EntityUtil.compareVersion.reversed());

    final List<Object> allVersions = new ArrayList<>();
    allVersions.add(JsonUtils.pojoToJson(latest));
    oldVersions.forEach(version -> allVersions.add(version.getEntityJson()));
    return new EntityHistory().withEntityType(entityType).withVersions(allVersions);
  }

  public final T create(UriInfo uriInfo, T entity) {
    entity = withHref(uriInfo, createInternal(entity));
    return entity;
  }

  public final T createInternal(T entity) {
    prepareInternal(entity, false);
    return createNewEntity(entity);
  }

  public final void prepareInternal(T entity, boolean update) {
    validateTags(entity);
    prepare(entity, update);
    setFullyQualifiedName(entity);
    validateExtension(entity);
    // Domain is already validated
  }

  public final void storeRelationshipsInternal(T entity) {
    storeOwner(entity, entity.getOwner());
    applyTags(entity);
    storeDomain(entity, entity.getDomain());
    storeDataProducts(entity, entity.getDataProducts());
    storeReviewers(entity, entity.getReviewers());
    storeRelationships(entity);
  }

  public final T setFieldsInternal(T entity, Fields fields) {
    entity.setOwner(fields.contains(FIELD_OWNER) ? getOwner(entity) : entity.getOwner());
    entity.setTags(fields.contains(FIELD_TAGS) ? getTags(entity) : entity.getTags());
    entity.setExtension(
        fields.contains(FIELD_EXTENSION) ? getExtension(entity) : entity.getExtension());
    entity.setDomain(fields.contains(FIELD_DOMAIN) ? getDomain(entity) : entity.getDomain());
    entity.setDataProducts(
        fields.contains(FIELD_DATA_PRODUCTS) ? getDataProducts(entity) : entity.getDataProducts());
    entity.setFollowers(
        fields.contains(FIELD_FOLLOWERS) ? getFollowers(entity) : entity.getFollowers());
    entity.setChildren(
        fields.contains(FIELD_CHILDREN) ? getChildren(entity) : entity.getChildren());
    entity.setExperts(fields.contains(FIELD_EXPERTS) ? getExperts(entity) : entity.getExperts());
    entity.setReviewers(
        fields.contains(FIELD_REVIEWERS) ? getReviewers(entity) : entity.getReviewers());
    entity.setVotes(fields.contains(FIELD_VOTES) ? getVotes(entity) : entity.getVotes());
    setFields(entity, fields);
    return entity;
  }

  public final void clearFieldsInternal(T entity, Fields fields) {
    entity.setOwner(fields.contains(FIELD_OWNER) ? entity.getOwner() : null);
    entity.setTags(fields.contains(FIELD_TAGS) ? entity.getTags() : null);
    entity.setExtension(fields.contains(FIELD_EXTENSION) ? entity.getExtension() : null);
    entity.setDomain(fields.contains(FIELD_DOMAIN) ? entity.getDomain() : null);
    entity.setDataProducts(fields.contains(FIELD_DATA_PRODUCTS) ? entity.getDataProducts() : null);
    entity.setFollowers(fields.contains(FIELD_FOLLOWERS) ? entity.getFollowers() : null);
    entity.setChildren(fields.contains(FIELD_CHILDREN) ? entity.getChildren() : null);
    entity.setExperts(fields.contains(FIELD_EXPERTS) ? entity.getExperts() : null);
    entity.setReviewers(fields.contains(FIELD_REVIEWERS) ? entity.getReviewers() : null);
    entity.setVotes(fields.contains(FIELD_VOTES) ? entity.getVotes() : null);
    clearFields(entity, fields);
  }

  @Transaction
  public final PutResponse<T> createOrUpdate(UriInfo uriInfo, T updated) {
    T original = findByNameOrNull(updated.getFullyQualifiedName(), ALL);
    if (original == null) { // If an original entity does not exist then create it, else update
      return new PutResponse<>(
          Status.CREATED, withHref(uriInfo, createNewEntity(updated)), ENTITY_CREATED);
    }
    return update(uriInfo, original, updated);
  }

  @SuppressWarnings("unused")
  protected void postCreate(T entity) {
    if (supportsSearch) {
      searchRepository.createEntity(entity);
    }
  }

  @SuppressWarnings("unused")
  protected void postUpdate(T original, T updated) {
    if (supportsSearch) {
      searchRepository.updateEntity(updated);
    }
  }

  @Transaction
  public final PutResponse<T> update(UriInfo uriInfo, T original, T updated) {
    // Get all the fields in the original entity that can be updated during PUT operation
    setFieldsInternal(original, putFields);

    // If the entity state is soft-deleted, recursively undelete the entity and it's children
    if (Boolean.TRUE.equals(original.getDeleted())) {
      restoreEntity(updated.getUpdatedBy(), entityType, original.getId());
    }

    // Update the attributes and relationships of an entity
    EntityUpdater entityUpdater = getUpdater(original, updated, Operation.PUT);
    entityUpdater.update();
    EventType change = entityUpdater.fieldsChanged() ? EventType.ENTITY_UPDATED : ENTITY_NO_CHANGE;
    setInheritedFields(updated, new Fields(allowedFields));
    return new PutResponse<>(Status.OK, withHref(uriInfo, updated), change);
  }

  @Transaction
  public final PatchResponse<T> patch(UriInfo uriInfo, UUID id, String user, JsonPatch patch) {
    // Get all the fields in the original entity that can be updated during PATCH operation
    T original = setFieldsInternal(find(id, NON_DELETED), patchFields);
    setInheritedFields(original, patchFields);

    // Apply JSON patch to the original entity to get the updated entity
    T updated = JsonUtils.applyPatch(original, patch, entityClass);
    updated.setUpdatedBy(user);
    updated.setUpdatedAt(System.currentTimeMillis());

    prepareInternal(updated, true);
    populateOwner(updated.getOwner());
    restorePatchAttributes(original, updated);

    // Update the attributes and relationships of an entity
    EntityUpdater entityUpdater = getUpdater(original, updated, Operation.PATCH);
    entityUpdater.update();
    EventType change = ENTITY_NO_CHANGE;
    if (entityUpdater.fieldsChanged()) {
      change = EventType.ENTITY_UPDATED;
      setInheritedFields(updated, patchFields); // Restore inherited fields after a change
    }
    return new PatchResponse<>(Status.OK, withHref(uriInfo, updated), change);
  }

  /**
   * PATCH using fully qualified name
   */
  @Transaction
  public final PatchResponse<T> patch(UriInfo uriInfo, String fqn, String user, JsonPatch patch) {
    // Get all the fields in the original entity that can be updated during PATCH operation
    T original = setFieldsInternal(findByName(fqn, NON_DELETED), patchFields);
    setInheritedFields(original, patchFields);

    // Apply JSON patch to the original entity to get the updated entity
    T updated = JsonUtils.applyPatch(original, patch, entityClass);
    updated.setUpdatedBy(user);
    updated.setUpdatedAt(System.currentTimeMillis());

    prepareInternal(updated, true);
    populateOwner(updated.getOwner());
    restorePatchAttributes(original, updated);

    // Update the attributes and relationships of an entity
    EntityUpdater entityUpdater = getUpdater(original, updated, Operation.PATCH);
    entityUpdater.update();
    EventType change = ENTITY_NO_CHANGE;
    if (entityUpdater.fieldsChanged()) {
      change = EventType.ENTITY_UPDATED;
      setInheritedFields(updated, patchFields); // Restore inherited fields after a change
    }
    return new PatchResponse<>(Status.OK, withHref(uriInfo, updated), change);
  }

  @Transaction
  public final PutResponse<T> addFollower(String updatedBy, UUID entityId, UUID userId) {
    T entity = find(entityId, NON_DELETED);

    // Validate follower
    User user = daoCollection.userDAO().findEntityById(userId);
    if (Boolean.TRUE.equals(user.getDeleted())) {
      throw new IllegalArgumentException(CatalogExceptionMessage.deletedUser(userId));
    }

    // Add relationship
    addRelationship(userId, entityId, Entity.USER, entityType, Relationship.FOLLOWS);

    ChangeDescription change = new ChangeDescription().withPreviousVersion(entity.getVersion());
    fieldAdded(change, FIELD_FOLLOWERS, List.of(user.getEntityReference()));

    ChangeEvent changeEvent =
        new ChangeEvent()
            .withId(UUID.randomUUID())
            .withEntity(entity)
            .withChangeDescription(change)
            .withEventType(EventType.ENTITY_UPDATED)
            .withEntityType(entityType)
            .withEntityId(entityId)
            .withEntityFullyQualifiedName(entity.getFullyQualifiedName())
            .withUserName(updatedBy)
            .withTimestamp(System.currentTimeMillis())
            .withCurrentVersion(entity.getVersion())
            .withPreviousVersion(change.getPreviousVersion());
    entity.setChangeDescription(change);
    postUpdate(entity, entity);
    return new PutResponse<>(Status.OK, changeEvent, ENTITY_FIELDS_CHANGED);
  }

  @Transaction
  public final PutResponse<T> updateVote(String updatedBy, UUID entityId, VoteRequest request) {
    T originalEntity = find(entityId, NON_DELETED);

    // Validate User
    User user = daoCollection.userDAO().findEntityByName(FullyQualifiedName.quoteName(updatedBy));
    UUID userId = user.getId();
    if (Boolean.TRUE.equals(user.getDeleted())) {
      throw new IllegalArgumentException(CatalogExceptionMessage.deletedUser(userId));
    }

    ChangeDescription change =
        new ChangeDescription().withPreviousVersion(originalEntity.getVersion());
    fieldUpdated(change, FIELD_VOTES, null, request.getUpdatedVoteType());

    // Add or Delete relationship
    if (request.getUpdatedVoteType() == VoteType.UN_VOTED) {
      deleteRelationship(userId, Entity.USER, entityId, entityType, Relationship.VOTED);
    } else {
      addRelationship(
          userId,
          entityId,
          Entity.USER,
          entityType,
          Relationship.VOTED,
          JsonUtils.pojoToJson(request.getUpdatedVoteType()),
          false);
    }

    setFieldsInternal(originalEntity, new Fields(allowedFields, "votes"));
    ChangeEvent changeEvent =
        new ChangeEvent()
            .withId(UUID.randomUUID())
            .withEntity(originalEntity)
            .withChangeDescription(change)
            .withEventType(EventType.ENTITY_UPDATED)
            .withEntityType(entityType)
            .withEntityId(entityId)
            .withEntityFullyQualifiedName(originalEntity.getFullyQualifiedName())
            .withUserName(updatedBy)
            .withTimestamp(System.currentTimeMillis())
            .withCurrentVersion(originalEntity.getVersion())
            .withPreviousVersion(change.getPreviousVersion());
    postUpdate(originalEntity, originalEntity);
    return new PutResponse<>(Status.OK, changeEvent, ENTITY_FIELDS_CHANGED);
  }

  @Transaction
  public final DeleteResponse<T> delete(
      String updatedBy, UUID id, boolean recursive, boolean hardDelete) {
    DeleteResponse<T> response = deleteInternal(updatedBy, id, recursive, hardDelete);
    postDelete(response.entity());
    return response;
  }

  @Transaction
  public final DeleteResponse<T> deleteByName(
      String updatedBy, String name, boolean recursive, boolean hardDelete) {
    name = quoteFqn ? quoteName(name) : name;
    DeleteResponse<T> response = deleteInternalByName(updatedBy, name, recursive, hardDelete);
    postDelete(response.entity());
    return response;
  }

  protected void preDelete(T entity, String deletedBy) {
    // Override this method to perform any operation required after deletion.
    // For example ingestion pipeline deletes a pipeline in AirFlow.
  }

  protected void postDelete(T entity) {}

  public final void deleteFromSearch(T entity, EventType changeType) {
    if (supportsSearch) {
      if (changeType.equals(ENTITY_SOFT_DELETED)) {
        searchRepository.softDeleteOrRestoreEntity(entity, true);
      } else {
        searchRepository.deleteEntity(entity);
      }
    }
  }

  public final void restoreFromSearch(T entity) {
    if (supportsSearch) {
      searchRepository.softDeleteOrRestoreEntity(entity, false);
    }
  }

  public ResultList<T> listFromSearchWithOffset(
      UriInfo uriInfo,
      Fields fields,
      SearchListFilter searchListFilter,
      int limit,
      int offset,
      String q)
      throws IOException {
    return listFromSearchWithOffset(uriInfo, fields, searchListFilter, limit, offset, null, q);
  }

  public ResultList<T> listFromSearchWithOffset(
      UriInfo uriInfo,
      Fields fields,
      SearchListFilter searchListFilter,
      int limit,
      int offset,
      SearchSortFilter searchSortFilter,
      String q)
      throws IOException {
    List<T> entityList = new ArrayList<>();
    Long total = 0L;

    if (limit > 0) {
      SearchClient.SearchResultListMapper results =
          searchRepository.listWithOffset(
              searchListFilter, limit, offset, entityType, searchSortFilter, q);
      total = results.getTotal();
      for (Map<String, Object> json : results.getResults()) {
        T entity = setFieldsInternal(JsonUtils.readOrConvertValue(json, entityClass), fields);
        setInheritedFields(entity, fields);
        clearFieldsInternal(entity, fields);
        entityList.add(withHref(uriInfo, entity));
      }
      return new ResultList<>(entityList, offset, limit, total.intValue());
    }
    throw new IllegalArgumentException("Limit should be greater than 0");
  }

  @Transaction
  private DeleteResponse<T> delete(
      String deletedBy, T original, boolean recursive, boolean hardDelete) {
    checkSystemEntityDeletion(original);
    preDelete(original, deletedBy);
    setFieldsInternal(original, putFields);
    deleteChildren(original.getId(), recursive, hardDelete, deletedBy);

    EventType changeType;
    T updated = get(null, original.getId(), putFields, ALL, false);
    if (supportsSoftDelete && !hardDelete) {
      updated.setUpdatedBy(deletedBy);
      updated.setUpdatedAt(System.currentTimeMillis());
      updated.setDeleted(true);
      EntityUpdater updater = getUpdater(original, updated, Operation.SOFT_DELETE);
      updater.update();
      changeType = ENTITY_SOFT_DELETED;
    } else {
      cleanup(updated);
      changeType = ENTITY_DELETED;
    }
    LOG.info("{} deleted {}", hardDelete ? "Hard" : "Soft", updated.getFullyQualifiedName());
    return new DeleteResponse<>(updated, changeType);
  }

  @Transaction
  public final DeleteResponse<T> deleteInternalByName(
      String updatedBy, String name, boolean recursive, boolean hardDelete) {
    // Validate entity
    T entity = findByName(name, ALL);
    return delete(updatedBy, entity, recursive, hardDelete);
  }

  @Transaction
  public final DeleteResponse<T> deleteInternal(
      String updatedBy, UUID id, boolean recursive, boolean hardDelete) {
    // Validate entity
    T entity = find(id, ALL);
    return delete(updatedBy, entity, recursive, hardDelete);
  }

  @Transaction
  private void deleteChildren(UUID id, boolean recursive, boolean hardDelete, String updatedBy) {
    // If an entity being deleted contains other **non-deleted** children entities, it can't be
    // deleted
    List<EntityRelationshipRecord> childrenRecords =
        daoCollection
            .relationshipDAO()
            .findTo(
                id,
                entityType,
                List.of(Relationship.CONTAINS.ordinal(), Relationship.PARENT_OF.ordinal()));

    if (childrenRecords.isEmpty()) {
      LOG.info("No children to delete");
      return;
    }
    // Entity being deleted contains children entities
    if (!recursive) {
      throw new IllegalArgumentException(CatalogExceptionMessage.entityIsNotEmpty(entityType));
    }
    // Delete all the contained entities
    deleteChildren(childrenRecords, hardDelete, updatedBy);
  }

  @Transaction
  protected void deleteChildren(
      List<EntityRelationshipRecord> children, boolean hardDelete, String updatedBy) {
    for (EntityRelationshipRecord entityRelationshipRecord : children) {
      LOG.info(
          "Recursively {} deleting {} {}",
          hardDelete ? "hard" : "soft",
          entityRelationshipRecord.getType(),
          entityRelationshipRecord.getId());
      Entity.deleteEntity(
          updatedBy,
          entityRelationshipRecord.getType(),
          entityRelationshipRecord.getId(),
          true,
          hardDelete);
    }
  }

  @Transaction
  protected void cleanup(T entityInterface) {
    UUID id = entityInterface.getId();

    // Delete all the relationships to other entities
    daoCollection.relationshipDAO().deleteAll(id, entityType);

    // Delete all the field relationships to other entities
    daoCollection.fieldRelationshipDAO().deleteAllByPrefix(entityInterface.getFullyQualifiedName());

    // Delete all the extensions of entity
    daoCollection.entityExtensionDAO().deleteAll(id);

    // Delete all the tag labels
    daoCollection
        .tagUsageDAO()
        .deleteTagLabelsByTargetPrefix(entityInterface.getFullyQualifiedName());

    // when the glossary and tag is deleted, delete its usage
    daoCollection.tagUsageDAO().deleteTagLabelsByFqn(entityInterface.getFullyQualifiedName());
    // Delete all the usage data
    daoCollection.usageDAO().delete(id);

    // Delete the extension data storing custom properties
    removeExtension(entityInterface);

    // Delete all the threads that are about this entity
    Entity.getFeedRepository().deleteByAbout(entityInterface.getId());

    // Remove entity from the cache
    invalidate(entityInterface);

    // Finally, delete the entity
    dao.delete(id);
  }

  private void invalidate(T entity) {
    CACHE_WITH_ID.invalidate(new ImmutablePair<>(entityType, entity.getId()));
    CACHE_WITH_NAME.invalidate(new ImmutablePair<>(entityType, entity.getFullyQualifiedName()));
  }

  @Transaction
  public final PutResponse<T> deleteFollower(String updatedBy, UUID entityId, UUID userId) {
    T entity = find(entityId, NON_DELETED);

    // Validate follower
    EntityReference user = Entity.getEntityReferenceById(Entity.USER, userId, NON_DELETED);

    // Remove follower
    deleteRelationship(userId, Entity.USER, entityId, entityType, Relationship.FOLLOWS);

    ChangeDescription change = new ChangeDescription().withPreviousVersion(entity.getVersion());
    fieldDeleted(change, FIELD_FOLLOWERS, List.of(user));

    ChangeEvent changeEvent =
        new ChangeEvent()
            .withId(UUID.randomUUID())
            .withEntity(entity)
            .withChangeDescription(change)
            .withEventType(EventType.ENTITY_UPDATED)
            .withEntityFullyQualifiedName(entity.getFullyQualifiedName())
            .withEntityType(entityType)
            .withEntityId(entityId)
            .withUserName(updatedBy)
            .withTimestamp(System.currentTimeMillis())
            .withCurrentVersion(entity.getVersion())
            .withPreviousVersion(change.getPreviousVersion());

    return new PutResponse<>(Status.OK, changeEvent, ENTITY_FIELDS_CHANGED);
  }

  public final ResultList<T> getResultList(
      List<T> entities, String beforeCursor, String afterCursor, int total) {
    return new ResultList<>(entities, beforeCursor, afterCursor, total);
  }

  public final ResultList<T> getResultList(
      List<T> entities,
      List<EntityError> errors,
      String beforeCursor,
      String afterCursor,
      int total) {
    return new ResultList<>(entities, errors, beforeCursor, afterCursor, total);
  }

  @Transaction
  private T createNewEntity(T entity) {
    storeEntity(entity, false);
    storeExtension(entity);
    storeRelationshipsInternal(entity);
    setInheritedFields(entity, new Fields(allowedFields));
    postCreate(entity);
    return entity;
  }

  @Transaction
  protected void store(T entity, boolean update) {
    // Don't store owner, database, href and tags as JSON. Build it on the fly based on
    // relationships
    entity.withHref(null);
    EntityReference owner = entity.getOwner();
    entity.setOwner(null);
    List<EntityReference> children = entity.getChildren();
    entity.setChildren(null);
    List<TagLabel> tags = entity.getTags();
    entity.setTags(null);
    EntityReference domain = entity.getDomain();
    entity.setDomain(null);
    List<EntityReference> dataProducts = entity.getDataProducts();
    entity.setDataProducts(null);
    List<EntityReference> followers = entity.getFollowers();
    entity.setFollowers(null);
    List<EntityReference> experts = entity.getExperts();
    entity.setExperts(null);

    if (update) {
      dao.update(entity.getId(), entity.getFullyQualifiedName(), JsonUtils.pojoToJson(entity));
      LOG.info("Updated {}:{}:{}", entityType, entity.getId(), entity.getFullyQualifiedName());
      invalidate(entity);
    } else {
      dao.insert(entity, entity.getFullyQualifiedName());
      LOG.info("Created {}:{}:{}", entityType, entity.getId(), entity.getFullyQualifiedName());
    }

    // Restore the relationships
    entity.setOwner(owner);
    entity.setChildren(children);
    entity.setTags(tags);
    entity.setDomain(domain);
    entity.setDataProducts(dataProducts);
    entity.setFollowers(followers);
    entity.setExperts(experts);
  }

  @Transaction
  protected void storeTimeSeries(
      String fqn, String extension, String jsonSchema, String entityJson) {
    daoCollection.entityExtensionTimeSeriesDao().insert(fqn, extension, jsonSchema, entityJson);
  }

  @Transaction
  public final String getExtensionAtTimestamp(String fqn, String extension, Long timestamp) {
    return daoCollection
        .entityExtensionTimeSeriesDao()
        .getExtensionAtTimestamp(fqn, extension, timestamp);
  }

  public final String getLatestExtensionFromTimeSeries(String fqn, String extension) {
    return daoCollection.entityExtensionTimeSeriesDao().getLatestExtension(fqn, extension);
  }

  public final List<String> getResultsFromAndToTimestamps(
      String fullyQualifiedName, String extension, Long startTs, Long endTs) {
    return getResultsFromAndToTimestamps(
        fullyQualifiedName, extension, startTs, endTs, EntityTimeSeriesDAO.OrderBy.DESC);
  }

  public final List<String> getResultsFromAndToTimestamps(
      String fqn, String extension, Long startTs, Long endTs, EntityTimeSeriesDAO.OrderBy orderBy) {
    return daoCollection
        .entityExtensionTimeSeriesDao()
        .listBetweenTimestampsByOrder(fqn, extension, startTs, endTs, orderBy);
  }

  @Transaction
  public final void deleteExtensionAtTimestamp(String fqn, String extension, Long timestamp) {
    daoCollection.entityExtensionTimeSeriesDao().deleteAtTimestamp(fqn, extension, timestamp);
  }

  @Transaction
  public final void deleteExtensionBeforeTimestamp(String fqn, String extension, Long timestamp) {
    daoCollection.entityExtensionTimeSeriesDao().deleteBeforeTimestamp(fqn, extension, timestamp);
  }

  private void validateExtension(T entity) {
    if (entity.getExtension() == null) {
      return;
    }

    JsonNode jsonNode = JsonUtils.valueToTree(entity.getExtension());
    Iterator<Entry<String, JsonNode>> customFields = jsonNode.fields();
    while (customFields.hasNext()) {
      Entry<String, JsonNode> entry = customFields.next();
      String fieldName = entry.getKey();
      JsonNode fieldValue = entry.getValue();

      // Validate the customFields using jsonSchema
      JsonSchema jsonSchema = TypeRegistry.instance().getSchema(entityType, fieldName);
      if (jsonSchema == null) {
        throw new IllegalArgumentException(CatalogExceptionMessage.unknownCustomField(fieldName));
      }
      Set<ValidationMessage> validationMessages = jsonSchema.validate(fieldValue);
      if (!validationMessages.isEmpty()) {
        throw new IllegalArgumentException(
            CatalogExceptionMessage.jsonValidationError(fieldName, validationMessages.toString()));
      }
    }
  }

  public final void storeExtension(EntityInterface entity) {
    JsonNode jsonNode = JsonUtils.valueToTree(entity.getExtension());
    Iterator<Entry<String, JsonNode>> customFields = jsonNode.fields();
    while (customFields.hasNext()) {
      Entry<String, JsonNode> entry = customFields.next();
      String fieldName = entry.getKey();
      JsonNode value = entry.getValue();
      storeCustomProperty(entity, fieldName, value);
    }
  }

  public final void removeExtension(EntityInterface entity) {
    JsonNode jsonNode = JsonUtils.valueToTree(entity.getExtension());
    Iterator<Entry<String, JsonNode>> customFields = jsonNode.fields();
    while (customFields.hasNext()) {
      Entry<String, JsonNode> entry = customFields.next();
      removeCustomProperty(entity, entry.getKey());
    }
  }

  private void storeCustomProperty(EntityInterface entity, String fieldName, JsonNode value) {
    String fieldFQN = TypeRegistry.getCustomPropertyFQN(entityType, fieldName);
    daoCollection
        .entityExtensionDAO()
        .insert(entity.getId(), fieldFQN, "customFieldSchema", JsonUtils.pojoToJson(value));
  }

  private void removeCustomProperty(EntityInterface entity, String fieldName) {
    String fieldFQN = TypeRegistry.getCustomPropertyFQN(entityType, fieldName);
    daoCollection.entityExtensionDAO().delete(entity.getId(), fieldFQN);
  }

  public final Object getExtension(T entity) {
    if (!supportsExtension) {
      return null;
    }
    String fieldFQNPrefix = TypeRegistry.getCustomPropertyFQNPrefix(entityType);
    List<ExtensionRecord> records =
        daoCollection.entityExtensionDAO().getExtensions(entity.getId(), fieldFQNPrefix);
    if (records.isEmpty()) {
      return null;
    }
    ObjectNode objectNode = JsonUtils.getObjectNode();
    for (ExtensionRecord extensionRecord : records) {
      String fieldName = TypeRegistry.getPropertyName(extensionRecord.extensionName());
      objectNode.set(fieldName, JsonUtils.readTree(extensionRecord.extensionJson()));
    }
    return objectNode;
  }

  protected void applyColumnTags(List<Column> columns) {
    // Add column level tags by adding tag to column relationship
    for (Column column : columns) {
      applyTags(column.getTags(), column.getFullyQualifiedName());
      if (column.getChildren() != null) {
        applyColumnTags(column.getChildren());
      }
    }
  }

  protected void applyTags(T entity) {
    if (supportsTags) {
      // Add entity level tags by adding tag to the entity relationship
      applyTags(entity.getTags(), entity.getFullyQualifiedName());
    }
  }

  /** Apply tags {@code tagLabels} to the entity or field identified by {@code targetFQN} */
  @Transaction
  public final void applyTags(List<TagLabel> tagLabels, String targetFQN) {
    for (TagLabel tagLabel : listOrEmpty(tagLabels)) {
      // Apply tagLabel to targetFQN that identifies an entity or field
      boolean isTagDerived = tagLabel.getLabelType().equals(TagLabel.LabelType.DERIVED);
      // Derived Tags should not create Relationships, and needs to be built on the during Read
      if (!isTagDerived) {
        daoCollection
            .tagUsageDAO()
            .applyTag(
                tagLabel.getSource().ordinal(),
                tagLabel.getTagFQN(),
                tagLabel.getTagFQN(),
                targetFQN,
                tagLabel.getLabelType().ordinal(),
                tagLabel.getState().ordinal());
      }
    }
  }

  protected List<TagLabel> getTags(T entity) {
    return !supportsTags ? null : getTags(entity.getFullyQualifiedName());
  }

  protected List<TagLabel> getTags(String fqn) {
    if (!supportsTags) {
      return null;
    }

    // Populate Glossary Tags on Read
    return addDerivedTags(daoCollection.tagUsageDAO().getTags(fqn));
  }

  public final Map<String, List<TagLabel>> getTagsByPrefix(String prefix, String postfix) {
    return !supportsTags
        ? null
        : daoCollection.tagUsageDAO().getTagsByPrefix(prefix, postfix, true);
  }

  protected List<EntityReference> getFollowers(T entity) {
    return !supportsFollower || entity == null
        ? Collections.emptyList()
        : findFrom(entity.getId(), entityType, Relationship.FOLLOWS, Entity.USER);
  }

  protected Votes getVotes(T entity) {
    if (!supportsVotes || entity == null) {
      return new Votes();
    }
    List<EntityRelationshipRecord> upVoterRecords = new ArrayList<>();
    List<EntityRelationshipRecord> downVoterRecords = new ArrayList<>();
    List<EntityRelationshipRecord> records =
        findFromRecords(entity.getId(), entityType, Relationship.VOTED, Entity.USER);
    for (EntityRelationshipRecord entityRelationshipRecord : records) {
      VoteType type = JsonUtils.readValue(entityRelationshipRecord.getJson(), VoteType.class);
      if (type == VoteType.VOTED_UP) {
        upVoterRecords.add(entityRelationshipRecord);
      } else if (type == VoteType.VOTED_DOWN) {
        downVoterRecords.add(entityRelationshipRecord);
      }
    }
    List<EntityReference> upVoters = getEntityReferences(upVoterRecords);
    List<EntityReference> downVoters = getEntityReferences(downVoterRecords);
    return new Votes()
        .withUpVotes(upVoters.size())
        .withDownVotes(downVoters.size())
        .withUpVoters(upVoters)
        .withDownVoters(downVoters);
  }

  public final T withHref(UriInfo uriInfo, T entity) {
    if (uriInfo == null) {
      return entity;
    }
    return entity.withHref(getHref(uriInfo, entity.getId()));
  }

  public final URI getHref(UriInfo uriInfo, UUID id) {
    return RestUtil.getHref(uriInfo, collectionPath, id);
  }

  @Transaction
  public final PutResponse<T> restoreEntity(String updatedBy, String entityType, UUID id) {
    // If an entity being restored contains other **deleted** children entities, restore them
    List<EntityRelationshipRecord> records =
        daoCollection.relationshipDAO().findTo(id, entityType, Relationship.CONTAINS.ordinal());

    if (!records.isEmpty()) {
      // Restore all the contained entities
      for (EntityRelationshipRecord entityRelationshipRecord : records) {
        LOG.info(
            "Recursively restoring {} {}",
            entityRelationshipRecord.getType(),
            entityRelationshipRecord.getId());
        Entity.restoreEntity(
            updatedBy, entityRelationshipRecord.getType(), entityRelationshipRecord.getId());
      }
    }

    // Finally set entity deleted flag to false
    LOG.info("Restoring the {} {}", entityType, id);

    try {
      T original = find(id, DELETED);
      setFieldsInternal(original, putFields);
      T updated = JsonUtils.readValue(JsonUtils.pojoToJson(original), entityClass);
      updated.setUpdatedBy(updatedBy);
      updated.setUpdatedAt(System.currentTimeMillis());
      EntityUpdater updater = getUpdater(original, updated, Operation.PUT);
      updater.update();
      return new PutResponse<>(Status.OK, updated, ENTITY_RESTORED);
    } catch (EntityNotFoundException e) {
      LOG.info("Entity is not in deleted state {} {}", entityType, id);
      return null;
    }
  }

  public final void addRelationship(
      UUID fromId, UUID toId, String fromEntity, String toEntity, Relationship relationship) {
    addRelationship(fromId, toId, fromEntity, toEntity, relationship, false);
  }

  public final void addRelationship(
      UUID fromId,
      UUID toId,
      String fromEntity,
      String toEntity,
      Relationship relationship,
      boolean bidirectional) {
    addRelationship(fromId, toId, fromEntity, toEntity, relationship, null, bidirectional);
  }

  @Transaction
  public final void addRelationship(
      UUID fromId,
      UUID toId,
      String fromEntity,
      String toEntity,
      Relationship relationship,
      String json,
      boolean bidirectional) {
    UUID from = fromId;
    UUID to = toId;
    if (bidirectional && fromId.compareTo(toId) > 0) {
      // For bidirectional relationship, instead of adding two row fromId -> toId and toId ->
      // fromId, just add one row where fromId is alphabetically less than toId
      from = toId;
      to = fromId;
    }
    daoCollection
        .relationshipDAO()
        .insert(from, to, fromEntity, toEntity, relationship.ordinal(), json);
  }

  @Transaction
  public final void bulkAddToRelationship(
      UUID fromId, List<UUID> toId, String fromEntity, String toEntity, Relationship relationship) {
    daoCollection
        .relationshipDAO()
        .bulkInsertToRelationship(fromId, toId, fromEntity, toEntity, relationship.ordinal());
  }

  public final List<EntityReference> findBoth(
      UUID entity1, String entityType1, Relationship relationship, String entity2) {
    // Find bidirectional relationship
    List<EntityReference> ids = new ArrayList<>();
    ids.addAll(findFrom(entity1, entityType1, relationship, entity2));
    ids.addAll(findTo(entity1, entityType1, relationship, entity2));
    return ids;
  }

  public final List<EntityReference> findFrom(
      UUID toId, String toEntityType, Relationship relationship, String fromEntityType) {
    List<EntityRelationshipRecord> records =
        findFromRecords(toId, toEntityType, relationship, fromEntityType);
    return getEntityReferences(records);
  }

  public final List<EntityRelationshipRecord> findFromRecords(
      UUID toId, String toEntityType, Relationship relationship, String fromEntityType) {
    // When fromEntityType is null, all the relationships from any entity is returned
    return fromEntityType == null
        ? daoCollection.relationshipDAO().findFrom(toId, toEntityType, relationship.ordinal())
        : daoCollection
            .relationshipDAO()
            .findFrom(toId, toEntityType, relationship.ordinal(), fromEntityType);
  }

  public final EntityReference getContainer(UUID toId) {
    return getFromEntityRef(toId, Relationship.CONTAINS, null, true);
  }

  public final EntityReference getContainer(UUID toId, String fromEntityType) {
    return getFromEntityRef(toId, Relationship.CONTAINS, fromEntityType, true);
  }

  public final EntityReference getFromEntityRef(
      UUID toId, Relationship relationship, String fromEntityType, boolean mustHaveRelationship) {
    List<EntityRelationshipRecord> records =
        findFromRecords(toId, entityType, relationship, fromEntityType);
    ensureSingleRelationship(
        entityType, toId, records, relationship.value(), fromEntityType, mustHaveRelationship);
    return !records.isEmpty()
        ? Entity.getEntityReferenceById(records.get(0).getType(), records.get(0).getId(), ALL)
        : null;
  }

  public final EntityReference getToEntityRef(
      UUID fromId, Relationship relationship, String toEntityType, boolean mustHaveRelationship) {
    List<EntityRelationshipRecord> records =
        findToRecords(fromId, entityType, relationship, toEntityType);
    ensureSingleRelationship(
        entityType, fromId, records, relationship.value(), toEntityType, mustHaveRelationship);
    return !records.isEmpty()
        ? Entity.getEntityReferenceById(records.get(0).getType(), records.get(0).getId(), ALL)
        : null;
  }

  public static void ensureSingleRelationship(
      String entityType,
      UUID id,
      List<EntityRelationshipRecord> relations,
      String relationshipName,
      String toEntityType,
      boolean mustHaveRelationship) {
    // An entity can have only one relationship
    if (mustHaveRelationship && relations.isEmpty()) {
      throw new UnhandledServerException(
          CatalogExceptionMessage.entityRelationshipNotFound(
              entityType, id, relationshipName, toEntityType));
    }
    if (!mustHaveRelationship && relations.isEmpty()) {
      return;
    }
    if (relations.size() != 1) {
      LOG.warn(
          "Possible database issues - multiple relations {} for entity {}:{}",
          relationshipName,
          entityType,
          id);
    }
  }

  public final List<EntityReference> findTo(
      UUID fromId, String fromEntityType, Relationship relationship, String toEntityType) {
    // When toEntityType is null, all the relationships to any entity is returned
    List<EntityRelationshipRecord> records =
        findToRecords(fromId, fromEntityType, relationship, toEntityType);
    return getEntityReferences(records);
  }

  public final List<EntityRelationshipRecord> findToRecords(
      UUID fromId, String fromEntityType, Relationship relationship, String toEntityType) {
    // When toEntityType is null, all the relationships to any entity is returned
    return toEntityType == null
        ? daoCollection.relationshipDAO().findTo(fromId, fromEntityType, relationship.ordinal())
        : daoCollection
            .relationshipDAO()
            .findTo(fromId, fromEntityType, relationship.ordinal(), toEntityType);
  }

  public final void deleteRelationship(
      UUID fromId,
      String fromEntityType,
      UUID toId,
      String toEntityType,
      Relationship relationship) {
    daoCollection
        .relationshipDAO()
        .delete(fromId, fromEntityType, toId, toEntityType, relationship.ordinal());
  }

  public final void deleteTo(
      UUID toId, String toEntityType, Relationship relationship, String fromEntityType) {
    if (fromEntityType == null) {
      daoCollection.relationshipDAO().deleteTo(toId, toEntityType, relationship.ordinal());
    } else {
      daoCollection
          .relationshipDAO()
          .deleteTo(toId, toEntityType, relationship.ordinal(), fromEntityType);
    }
  }

  public final void deleteFrom(
      UUID fromId, String fromEntityType, Relationship relationship, String toEntityType) {
    // Remove relationships from original
    daoCollection
        .relationshipDAO()
        .deleteFrom(fromId, fromEntityType, relationship.ordinal(), toEntityType);
  }

  public final void validateUsers(List<EntityReference> entityReferences) {
    if (entityReferences != null) {
      for (EntityReference entityReference : entityReferences) {
        EntityReference ref =
            entityReference.getId() != null
                ? Entity.getEntityReferenceById(USER, entityReference.getId(), ALL)
                : Entity.getEntityReferenceByName(
                    USER, entityReference.getFullyQualifiedName(), ALL);
        EntityUtil.copy(ref, entityReference);
      }
      entityReferences.sort(EntityUtil.compareEntityReference);
    }
  }

  private boolean validateIfAllRefsAreEntityType(List<EntityReference> list, String entityType) {
    return list.stream().allMatch(obj -> obj.getType().equals(entityType));
  }

  public final void validateReviewers(List<EntityReference> entityReferences) {
    if (!nullOrEmpty(entityReferences)) {
      boolean areAllTeam = validateIfAllRefsAreEntityType(entityReferences, TEAM);
      boolean areAllUsers = validateIfAllRefsAreEntityType(entityReferences, USER);
      if (areAllTeam) {
        // If all are team then only one team is allowed
        if (entityReferences.size() > 1) {
          throw new IllegalArgumentException("Only one team can be assigned as reviewer.");
        } else {
          EntityReference ref =
              entityReferences.get(0).getId() != null
                  ? Entity.getEntityReferenceById(TEAM, entityReferences.get(0).getId(), ALL)
                  : Entity.getEntityReferenceByName(
                      TEAM, entityReferences.get(0).getFullyQualifiedName(), ALL);
          EntityUtil.copy(ref, entityReferences.get(0));
        }
      } else if (areAllUsers) {
        for (EntityReference entityReference : entityReferences) {
          EntityReference ref =
              entityReference.getId() != null
                  ? Entity.getEntityReferenceById(USER, entityReference.getId(), ALL)
                  : Entity.getEntityReferenceByName(
                      USER, entityReference.getFullyQualifiedName(), ALL);
          EntityUtil.copy(ref, entityReference);
        }
      } else {
        throw new IllegalArgumentException(
            "Invalid Reviewer Type. Only one team or multiple users can be assigned as reviewer.");
      }
      entityReferences.sort(EntityUtil.compareEntityReference);
    }
  }

  public final void validateRoles(List<EntityReference> roles) {
    if (roles != null) {
      for (EntityReference entityReference : roles) {
        EntityReference ref =
            Entity.getEntityReferenceById(Entity.ROLE, entityReference.getId(), ALL);
        EntityUtil.copy(ref, entityReference);
      }
      roles.sort(EntityUtil.compareEntityReference);
    }
  }

  final void validatePolicies(List<EntityReference> policies) {
    if (policies != null) {
      for (EntityReference entityReference : policies) {
        EntityReference ref =
            Entity.getEntityReferenceById(Entity.POLICY, entityReference.getId(), ALL);
        EntityUtil.copy(ref, entityReference);
      }
      policies.sort(EntityUtil.compareEntityReference);
    }
  }

  public final EntityReference getOwner(T entity) {
    return !supportsOwner ? null : getFromEntityRef(entity.getId(), Relationship.OWNS, null, false);
  }

  public final EntityReference getDomain(T entity) {
    return supportsDomain
        ? getFromEntityRef(entity.getId(), Relationship.HAS, DOMAIN, false)
        : null;
  }

  private List<EntityReference> getDataProducts(T entity) {
    return !supportsDataProducts
        ? null
        : findFrom(entity.getId(), entityType, Relationship.HAS, DATA_PRODUCT);
  }

  public EntityInterface getParentEntity(T entity, String fields) {
    return null;
  }

  public final EntityReference getParent(T entity) {
    return getFromEntityRef(entity.getId(), Relationship.CONTAINS, entityType, false);
  }

  protected List<EntityReference> getChildren(T entity) {
    return findTo(entity.getId(), entityType, Relationship.CONTAINS, entityType);
  }

  protected List<EntityReference> getReviewers(T entity) {
    return supportsReviewers
        ? findFrom(entity.getId(), entityType, Relationship.REVIEWS, null)
        : null;
  }

  protected List<EntityReference> getExperts(T entity) {
    return supportsExperts
        ? findTo(entity.getId(), entityType, Relationship.EXPERT, Entity.USER)
        : null;
  }

  public final EntityReference getOwner(EntityReference ref) {
    return !supportsOwner ? null : getFromEntityRef(ref.getId(), Relationship.OWNS, null, false);
  }

  public final void inheritDomain(T entity, Fields fields, EntityInterface parent) {
    if (fields.contains(FIELD_DOMAIN) && entity.getDomain() == null && parent != null) {
      entity.setDomain(parent.getDomain() != null ? parent.getDomain().withInherited(true) : null);
    }
  }

  public final void inheritOwner(T entity, Fields fields, EntityInterface parent) {
    if (fields.contains(FIELD_OWNER) && entity.getOwner() == null && parent != null) {
      entity.setOwner(parent.getOwner() != null ? parent.getOwner().withInherited(true) : null);
    }
  }

  public final void inheritExperts(T entity, Fields fields, EntityInterface parent) {
    if (fields.contains(FIELD_EXPERTS) && nullOrEmpty(entity.getExperts()) && parent != null) {
      entity.setExperts(parent.getExperts());
      listOrEmpty(entity.getExperts()).forEach(expert -> expert.withInherited(true));
    }
  }

  public final void inheritReviewers(T entity, Fields fields, EntityInterface parent) {
    if (fields.contains(FIELD_REVIEWERS) && parent != null) {
      List<EntityReference> combinedReviewers = new ArrayList<>(listOrEmpty(entity.getReviewers()));
      // Fetch Unique Reviewers from parent as inherited
      List<EntityReference> uniqueEntityReviewers =
          listOrEmpty(parent.getReviewers()).stream()
              .filter(
                  parentReviewer ->
                      combinedReviewers.stream()
                          .noneMatch(
                              entityReviewer ->
                                  parentReviewer.getId().equals(entityReviewer.getId())
                                      && parentReviewer.getType().equals(entityReviewer.getType())))
              .toList();
      uniqueEntityReviewers.forEach(reviewer -> reviewer.withInherited(true));

      combinedReviewers.addAll(uniqueEntityReviewers);
      combinedReviewers.sort(EntityUtil.compareEntityReference);
      entity.setReviewers(combinedReviewers);
    }
  }

  protected void populateOwner(EntityReference owner) {
    if (owner == null) {
      return;
    }
    EntityReference ref = validateOwner(owner);
    EntityUtil.copy(ref, owner);
  }

  @Transaction
  protected void storeOwner(T entity, EntityReference owner) {
    if (supportsOwner && owner != null) {
      // Add relationship owner --- owns ---> ownedEntity
      LOG.info(
          "Adding owner {}:{} for entity {}:{}",
          owner.getType(),
          owner.getFullyQualifiedName(),
          entityType,
          entity.getId());
      addRelationship(
          owner.getId(), entity.getId(), owner.getType(), entityType, Relationship.OWNS);
    }
  }

  @Transaction
  protected void storeDomain(T entity, EntityReference domain) {
    if (supportsDomain && domain != null) {
      // Add relationship domain --- has ---> entity
      LOG.info(
          "Adding domain {} for entity {}:{}",
          domain.getFullyQualifiedName(),
          entityType,
          entity.getId());
      addRelationship(domain.getId(), entity.getId(), Entity.DOMAIN, entityType, Relationship.HAS);
    }
  }

  @Transaction
  protected void storeReviewers(T entity, List<EntityReference> reviewers) {
    if (supportsReviewers) {
      // Add relationship user/team --- reviews ---> entity
      for (EntityReference reviewer : listOrEmpty(reviewers)) {
        addRelationship(
            reviewer.getId(), entity.getId(), reviewer.getType(), entityType, Relationship.REVIEWS);
      }
    }
  }

  @Transaction
  protected void storeDataProducts(T entity, List<EntityReference> dataProducts) {
    if (supportsDataProducts && !nullOrEmpty(dataProducts)) {
      for (EntityReference dataProduct : dataProducts) {
        // Add relationship dataProduct --- has ---> entity
        LOG.info(
            "Adding dataProduct {} for entity {}:{}",
            dataProduct.getFullyQualifiedName(),
            entityType,
            entity.getId());
        addRelationship(
            dataProduct.getId(), entity.getId(), Entity.DATA_PRODUCT, entityType, Relationship.HAS);
      }
    }
  }

  protected BulkOperationResult bulkAssetsOperation(
      UUID entityId,
      String fromEntity,
      Relationship relationship,
      BulkAssets request,
      boolean isAdd) {
    BulkOperationResult result =
        new BulkOperationResult().withStatus(ApiStatus.SUCCESS).withDryRun(false);
    List<BulkResponse> success = new ArrayList<>();
    // Validate Assets
    EntityUtil.populateEntityReferences(request.getAssets());

    for (EntityReference ref : request.getAssets()) {
      // Update Result Processed
      result.setNumberOfRowsProcessed(result.getNumberOfRowsProcessed() + 1);

      if (isAdd) {
        addRelationship(entityId, ref.getId(), fromEntity, ref.getType(), relationship);
      } else {
        deleteRelationship(entityId, fromEntity, ref.getId(), ref.getType(), relationship);
      }

      success.add(new BulkResponse().withRequest(ref));
      result.setNumberOfRowsPassed(result.getNumberOfRowsPassed() + 1);

      // Update ES
      searchRepository.updateEntity(ref);
    }

    result.withSuccessRequest(success);

    // Create a Change Event on successful addition/removal of assets
    if (result.getStatus().equals(ApiStatus.SUCCESS)) {
      EntityInterface entityInterface = Entity.getEntity(fromEntity, entityId, "id", ALL);
      ChangeDescription change =
          addBulkAddRemoveChangeDescription(
              entityInterface.getVersion(), isAdd, request.getAssets(), null);
      ChangeEvent changeEvent =
          getChangeEvent(entityInterface, change, fromEntity, entityInterface.getVersion());
      Entity.getCollectionDAO().changeEventDAO().insert(JsonUtils.pojoToJson(changeEvent));
    }

    return result;
  }

  private ChangeDescription addBulkAddRemoveChangeDescription(
      Double version, boolean isAdd, Object newValue, Object oldValue) {
    FieldChange fieldChange =
        new FieldChange().withName("assets").withNewValue(newValue).withOldValue(oldValue);
    ChangeDescription change = new ChangeDescription().withPreviousVersion(version);
    if (isAdd) {
      change.getFieldsAdded().add(fieldChange);
    } else {
      change.getFieldsDeleted().add(fieldChange);
    }
    return change;
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

  /** Remove owner relationship for a given entity */
  @Transaction
  private void removeOwner(T entity, EntityReference owner) {
    if (EntityUtil.getId(owner) != null) {
      LOG.info(
          "Removing owner {}:{} for entity {}",
          owner.getType(),
          owner.getFullyQualifiedName(),
          entity.getId());
      deleteRelationship(
          owner.getId(), owner.getType(), entity.getId(), entityType, Relationship.OWNS);
    }
  }

  @Transaction
  public final void updateOwner(
      T ownedEntity, EntityReference originalOwner, EntityReference newOwner) {
    if (Objects.equals(getId(originalOwner), getId(newOwner))) {
      return;
    }
    validateOwner(newOwner);
    removeOwner(ownedEntity, originalOwner);
    storeOwner(ownedEntity, newOwner);
  }

  public final Fields getFields(String fields) {
    if ("*".equals(fields)) {
      return new Fields(allowedFields, String.join(",", allowedFields));
    }
    return new Fields(allowedFields, fields);
  }

  protected final Fields getFields(Set<String> fields) {
    return new Fields(allowedFields, fields);
  }

  public final Set<String> getCommonFields(Set<String> input) {
    Set<String> result = new HashSet<>();
    for (String field : input) {
      if (allowedFields.contains(field)) {
        result.add(field);
      }
    }
    return result;
  }

  public final Set<String> getAllowedFieldsCopy() {
    return new HashSet<>(allowedFields);
  }

  protected String getCustomPropertyFQNPrefix(String entityType) {
    return FullyQualifiedName.build(entityType, "customProperties");
  }

  protected String getCustomPropertyFQN(String entityType, String propertyName) {
    return FullyQualifiedName.build(entityType, "customProperties", propertyName);
  }

  protected List<EntityReference> getIngestionPipelines(T service) {
    return findTo(service.getId(), entityType, Relationship.CONTAINS, Entity.INGESTION_PIPELINE);
  }

  protected void checkSystemEntityDeletion(T entity) {
    if (ProviderType.SYSTEM.equals(
        entity.getProvider())) { // System provided entity can't be deleted
      throw new IllegalArgumentException(
          CatalogExceptionMessage.systemEntityDeleteNotAllowed(entity.getName(), entityType));
    }
  }

  public final EntityReference validateOwner(EntityReference owner) {
    if (owner == null) {
      return null;
    }
    if (!owner.getType().equals(Entity.TEAM) && !owner.getType().equals(USER)) {
      throw new IllegalArgumentException(CatalogExceptionMessage.invalidOwnerType(owner.getType()));
    } else if (owner
        .getType()
        .equals(Entity.TEAM)) { // Entities can be only owned by team of type 'group'
      Team team = Entity.getEntity(Entity.TEAM, owner.getId(), "", ALL);
      if (!team.getTeamType().equals(CreateTeam.TeamType.GROUP)) {
        throw new IllegalArgumentException(
            CatalogExceptionMessage.invalidTeamOwner(team.getTeamType()));
      }
      return team.getEntityReference();
    }
    return Entity.getEntityReferenceById(owner.getType(), owner.getId(), ALL);
  }

  protected void validateTags(T entity) {
    if (!supportsTags) {
      return;
    }
    validateTags(entity.getTags());
    entity.setTags(addDerivedTags(entity.getTags()));
    checkMutuallyExclusive(entity.getTags());
  }

  protected void validateTags(List<TagLabel> labels) {
    for (TagLabel label : listOrEmpty(labels)) {
      TagLabelUtil.applyTagCommonFields(label);
    }
  }

  public final EntityReference validateDomain(String domainFqn) {
    if (!supportsDomain || domainFqn == null) {
      return null;
    }
    return Entity.getEntityReferenceByName(Entity.DOMAIN, domainFqn, NON_DELETED);
  }

  public final void validateDomain(EntityReference domain) {
    if (!supportsDomain) {
      throw new IllegalArgumentException(CatalogExceptionMessage.invalidField(FIELD_DOMAIN));
    }
    Entity.getEntityReferenceById(Entity.DOMAIN, domain.getId(), NON_DELETED);
  }

  public final void validateDataProducts(List<EntityReference> dataProducts) {
    if (!supportsDataProducts) {
      throw new IllegalArgumentException(CatalogExceptionMessage.invalidField(FIELD_DATA_PRODUCTS));
    }

    if (!nullOrEmpty(dataProducts)) {
      for (EntityReference dataProduct : dataProducts) {
        Entity.getEntityReferenceById(Entity.DATA_PRODUCT, dataProduct.getId(), NON_DELETED);
      }
    }
  }

  /** Override this method to support downloading CSV functionality */
  public String exportToCsv(String name, String user) throws IOException {
    throw new IllegalArgumentException(csvNotSupported(entityType));
  }

  /** Load CSV provided for bulk upload */
  public CsvImportResult importFromCsv(String name, String csv, boolean dryRun, String user)
      throws IOException {
    throw new IllegalArgumentException(csvNotSupported(entityType));
  }

  public List<TagLabel> getAllTags(EntityInterface entity) {
    return entity.getTags();
  }

  public TaskWorkflow getTaskWorkflow(ThreadContext threadContext) {
    validateTaskThread(threadContext);
    TaskType taskType = threadContext.getThread().getTask().getType();
    if (EntityUtil.isDescriptionTask(taskType)) {
      return new DescriptionTaskWorkflow(threadContext);
    } else if (EntityUtil.isTagTask(taskType)) {
      return new TagTaskWorkflow(threadContext);
    } else {
      throw new IllegalArgumentException(String.format("Invalid task type %s", taskType));
    }
  }

  public SuggestionRepository.SuggestionWorkflow getSuggestionWorkflow(EntityInterface entity) {
    return new SuggestionRepository.SuggestionWorkflow(entity);
  }

  public EntityInterface applySuggestion(
      EntityInterface entity, String childFQN, Suggestion suggestion) {
    return entity;
  }

  /**
   * Bring in the necessary fields required to have all the information before applying a suggestion
   */
  public String getSuggestionFields(Suggestion suggestion) {
    return suggestion.getType() == SuggestionType.SuggestTagLabel ? "tags" : "";
  }

  public final void validateTaskThread(ThreadContext threadContext) {
    ThreadType threadType = threadContext.getThread().getType();
    if (threadType != ThreadType.Task) {
      throw new IllegalArgumentException(
          String.format("Thread type %s is not task related", threadType));
    }
  }

  protected void validateColumnTags(List<Column> columns) {
    // Add column level tags by adding tag to column relationship
    for (Column column : listOrEmpty(columns)) {
      validateTags(column.getTags());
      column.setTags(addDerivedTags(column.getTags()));
      checkMutuallyExclusive(column.getTags());
      if (column.getChildren() != null) {
        validateColumnTags(column.getChildren());
      }
    }
  }

  public enum Operation {
    PUT,
    PATCH,
    SOFT_DELETE;

    public boolean isPatch() {
      return this == PATCH;
    }

    public boolean isPut() {
      return this == PUT;
    }

    public boolean isDelete() {
      return this == SOFT_DELETE;
    }
  }

  /**
   * Class that performs PUT and PATCH update operation. It takes an <i>updated</i> entity and <i>original</i> entity.
   * Performs comparison between then and updates the stored entity and also updates all the relationships. This class
   * also tracks the changes between original and updated to version the entity and produce change events. <br>
   * <br>
   * Common entity attributes such as description, displayName, owner, tags are handled by this class. Override {@code
   * entitySpecificUpdate()} to add additional entity specific fields to be updated. <br>
   * EntityUpdater supports consolidation of changes done by a user within session timeout. It is done as follows:
   *
   * <ol>
   *   <li>First, entity is reverted from current version (original) to previous version without recording any changes.
   *       Hence changeDescription is null in this phase.
   *   <li>Second, entity is updated from current version (original) to updated to carry forward changes from original
   *       to updated again without recording changes. Hence changeDescription is null in this phase.
   *   <li>Finally, entity is updated from previous version to updated to consolidate the changes in a session. Hence
   *       changeDescription is **NOT** null in this phase.
   * </ol>
   *
   * Here are the cases for consolidation:
   *
   * <ol>
   *   <li>Entity goes from v0 -> v1 -> v1 again where consolidation of changes in original and updated happens
   *       resulting in new version of the entity that remains the same. In this case stored previous version remains v0
   *       and new version v1 is stored that has consolidated updates.
   *   <li>Entity goes from v0 -> v1 -> v0 where v1 -> v0 undoes the changes from v0 -> v1. Example a user added a
   *       description to create v1. Then removed the description in the next update. In this case stored previous
   *       version goes to v-1 and new version v0 replaces v1 for the entity.
   * </ol>
   *
   * @see TableRepository.TableUpdater#entitySpecificUpdate() for example.
   */
  public class EntityUpdater {
    private static volatile long sessionTimeoutMillis = 10L * 60 * 1000; // 10 minutes
    protected T previous;
    protected T original;
    protected T updated;
    protected final Operation operation;
    protected ChangeDescription changeDescription = null;
    protected boolean majorVersionChange = false;
    protected final User updatingUser;
    private boolean entityChanged = false;

    public EntityUpdater(T original, T updated, Operation operation) {
      this.original = original;
      this.updated = updated;
      this.operation = operation;
      this.updatingUser =
          updated.getUpdatedBy().equalsIgnoreCase(ADMIN_USER_NAME)
              ? new User().withName(ADMIN_USER_NAME).withIsAdmin(true)
              : getEntityByName(Entity.USER, updated.getUpdatedBy(), "", NON_DELETED);
    }

    /** Compare original and updated entities and perform updates. Update the entity version and track changes. */
    @Transaction
    public final void update() {
      boolean consolidateChanges = consolidateChanges(original, updated, operation);
      // Revert the changes previously made by the user with in a session and consolidate all the
      // changes
      if (consolidateChanges) {
        revert();
      }
      // Now updated from previous/original to updated one
      changeDescription = new ChangeDescription();
      updateInternal();

      // Store the updated entity
      storeUpdate();
      postUpdate(original, updated);
    }

    @Transaction
    private void revert() {
      // Revert from current version to previous version to go back to the previous version
      // set changeDescription to null
      T updatedOld = updated;
      previous = getPreviousVersion(original);
      if (previous != null) {
        LOG.debug(
            "In session change consolidation. Reverting to previous version {}",
            previous.getVersion());
        updated = previous;
        updateInternal();
        LOG.info(
            "In session change consolidation. Reverting to previous version {} completed",
            previous.getVersion());

        // Now go from original to updated
        updated = updatedOld;
        updateInternal();

        // Finally, go from previous to the latest updated entity to consolidate changes
        original = previous;
        entityChanged = false;
      }
    }

    /** Compare original and updated entities and perform updates. Update the entity version and track changes. */
    @Transaction
    private void updateInternal() {
      if (operation.isDelete()) { // Soft DELETE Operation
        updateDeleted();
      } else { // PUT or PATCH operations
        updated.setId(original.getId());
        updateDeleted();
        updateDescription();
        updateDisplayName();
        updateOwner();
        updateExtension();
        updateTags(
            updated.getFullyQualifiedName(), FIELD_TAGS, original.getTags(), updated.getTags());
        updateDomain();
        updateDataProducts();
        updateExperts();
        updateReviewers();
        updateStyle();
        updateLifeCycle();
        entitySpecificUpdate();
      }
    }

    protected void entitySpecificUpdate() {
      // Default implementation. Override this to add any entity specific field updates
    }

    private void updateDescription() {
      if (operation.isPut() && !nullOrEmpty(original.getDescription()) && updatedByBot()) {
        // Revert change to non-empty description if it is being updated by a bot
        // This is to prevent bots from overwriting the description. Description need to be
        // updated with a PATCH request
        updated.setDescription(original.getDescription());
        return;
      }
      recordChange(FIELD_DESCRIPTION, original.getDescription(), updated.getDescription());
    }

    private void updateDeleted() {
      if (operation.isPut() || operation.isPatch()) {
        // Update operation can't set delete attributed to true. This can only be done as part of
        // delete operation
        if (!Objects.equals(updated.getDeleted(), original.getDeleted())
            && Boolean.TRUE.equals(updated.getDeleted())
            && changeDescription != null) {
          throw new IllegalArgumentException(
              CatalogExceptionMessage.readOnlyAttribute(entityType, FIELD_DELETED));
        }
        // PUT or PATCH is restoring the soft-deleted entity
        if (Boolean.TRUE.equals(original.getDeleted())) {
          updated.setDeleted(false);
          recordChange(FIELD_DELETED, true, false);
        }
      } else {
        recordChange(FIELD_DELETED, original.getDeleted(), updated.getDeleted());
      }
    }

    private void updateDisplayName() {
      if (operation.isPut() && !nullOrEmpty(original.getDisplayName()) && updatedByBot()) {
        // Revert change to non-empty displayName if it is being updated by a bot
        updated.setDisplayName(original.getDisplayName());
        return;
      }
      recordChange(FIELD_DISPLAY_NAME, original.getDisplayName(), updated.getDisplayName());
    }

    private void updateOwner() {
      EntityReference origOwner = getEntityReference(original.getOwner());
      EntityReference updatedOwner = getEntityReference(updated.getOwner());
      if ((operation.isPatch() || updatedOwner != null)
          && recordChange(FIELD_OWNER, origOwner, updatedOwner, true, entityReferenceMatch)) {
        // Update owner for all PATCH operations. For PUT operations, ownership can't be removed
        EntityRepository.this.updateOwner(original, origOwner, updatedOwner);
        updated.setOwner(updatedOwner);
      } else {
        updated.setOwner(origOwner); // Restore original owner
      }
    }

    protected void updateTags(
        String fqn, String fieldName, List<TagLabel> origTags, List<TagLabel> updatedTags) {
      // Remove current entity tags in the database. It will be added back later from the merged tag
      // list.
      origTags = listOrEmpty(origTags);
      // updatedTags cannot be immutable list, as we are adding the origTags to updatedTags even if
      // its empty.
      updatedTags = Optional.ofNullable(updatedTags).orElse(new ArrayList<>());
      if (origTags.isEmpty() && updatedTags.isEmpty()) {
        return; // Nothing to update
      }

      // Remove current entity tags in the database. It will be added back later from the merged tag
      // list.
      daoCollection.tagUsageDAO().deleteTagsByTarget(fqn);

      if (operation.isPut()) {
        // PUT operation merges tags in the request with what already exists
        EntityUtil.mergeTags(updatedTags, origTags);
        checkMutuallyExclusive(updatedTags);
      }

      List<TagLabel> addedTags = new ArrayList<>();
      List<TagLabel> deletedTags = new ArrayList<>();
      recordListChange(fieldName, origTags, updatedTags, addedTags, deletedTags, tagLabelMatch);
      updatedTags.sort(compareTagLabel);
      applyTags(updatedTags, fqn);
    }

    private void updateExtension() {
      Object origExtension = original.getExtension();
      Object updatedExtension = updated.getExtension();
      if (origExtension == updatedExtension) {
        return;
      }
      if (updatedByBot() && operation == Operation.PUT) {
        // Revert extension field, if being updated by a bot with a PUT request to avoid overwriting
        // custom extension
        updated.setExtension(origExtension);
        return;
      }

      List<JsonNode> added = new ArrayList<>();
      List<JsonNode> deleted = new ArrayList<>();
      JsonNode origFields = JsonUtils.valueToTree(origExtension);
      JsonNode updatedFields = JsonUtils.valueToTree(updatedExtension);

      // Check for updated and deleted fields
      for (Iterator<Entry<String, JsonNode>> it = origFields.fields(); it.hasNext(); ) {
        Entry<String, JsonNode> orig = it.next();
        JsonNode updatedField = updatedFields.get(orig.getKey());
        if (updatedField == null) {
          deleted.add(JsonUtils.getObjectNode(orig.getKey(), orig.getValue()));
        } else {
          // TODO converting to a string is a hack for now because JsonNode equals issues
          recordChange(
              getExtensionField(orig.getKey()),
              orig.getValue().toString(),
              updatedField.toString());
        }
      }

      // Check for added fields
      for (Iterator<Entry<String, JsonNode>> it = updatedFields.fields(); it.hasNext(); ) {
        Entry<String, JsonNode> updatedField = it.next();
        JsonNode orig = origFields.get(updatedField.getKey());
        if (orig == null) {
          added.add(JsonUtils.getObjectNode(updatedField.getKey(), updatedField.getValue()));
        }
      }
      if (!added.isEmpty()) {
        fieldAdded(changeDescription, FIELD_EXTENSION, JsonUtils.pojoToJson(added));
      }
      if (!deleted.isEmpty()) {
        fieldDeleted(changeDescription, FIELD_EXTENSION, JsonUtils.pojoToJson(deleted));
      }
      removeExtension(original);
      storeExtension(updated);
    }

    private void updateDomain() {
      EntityReference origDomain = getEntityReference(original.getDomain());
      EntityReference updatedDomain = getEntityReference(updated.getDomain());
      if (origDomain == updatedDomain) {
        return;
      }
      if (operation.isPut() && !nullOrEmpty(original.getDomain()) && updatedByBot()) {
        // Revert change to non-empty domain if it is being updated by a bot
        // This is to prevent bots from overwriting the domain. Domain need to be
        // updated with a PATCH request
        updated.setDomain(original.getDomain());
        return;
      }

      if ((operation.isPatch() || updatedDomain != null)
          && recordChange(FIELD_DOMAIN, origDomain, updatedDomain, true, entityReferenceMatch)) {
        if (origDomain != null) {
          LOG.info(
              "Removing domain {} for entity {}",
              origDomain.getFullyQualifiedName(),
              original.getFullyQualifiedName());
          deleteRelationship(
              origDomain.getId(), Entity.DOMAIN, original.getId(), entityType, Relationship.HAS);
        }
        if (updatedDomain != null) {
          validateDomain(updatedDomain);
          // Add relationship owner --- owns ---> ownedEntity
          LOG.info(
              "Adding domain {} for entity {}",
              updatedDomain.getFullyQualifiedName(),
              original.getFullyQualifiedName());
          addRelationship(
              updatedDomain.getId(), original.getId(), Entity.DOMAIN, entityType, Relationship.HAS);
        }
        updated.setDomain(updatedDomain);
      } else {
        updated.setDomain(original.getDomain());
      }
    }

    private void updateDataProducts() {
      if (!supportsDataProducts) {
        return;
      }
      List<EntityReference> origDataProducts = listOrEmpty(original.getDataProducts());
      List<EntityReference> updatedDataProducts = listOrEmpty(updated.getDataProducts());
      validateDataProducts(updatedDataProducts);
      updateFromRelationships(
          FIELD_DATA_PRODUCTS,
          DATA_PRODUCT,
          origDataProducts,
          updatedDataProducts,
          Relationship.HAS,
          entityType,
          original.getId());
    }

    private void updateExperts() {
      if (!supportsExperts) {
        return;
      }
      List<EntityReference> origExperts = getEntityReferences(original.getExperts());
      List<EntityReference> updatedExperts = getEntityReferences(updated.getExperts());
      validateUsers(updatedExperts);
      updateToRelationships(
          FIELD_EXPERTS,
          entityType,
          original.getId(),
          Relationship.EXPERT,
          Entity.USER,
          origExperts,
          updatedExperts,
          false);
      updated.setExperts(updatedExperts);
    }

    protected void updateReviewers() {
      if (!supportsReviewers) {
        return;
      }
      List<EntityReference> origReviewers = getEntityReferences(original.getReviewers());
      List<EntityReference> updatedReviewers = getEntityReferences(updated.getReviewers());
      validateReviewers(updatedReviewers);
      // Either all users or team which is one team at a time, assuming all ref to have same type,
      // validateReviewer checks it
      updateFromRelationships(
          "reviewers",
          null,
          origReviewers,
          updatedReviewers,
          Relationship.REVIEWS,
          entityType,
          original.getId());
      updated.setReviewers(updatedReviewers);
    }

    private static EntityReference getEntityReference(EntityReference reference) {
      // Don't use the inherited entity reference in update
      return reference == null || Boolean.TRUE.equals(reference.getInherited()) ? null : reference;
    }

    private static List<EntityReference> getEntityReferences(List<EntityReference> references) {
      // Don't use the inherited entity references in update
      return listOrEmpty(references).stream()
          .filter(r -> !Boolean.TRUE.equals(r.getInherited()))
          .collect(Collectors.toList());
    }

    private void updateStyle() {
      if (supportsStyle) {
        recordChange(FIELD_STYLE, original.getStyle(), updated.getStyle(), true);
      }
    }

    private void updateLifeCycle() {
      if (!supportsLifeCycle) {
        return;
      }
      LifeCycle origLifeCycle = original.getLifeCycle();
      LifeCycle updatedLifeCycle = updated.getLifeCycle();

      if (operation == Operation.PUT && updatedLifeCycle == null) {
        updatedLifeCycle = origLifeCycle;
        updated.setLifeCycle(origLifeCycle);
      }

      if (origLifeCycle == updatedLifeCycle) return;

      if (origLifeCycle != null && updatedLifeCycle != null) {
        if (origLifeCycle.getCreated() != null
            && (updatedLifeCycle.getCreated() == null
                || updatedLifeCycle.getCreated().getTimestamp()
                    < origLifeCycle.getCreated().getTimestamp())) {
          updatedLifeCycle.setCreated(origLifeCycle.getCreated());
        }

        if (origLifeCycle.getAccessed() != null
            && (updatedLifeCycle.getAccessed() == null
                || updatedLifeCycle.getAccessed().getTimestamp()
                    < origLifeCycle.getAccessed().getTimestamp())) {
          updatedLifeCycle.setAccessed(origLifeCycle.getAccessed());
        }

        if (origLifeCycle.getUpdated() != null
            && (updatedLifeCycle.getUpdated() == null
                || updatedLifeCycle.getUpdated().getTimestamp()
                    < origLifeCycle.getUpdated().getTimestamp())) {
          updatedLifeCycle.setUpdated(origLifeCycle.getUpdated());
        }
      }
      recordChange(FIELD_LIFE_CYCLE, origLifeCycle, updatedLifeCycle, true);
    }

    public final boolean updateVersion(Double oldVersion) {
      Double newVersion = oldVersion;
      if (majorVersionChange) {
        newVersion = nextMajorVersion(oldVersion);
      } else if (fieldsChanged()) {
        newVersion = nextVersion(oldVersion);
      }
      LOG.debug(
          "{} {}->{} - Fields added {}, updated {}, deleted {}",
          original.getId(),
          oldVersion,
          newVersion,
          changeDescription.getFieldsAdded(),
          changeDescription.getFieldsUpdated(),
          changeDescription.getFieldsDeleted());
      changeDescription.withPreviousVersion(oldVersion);
      updated.setVersion(newVersion);
      updated.setChangeDescription(changeDescription);
      return !newVersion.equals(oldVersion);
    }

    public final boolean fieldsChanged() {
      if (changeDescription == null) {
        return false;
      }
      return !changeDescription.getFieldsAdded().isEmpty()
          || !changeDescription.getFieldsUpdated().isEmpty()
          || !changeDescription.getFieldsDeleted().isEmpty();
    }

    public final <K> boolean recordChange(String field, K orig, K updated) {
      return recordChange(field, orig, updated, false, objectMatch, true);
    }

    public final <K> boolean recordChange(String field, K orig, K updated, boolean jsonValue) {
      return recordChange(field, orig, updated, jsonValue, objectMatch, true);
    }

    public final <K> boolean recordChange(
        String field, K orig, K updated, boolean jsonValue, BiPredicate<K, K> typeMatch) {
      return recordChange(field, orig, updated, jsonValue, typeMatch, true);
    }

    public final <K> boolean recordChange(
        String field,
        K orig,
        K updated,
        boolean jsonValue,
        BiPredicate<K, K> typeMatch,
        boolean updateVersion) {
      if (orig == updated) {
        return false;
      }
      if (!updateVersion && entityChanged) {
        return false;
      }
      Object oldValue = jsonValue ? JsonUtils.pojoToJson(orig) : orig;
      Object newValue = jsonValue ? JsonUtils.pojoToJson(updated) : updated;
      if (orig == null) {
        entityChanged = true;
        if (updateVersion) {
          fieldAdded(changeDescription, field, newValue);
        }
        return true;
      } else if (updated == null) {
        entityChanged = true;
        if (updateVersion) {
          fieldDeleted(changeDescription, field, oldValue);
        }
        return true;
      } else if (!typeMatch.test(orig, updated)) {
        entityChanged = true;
        if (updateVersion) {
          fieldUpdated(changeDescription, field, oldValue, newValue);
        }
        return true;
      }
      return false;
    }

    public final <K> boolean recordListChange(
        String field,
        List<K> origList,
        List<K> updatedList,
        List<K> addedItems,
        List<K> deletedItems,
        BiPredicate<K, K> typeMatch) {
      origList = listOrEmpty(origList);
      updatedList = listOrEmpty(updatedList);
      List<K> updatedItems = new ArrayList<>();

      for (K stored : origList) {
        // If an entry in the original list is not in updated list, then it is deleted during update
        K u = updatedList.stream().filter(c -> typeMatch.test(c, stored)).findAny().orElse(null);
        if (u == null) {
          deletedItems.add(stored);
        }
      }

      for (K U : updatedList) {
        // If an entry in the updated list is not in original list, then it is added during update
        K stored = origList.stream().filter(c -> typeMatch.test(c, U)).findAny().orElse(null);
        if (stored == null) { // New entry added
          addedItems.add(U);
        } else if (!typeMatch.test(stored, U)) {
          updatedItems.add(U);
        }
      }
      if (!addedItems.isEmpty()) {
        fieldAdded(changeDescription, field, JsonUtils.pojoToJson(addedItems));
      }
      if (!updatedItems.isEmpty()) {
        fieldUpdated(
            changeDescription,
            field,
            JsonUtils.pojoToJson(origList),
            JsonUtils.pojoToJson(updatedItems));
      }
      if (!deletedItems.isEmpty()) {
        fieldDeleted(changeDescription, field, JsonUtils.pojoToJson(deletedItems));
      }
      return !addedItems.isEmpty() || !deletedItems.isEmpty();
    }

    /**
     * Remove `fromEntityType:fromId` -- `relationType` ---> `toEntityType:origToRefs` Add `fromEntityType:fromId` --
     * `relationType` ---> `toEntityType:updatedToRefs` and record it as change for entity field `field`.
     *
     * <p>When `bidirectional` is set to true, relationship from both side are replaced
     */
    public final void updateToRelationships(
        String field,
        String fromEntityType,
        UUID fromId,
        Relationship relationshipType,
        String toEntityType,
        List<EntityReference> origToRefs,
        List<EntityReference> updatedToRefs,
        boolean bidirectional) {
      List<EntityReference> added = new ArrayList<>();
      List<EntityReference> deleted = new ArrayList<>();
      if (!recordListChange(
          field, origToRefs, updatedToRefs, added, deleted, entityReferenceMatch)) {
        return; // No changes between original and updated.
      }
      // Remove relationships from original
      deleteFrom(fromId, fromEntityType, relationshipType, toEntityType);
      if (bidirectional) {
        deleteTo(fromId, fromEntityType, relationshipType, toEntityType);
      }
      // Add relationships from updated
      for (EntityReference ref : updatedToRefs) {
        addRelationship(
            fromId, ref.getId(), fromEntityType, toEntityType, relationshipType, bidirectional);
      }
      updatedToRefs.sort(EntityUtil.compareEntityReference);
      origToRefs.sort(EntityUtil.compareEntityReference);
    }

    public final void updateToRelationship(
        String field,
        String fromEntityType,
        UUID fromId,
        Relationship relationshipType,
        String toEntityType,
        EntityReference origToRef,
        EntityReference updatedToRef,
        boolean bidirectional) {
      if (!recordChange(field, origToRef, updatedToRef, true, entityReferenceMatch)) {
        return; // No changes between original and updated.
      }
      // Remove relationships from original
      deleteFrom(fromId, fromEntityType, relationshipType, toEntityType);
      if (bidirectional) {
        deleteTo(fromId, fromEntityType, relationshipType, toEntityType);
      }
      // Add relationships from updated
      addRelationship(
          fromId,
          updatedToRef.getId(),
          fromEntityType,
          toEntityType,
          relationshipType,
          bidirectional);
    }

    /**
     * Remove `fromEntityType:origFromRefs` -- `relationType` ---> `toEntityType:toId` Add
     * `fromEntityType:updatedFromRefs` -- `relationType` ---> `toEntityType:toId` and record it as change for entity
     * field `field`.
     */
    public final void updateFromRelationships(
        String field,
        String fromEntityType,
        List<EntityReference> originFromRefs,
        List<EntityReference> updatedFromRefs,
        Relationship relationshipType,
        String toEntityType,
        UUID toId) {
      List<EntityReference> added = new ArrayList<>();
      List<EntityReference> deleted = new ArrayList<>();
      if (!recordListChange(
          field, originFromRefs, updatedFromRefs, added, deleted, entityReferenceMatch)) {
        return; // No changes between original and updated.
      }
      // Remove relationships from original
      deleteTo(toId, toEntityType, relationshipType, fromEntityType);

      // Add relationships from updated
      for (EntityReference ref : updatedFromRefs) {
        addRelationship(ref.getId(), toId, ref.getType(), toEntityType, relationshipType);
      }
      updatedFromRefs.sort(EntityUtil.compareEntityReference);
      originFromRefs.sort(EntityUtil.compareEntityReference);
    }

    public final void updateFromRelationship(
        String field,
        String fromEntityType,
        EntityReference originFromRef,
        EntityReference updatedFromRef,
        Relationship relationshipType,
        String toEntityType,
        UUID toId) {
      if (!recordChange(field, originFromRef, updatedFromRef, true, entityReferenceMatch)) {
        return; // No changes between original and updated.
      }
      // Remove relationships from original
      deleteTo(toId, toEntityType, relationshipType, fromEntityType);

      // Add relationships from updated
      addRelationship(updatedFromRef.getId(), toId, fromEntityType, toEntityType, relationshipType);
    }

    public final void storeUpdate() {
      if (updateVersion(original.getVersion())) { // Update changed the entity version
        storeEntityHistory(); // Store old version for listing previous versions of the entity
        storeNewVersion(); // Store the update version of the entity
      } else if (entityChanged) {
        if (updated.getVersion().equals(changeDescription.getPreviousVersion())) {
          updated.setChangeDescription(original.getChangeDescription());
        }
        storeNewVersion();
      } else { // Update did not change the entity version
        updated.setChangeDescription(original.getChangeDescription());
        updated.setUpdatedBy(original.getUpdatedBy());
        updated.setUpdatedAt(original.getUpdatedAt());
        // Remove entity history recorded when going from previous -> original (and now back to
        // previous)
        if (previous != null && previous.getVersion().equals(updated.getVersion())) {
          storeNewVersion();
          removeEntityHistory(updated.getVersion());
        }
      }
    }

    private void storeEntityHistory() {
      String extensionName = EntityUtil.getVersionExtension(entityType, original.getVersion());
      daoCollection
          .entityExtensionDAO()
          .insert(original.getId(), extensionName, entityType, JsonUtils.pojoToJson(original));
    }

    private void removeEntityHistory(Double version) {
      String extensionName = EntityUtil.getVersionExtension(entityType, version);
      daoCollection.entityExtensionDAO().delete(original.getId(), extensionName);
    }

    private void storeNewVersion() {
      EntityRepository.this.storeEntity(updated, true);
    }

    public final boolean updatedByBot() {
      return Boolean.TRUE.equals(updatingUser.getIsBot());
    }

    @VisibleForTesting
    public static void setSessionTimeout(long timeout) {
      sessionTimeoutMillis = timeout;
    }

    private boolean consolidateChanges(T original, T updated, Operation operation) {
      // If user is the same and the new update is with in the user session timeout
      return original.getVersion() > 0.1 // First update on an entity that
          && operation == Operation.PATCH
          && !Boolean.TRUE.equals(original.getDeleted()) // Entity is not soft deleted
          && !operation.isDelete() // Operation must be an update
          && original
              .getUpdatedBy()
              .equals(updated.getUpdatedBy()) // Must be updated by the same user
          && updated.getUpdatedAt() - original.getUpdatedAt()
              <= sessionTimeoutMillis; // With in session timeout
    }

    private T getPreviousVersion(T original) {
      String extensionName =
          EntityUtil.getVersionExtension(
              entityType, original.getChangeDescription().getPreviousVersion());
      String json =
          daoCollection.entityExtensionDAO().getExtension(original.getId(), extensionName);
      return JsonUtils.readValue(json, entityClass);
    }
  }

  /** Handle column-specific updates for entities such as Tables, Containers' dataModel or Dashboard Model Entities. */
  abstract class ColumnEntityUpdater extends EntityUpdater {

    protected ColumnEntityUpdater(T original, T updated, Operation operation) {
      super(original, updated, operation);
    }

    public void updateColumns(
        String fieldName,
        List<Column> origColumns,
        List<Column> updatedColumns,
        BiPredicate<Column, Column> columnMatch) {
      List<Column> deletedColumns = new ArrayList<>();
      List<Column> addedColumns = new ArrayList<>();
      recordListChange(
          fieldName, origColumns, updatedColumns, addedColumns, deletedColumns, columnMatch);
      // carry forward tags and description if deletedColumns matches added column
      Map<String, Column> addedColumnMap =
          addedColumns.stream().collect(Collectors.toMap(Column::getName, Function.identity()));

      for (Column deleted : deletedColumns) {
        if (addedColumnMap.containsKey(deleted.getName())) {
          Column addedColumn = addedColumnMap.get(deleted.getName());
          if (nullOrEmpty(addedColumn.getDescription())) {
            addedColumn.setDescription(deleted.getDescription());
          }
          if (nullOrEmpty(addedColumn.getTags()) && nullOrEmpty(deleted.getTags())) {
            addedColumn.setTags(deleted.getTags());
          }
        }
      }

      // Delete tags related to deleted columns
      deletedColumns.forEach(
          deleted ->
              daoCollection.tagUsageDAO().deleteTagsByTarget(deleted.getFullyQualifiedName()));

      // Add tags related to newly added columns
      for (Column added : addedColumns) {
        applyTags(added.getTags(), added.getFullyQualifiedName());
      }

      // Carry forward the user generated metadata from existing columns to new columns
      for (Column updated : updatedColumns) {
        // Find stored column matching name, data type and ordinal position
        Column stored =
            origColumns.stream().filter(c -> columnMatch.test(c, updated)).findAny().orElse(null);
        if (stored == null) { // New column added
          continue;
        }

        updateColumnDescription(stored, updated);
        updateColumnDisplayName(stored, updated);
        updateColumnDataLength(stored, updated);
        updateColumnPrecision(stored, updated);
        updateColumnScale(stored, updated);
        updateTags(
            stored.getFullyQualifiedName(),
            EntityUtil.getFieldName(fieldName, updated.getName(), FIELD_TAGS),
            stored.getTags(),
            updated.getTags());
        updateColumnConstraint(stored, updated);

        if (updated.getChildren() != null && stored.getChildren() != null) {
          String childrenFieldName = EntityUtil.getFieldName(fieldName, updated.getName());
          updateColumns(
              childrenFieldName, stored.getChildren(), updated.getChildren(), columnMatch);
        }
      }

      majorVersionChange = majorVersionChange || !deletedColumns.isEmpty();
    }

    private void updateColumnDescription(Column origColumn, Column updatedColumn) {
      if (operation.isPut() && !nullOrEmpty(origColumn.getDescription()) && updatedByBot()) {
        // Revert the non-empty task description if being updated by a bot
        updatedColumn.setDescription(origColumn.getDescription());
        return;
      }
      String columnField = getColumnField(origColumn, FIELD_DESCRIPTION);
      recordChange(columnField, origColumn.getDescription(), updatedColumn.getDescription());
    }

    private void updateColumnDisplayName(Column origColumn, Column updatedColumn) {
      if (operation.isPut() && !nullOrEmpty(origColumn.getDisplayName()) && updatedByBot()) {
        // Revert the non-empty task display name if being updated by a bot
        updatedColumn.setDisplayName(origColumn.getDisplayName());
        return;
      }
      String columnField = getColumnField(origColumn, FIELD_DISPLAY_NAME);
      recordChange(columnField, origColumn.getDisplayName(), updatedColumn.getDisplayName());
    }

    private void updateColumnConstraint(Column origColumn, Column updatedColumn) {
      String columnField = getColumnField(origColumn, "constraint");
      recordChange(columnField, origColumn.getConstraint(), updatedColumn.getConstraint());
    }

    protected void updateColumnDataLength(Column origColumn, Column updatedColumn) {
      String columnField = getColumnField(origColumn, "dataLength");
      boolean updated =
          recordChange(columnField, origColumn.getDataLength(), updatedColumn.getDataLength());
      if (updated
          && (origColumn.getDataLength() == null
              || updatedColumn.getDataLength() < origColumn.getDataLength())) {
        // The data length of a column was reduced or added. Treat it as backward-incompatible
        // change
        majorVersionChange = true;
      }
    }

    private void updateColumnPrecision(Column origColumn, Column updatedColumn) {
      String columnField = getColumnField(origColumn, "precision");
      boolean updated =
          recordChange(columnField, origColumn.getPrecision(), updatedColumn.getPrecision());
      if (origColumn.getPrecision() != null
          && updated
          && (updatedColumn.getPrecision() == null
              || updatedColumn.getPrecision() < origColumn.getPrecision())) {
        // Previously set precision was reduced or removed. Treat it as backward-incompatible change
        majorVersionChange = true;
      }
    }

    private void updateColumnScale(Column origColumn, Column updatedColumn) {
      String columnField = getColumnField(origColumn, "scale");
      boolean updated = recordChange(columnField, origColumn.getScale(), updatedColumn.getScale());
      if (origColumn.getScale() != null
          && updated
          && (updatedColumn.getScale() == null
              || updatedColumn.getScale() < origColumn.getScale())) {
        // Previously set scale was reduced or removed. Treat it as backward-incompatible change
        majorVersionChange = true;
      }
    }
  }

  static class EntityLoaderWithName extends CacheLoader<Pair<String, String>, EntityInterface> {
    @Override
    public @NonNull EntityInterface load(@NotNull Pair<String, String> fqnPair) {
      String entityType = fqnPair.getLeft();
      String fqn = fqnPair.getRight();
      EntityRepository<? extends EntityInterface> repository =
          Entity.getEntityRepository(entityType);
      return repository.getDao().findEntityByName(fqn, ALL);
    }
  }

  static class EntityLoaderWithId extends CacheLoader<Pair<String, UUID>, EntityInterface> {
    @Override
    public @NonNull EntityInterface load(@NotNull Pair<String, UUID> idPair) {
      String entityType = idPair.getLeft();
      UUID id = idPair.getRight();
      EntityRepository<? extends EntityInterface> repository =
          Entity.getEntityRepository(entityType);
      return repository.getDao().findEntityById(id, ALL);
    }
  }

  public static class DescriptionTaskWorkflow extends TaskWorkflow {
    DescriptionTaskWorkflow(ThreadContext threadContext) {
      super(threadContext);
    }

    @Override
    public EntityInterface performTask(String user, ResolveTask resolveTask) {
      EntityInterface aboutEntity = threadContext.getAboutEntity();
      aboutEntity.setDescription(resolveTask.getNewValue());
      return aboutEntity;
    }
  }

  public static class TagTaskWorkflow extends TaskWorkflow {
    TagTaskWorkflow(ThreadContext threadContext) {
      super(threadContext);
    }

    @Override
    public EntityInterface performTask(String user, ResolveTask resolveTask) {
      List<TagLabel> tags = JsonUtils.readObjects(resolveTask.getNewValue(), TagLabel.class);
      EntityInterface aboutEntity = threadContext.getAboutEntity();
      aboutEntity.setTags(tags);
      return aboutEntity;
    }
  }

  // Validate if a given column exists in the table
  public static void validateColumn(Table table, String columnName) {
    boolean validColumn =
        table.getColumns().stream().anyMatch(col -> col.getName().equals(columnName));
    if (!validColumn) {
      throw new IllegalArgumentException("Invalid column name " + columnName);
    }
  }
}
