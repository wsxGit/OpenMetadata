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

package org.openmetadata.service.resources.lineage;

import static javax.ws.rs.core.Response.Status.NOT_FOUND;

import es.org.elasticsearch.action.search.SearchResponse;
import io.dropwizard.jersey.PATCH;
import io.dropwizard.jersey.errors.ErrorMessage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import javax.json.JsonPatch;
import javax.validation.Valid;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.UriInfo;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.api.lineage.AddLineage;
import org.openmetadata.schema.type.EntityLineage;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.MetadataOperation;
import org.openmetadata.schema.type.TagLabel;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.LineageRepository;
import org.openmetadata.service.resources.Collection;
import org.openmetadata.service.security.Authorizer;
import org.openmetadata.service.security.policyevaluator.OperationContext;
import org.openmetadata.service.security.policyevaluator.ResourceContextInterface;

@Path("/v1/lineage")
@Tag(
    name = "Lineage",
    description =
        "The `Lineage` for a given data asset, has information of the input datasets "
            + "used and the ETL pipeline that created it.")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "lineage")
public class LineageResource {
  static final String LINEAGE_FIELD = "lineage";
  private final LineageRepository dao;
  private final Authorizer authorizer;

  public LineageResource(Authorizer authorizer) {
    this.dao = Entity.getLineageRepository();
    this.authorizer = authorizer;
  }

  @GET
  @Valid
  @Path("/{entity}/{id}")
  @Operation(
      operationId = "getLineage",
      summary = "Get lineage by Id",
      description = "Get lineage details for an entity identified by `Id`.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Entity lineage",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = EntityLineage.class))),
        @ApiResponse(responseCode = "404", description = "Entity for instance {id} is not found")
      })
  public EntityLineage get(
      @Context UriInfo uriInfo,
      @Parameter(
              description = "Entity type for which lineage is requested",
              required = true,
              schema = @Schema(type = "string", example = "table, report, metrics, or dashboard"))
          @PathParam("entity")
          String entity,
      @Parameter(
              description = "Id of the entity",
              required = true,
              schema = @Schema(type = "string"))
          @PathParam("id")
          String id,
      @Parameter(description = "Upstream depth of lineage (default=1, min=0, max=3)")
          @DefaultValue("1")
          @Min(0)
          @Max(3)
          @QueryParam("upstreamDepth")
          int upstreamDepth,
      @Parameter(description = "Upstream depth of lineage (default=1, min=0, max=3)")
          @DefaultValue("1")
          @Min(0)
          @Max(3)
          @QueryParam("downstreamDepth")
          int downStreamDepth) {
    return addHref(uriInfo, dao.get(entity, id, upstreamDepth, downStreamDepth));
  }

  @GET
  @Valid
  @Path("/{entity}/name/{fqn}")
  @Operation(
      operationId = "getLineageByFQN",
      summary = "Get lineage by fully qualified name",
      description = "Get lineage details for an entity identified by fully qualified name.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Entity lineage",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = EntityLineage.class))),
        @ApiResponse(responseCode = "404", description = "Entity for instance {fqn} is not found")
      })
  public EntityLineage getByName(
      @Context UriInfo uriInfo,
      @Parameter(
              description = "Entity type for which lineage is requested",
              required = true,
              schema = @Schema(type = "string", example = "table, report, metrics, or dashboard"))
          @PathParam("entity")
          String entity,
      @Parameter(
              description = "Fully qualified name of the entity that uniquely identifies an entity",
              required = true,
              schema = @Schema(type = "string"))
          @PathParam("fqn")
          String fqn,
      @Parameter(description = "Upstream depth of lineage (default=1, min=0, max=3)")
          @DefaultValue("1")
          @Min(0)
          @Max(3)
          @QueryParam("upstreamDepth")
          int upstreamDepth,
      @Parameter(description = "Upstream depth of lineage (default=1, min=0, max=3)")
          @DefaultValue("1")
          @Min(0)
          @Max(3)
          @QueryParam("downstreamDepth")
          int downStreamDepth) {
    return addHref(uriInfo, dao.getByName(entity, fqn, upstreamDepth, downStreamDepth));
  }

  @GET
  @Path("/getLineage")
  @Operation(
      operationId = "searchLineage",
      summary = "Search lineage",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "search response",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = SearchResponse.class)))
      })
  public Response searchLineage(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "fqn") @QueryParam("fqn") String fqn,
      @Parameter(description = "upstreamDepth") @QueryParam("upstreamDepth") int upstreamDepth,
      @Parameter(description = "downstreamDepth") @QueryParam("downstreamDepth")
          int downstreamDepth,
      @Parameter(
              description =
                  "Elasticsearch query that will be combined with the query_string query generator from the `query` argument")
          @QueryParam("query_filter")
          String queryFilter,
      @Parameter(description = "Filter documents by deleted param. By default deleted is false")
          @QueryParam("includeDeleted")
          boolean deleted,
      @Parameter(description = "entity type") @QueryParam("type") String entityType)
      throws IOException {

    return Entity.getSearchRepository()
        .searchLineage(fqn, upstreamDepth, downstreamDepth, queryFilter, deleted, entityType);
  }

  @GET
  @Path("/export")
  @Produces(MediaType.TEXT_PLAIN)
  @Operation(
      operationId = "exportLineage",
      summary = "Export lineage",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "search response",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = SearchResponse.class)))
      })
  public String exportLineage(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "fqn") @QueryParam("fqn") String fqn,
      @Parameter(description = "upstreamDepth") @QueryParam("upstreamDepth") int upstreamDepth,
      @Parameter(description = "downstreamDepth") @QueryParam("downstreamDepth")
          int downstreamDepth,
      @Parameter(
              description =
                  "Elasticsearch query that will be combined with the query_string query generator from the `query` argument")
          @QueryParam("query_filter")
          String queryFilter,
      @Parameter(description = "Filter documents by deleted param. By default deleted is false")
          @QueryParam("includeDeleted")
          boolean deleted,
      @Parameter(description = "entity type") @QueryParam("type") String entityType)
      throws IOException {

    return dao.exportCsv(fqn, upstreamDepth, downstreamDepth, queryFilter, deleted, entityType);
  }

  @PUT
  @Operation(
      operationId = "addLineageEdge",
      summary = "Add a lineage edge",
      description =
          "Add a lineage edge with from entity as upstream node and to entity as downstream node.",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(responseCode = "404", description = "Entity for instance {id} is not found")
      })
  public Response addLineage(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Valid AddLineage addLineage) {
    authorizer.authorize(
        securityContext,
        new OperationContext(LINEAGE_FIELD, MetadataOperation.EDIT_LINEAGE),
        new LineageResourceContext());
    dao.addLineage(addLineage);
    return Response.status(Status.OK).build();
  }

  @GET
  @Path("/getLineageEdge/{fromId}/{toId}")
  @Operation(
      operationId = "getLineageEdge",
      summary = "Get  a lineage edge",
      description =
          "Get a lineage edge with from entity as upstream node and to entity as downstream node.",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(
            responseCode = "404",
            description = "Entity for instance {fromId} is not found")
      })
  public Response getLineageEdge(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Entity FQN", required = true, schema = @Schema(type = "string"))
          @PathParam("fromId")
          UUID fromId,
      @Parameter(description = "Entity FQN", required = true, schema = @Schema(type = "string"))
          @PathParam("toId")
          UUID toId) {
    return dao.getLineageEdge(fromId, toId);
  }

  @PATCH
  @Path("/{fromEntity}/{fromId}/{toEntity}/{toId}")
  @Operation(
      operationId = "patchLineageEdge",
      summary = "Patch a lineage edge",
      description =
          "Patch a lineage edge with from entity as upstream node and to entity as downstream node.",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(
            responseCode = "404",
            description = "Entity for instance {fromId} is not found")
      })
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  public Response patchLineageEdge(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Entity type of upstream entity of the edge",
              required = true,
              schema = @Schema(type = "string", example = "table, report, metrics, or dashboard"))
          @PathParam("fromEntity")
          String fromEntity,
      @Parameter(description = "Entity id", required = true, schema = @Schema(type = "string"))
          @PathParam("fromId")
          UUID fromId,
      @Parameter(
              description = "Entity type for downstream entity of the edge",
              required = true,
              schema = @Schema(type = "string", example = "table, report, metrics, or dashboard"))
          @PathParam("toEntity")
          String toEntity,
      @Parameter(description = "Entity id", required = true, schema = @Schema(type = "string"))
          @PathParam("toId")
          UUID toId,
      @RequestBody(
              description = "JsonPatch with array of operations",
              content =
                  @Content(
                      mediaType = MediaType.APPLICATION_JSON_PATCH_JSON,
                      examples = {
                        @ExampleObject("[{op:remove, path:/a},{op:add, path: /b, value: val}]")
                      }))
          JsonPatch patch) {
    authorizer.authorize(
        securityContext,
        new OperationContext(LINEAGE_FIELD, MetadataOperation.EDIT_LINEAGE),
        new LineageResourceContext());
    return dao.patchLineageEdge(fromEntity, fromId, toEntity, toId, patch);
  }

  @DELETE
  @Path("/{fromEntity}/{fromId}/{toEntity}/{toId}")
  @Operation(
      operationId = "deleteLineageEdge",
      summary = "Delete a lineage edge",
      description =
          "Delete a lineage edge with from entity as upstream node and to entity as downstream node.",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(
            responseCode = "404",
            description = "Entity for instance {fromId} is not found")
      })
  public Response deleteLineage(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Entity type of upstream entity of the edge",
              required = true,
              schema = @Schema(type = "string", example = "table, report, metrics, or dashboard"))
          @PathParam("fromEntity")
          String fromEntity,
      @Parameter(description = "Entity id", required = true, schema = @Schema(type = "string"))
          @PathParam("fromId")
          String fromId,
      @Parameter(
              description = "Entity type for downstream entity of the edge",
              required = true,
              schema = @Schema(type = "string", example = "table, report, metrics, or dashboard"))
          @PathParam("toEntity")
          String toEntity,
      @Parameter(description = "Entity id", required = true, schema = @Schema(type = "string"))
          @PathParam("toId")
          String toId) {
    authorizer.authorize(
        securityContext,
        new OperationContext(LINEAGE_FIELD, MetadataOperation.EDIT_LINEAGE),
        new LineageResourceContext());

    boolean deleted = dao.deleteLineage(fromEntity, fromId, toEntity, toId);
    if (!deleted) {
      return Response.status(NOT_FOUND)
          .entity(new ErrorMessage(NOT_FOUND.getStatusCode(), "Lineage edge not found"))
          .build();
    }
    return Response.status(Status.OK).build();
  }

  @DELETE
  @Path("/{fromEntity}/name/{fromFQN}/{toEntity}/name/{toFQN}")
  @Operation(
      operationId = "deleteLineageEdgeByName",
      summary = "Delete a lineage edge by FQNs",
      description =
          "Delete a lineage edge with from entity as upstream node and to entity as downstream node.",
      responses = {
        @ApiResponse(responseCode = "200"),
        @ApiResponse(
            responseCode = "404",
            description = "Entity for instance {fromFQN} is not found")
      })
  public Response deleteLineageByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Entity type of upstream entity of the edge",
              required = true,
              schema = @Schema(type = "string", example = "table, report, metrics, or dashboard"))
          @PathParam("fromEntity")
          String fromEntity,
      @Parameter(description = "Entity FQN", required = true, schema = @Schema(type = "string"))
          @PathParam("fromFQN")
          String fromFQN,
      @Parameter(
              description = "Entity type for downstream entity of the edge",
              required = true,
              schema = @Schema(type = "string", example = "table, report, metrics, or dashboard"))
          @PathParam("toEntity")
          String toEntity,
      @Parameter(description = "Entity FQN", required = true, schema = @Schema(type = "string"))
          @PathParam("toFQN")
          String toFQN) {
    authorizer.authorize(
        securityContext,
        new OperationContext(LINEAGE_FIELD, MetadataOperation.EDIT_LINEAGE),
        new LineageResourceContext());
    boolean deleted = dao.deleteLineageByFQN(fromEntity, fromFQN, toEntity, toFQN);
    if (!deleted) {
      return Response.status(NOT_FOUND)
          .entity(new ErrorMessage(NOT_FOUND.getStatusCode(), "Lineage edge not found"))
          .build();
    }
    return Response.status(Status.OK).build();
  }

  private EntityLineage addHref(UriInfo uriInfo, EntityLineage lineage) {
    Entity.withHref(uriInfo, lineage.getEntity());
    Entity.withHref(uriInfo, lineage.getNodes());
    return lineage;
  }

  static class LineageResourceContext implements ResourceContextInterface {

    @Override
    public String getResource() {
      return LINEAGE_FIELD;
    }

    @Override
    public EntityReference getOwner() {
      return null;
    }

    @Override
    public List<TagLabel> getTags() {
      return null;
    }

    @Override
    public EntityInterface getEntity() {
      return null;
    }
  }
}
