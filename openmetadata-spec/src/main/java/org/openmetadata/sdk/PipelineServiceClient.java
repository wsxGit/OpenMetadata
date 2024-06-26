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

package org.openmetadata.sdk;

import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.openmetadata.common.utils.CommonUtil;
import org.openmetadata.schema.ServiceEntityInterface;
import org.openmetadata.schema.api.configuration.pipelineServiceClient.PipelineServiceClientConfiguration;
import org.openmetadata.schema.entity.app.App;
import org.openmetadata.schema.entity.app.AppMarketPlaceDefinition;
import org.openmetadata.schema.entity.automations.Workflow;
import org.openmetadata.schema.entity.services.ingestionPipelines.IngestionPipeline;
import org.openmetadata.schema.entity.services.ingestionPipelines.PipelineServiceClientResponse;
import org.openmetadata.schema.entity.services.ingestionPipelines.PipelineStatus;
import org.openmetadata.schema.entity.services.ingestionPipelines.PipelineType;
import org.openmetadata.sdk.exception.PipelineServiceClientException;
import org.openmetadata.sdk.exception.PipelineServiceVersionException;

/**
 * Client to make API calls to add, deleted, and deploy pipelines on a PipelineService, such as
 * Airflow. Core abstractions are as follows:
 *
 * <ul>
 *   <li>A PipelineService is a service such as AirFlow to which a pipeline can be deployed
 *   <li>A Pipeline is a workflow for performing certain tasks. Example - ingestion pipeline is a
 *       workflow that connects to a database service or other services and collect metadata.
 *   <li>Pipeline uses `Connection` to a service as dependency. A Pipeline might need to connection
 *       to database service to collect metadata, OpenMetadata to user metadata over APIs, etc.
 * </ul>
 */
@Slf4j
public abstract class PipelineServiceClient {
  protected final boolean pipelineServiceClientEnabled;
  protected final String hostIp;

  protected final boolean ingestionIpInfoEnabled;

  @Getter @Setter private String platform;

  protected static final String AUTH_HEADER = "Authorization";
  protected static final String CONTENT_HEADER = "Content-Type";
  protected static final String CONTENT_TYPE = "application/json";
  private static final Integer MAX_ATTEMPTS = 3;
  private static final Integer BACKOFF_TIME_SECONDS = 5;
  private static final String DISABLED_STATUS = "disabled";
  public static final String HEALTHY_STATUS = "healthy";
  public static final String UNHEALTHY_STATUS = "unhealthy";
  public static final String STATUS_KEY = "status";
  public static final String APP_TRIGGER = "run_application";
  public static final String APP_VALIDATE = "validate_registration";

  public static final String DEPLOYMENT_ERROR = "DEPLOYMENT_ERROR";
  public static final String TRIGGER_ERROR = "TRIGGER_ERROR";
  public static final Map<String, String> TYPE_TO_TASK =
      Map.of(
          PipelineType.METADATA.toString(),
          "ingestion_task",
          PipelineType.PROFILER.toString(),
          "profiler_task",
          PipelineType.LINEAGE.toString(),
          "lineage_task",
          PipelineType.DBT.toString(),
          "dbt_task",
          PipelineType.USAGE.toString(),
          "usage_task",
          PipelineType.TEST_SUITE.toString(),
          "test_suite_task",
          PipelineType.DATA_INSIGHT.toString(),
          "data_insight_task",
          PipelineType.APPLICATION.toString(),
          "application_task");

  public static final String SERVER_VERSION;

  static {
    String rawServerVersion;
    try {
      rawServerVersion = getServerVersion();
    } catch (IOException e) {
      rawServerVersion = "unknown";
    }
    SERVER_VERSION = rawServerVersion;
  }

  public PipelineServiceClient(
      PipelineServiceClientConfiguration pipelineServiceClientConfiguration) {
    this.pipelineServiceClientEnabled = pipelineServiceClientConfiguration.getEnabled();
    this.hostIp = pipelineServiceClientConfiguration.getHostIp();
    this.ingestionIpInfoEnabled = pipelineServiceClientConfiguration.getIngestionIpInfoEnabled();
  }

  public final URL validateServiceURL(String serviceURL) {
    try {
      return new URL(serviceURL);
    } catch (MalformedURLException e) {
      throw new PipelineServiceClientException(serviceURL + " Malformed.");
    }
  }

  public final String getBasicAuthenticationHeader(String username, String password) {
    String valueToEncode = username + ":" + password;
    return "Basic " + Base64.getEncoder().encodeToString(valueToEncode.getBytes());
  }

  public static String getServerVersion() throws IOException {
    InputStream fileInput = PipelineServiceClient.class.getResourceAsStream("/catalog/VERSION");
    Properties props = new Properties();
    if (fileInput != null) {
      props.load(fileInput);
    }
    return props.getProperty("version", "unknown");
  }

  public final String getVersionFromString(String version) {
    if (version != null) {
      return Pattern.compile("(\\d+.\\d+.\\d+)")
          .matcher(version)
          .results()
          .map(m -> m.group(1))
          .findFirst()
          .orElseThrow(
              () ->
                  new PipelineServiceVersionException(
                      String.format("Cannot extract version x.y.z from %s", version)));
    } else {
      throw new PipelineServiceVersionException("Received version as null");
    }
  }

  public final Boolean validServerClientVersions(String clientVersion) {
    return getVersionFromString(clientVersion).equals(getVersionFromString(SERVER_VERSION));
  }

  public String buildVersionMismatchErrorMessage(String ingestionVersion, String serverVersion) {
    if (getVersionFromString(ingestionVersion).compareTo(getVersionFromString(serverVersion)) < 0) {
      return String.format(
          "Ingestion version [%s] is older than Server Version [%s]. Please upgrade your ingestion client.",
          ingestionVersion, serverVersion);
    }
    return String.format(
        "Server version [%s] is older than Ingestion Version [%s]. Please upgrade your server or downgrade the ingestion client.",
        serverVersion, ingestionVersion);
  }

  /** To build the response of getServiceStatus */
  public PipelineServiceClientResponse buildHealthyStatus(String ingestionVersion) {
    return new PipelineServiceClientResponse()
        .withCode(200)
        .withVersion(ingestionVersion)
        .withPlatform(this.getPlatform());
  }

  /** To build the response of getServiceStatus */
  public PipelineServiceClientResponse buildUnhealthyStatus(String reason) {
    return new PipelineServiceClientResponse()
        .withCode(500)
        .withReason(reason)
        .withPlatform(this.getPlatform());
  }

  public final Response getHostIp() {

    if (this.ingestionIpInfoEnabled) {
      return getHostIpInternal();
    }
    return Response.status(Response.Status.NO_CONTENT).build();
  }

  private Response getHostIpInternal() {
    Map<String, String> body;
    try {
      body = CommonUtil.nullOrEmpty(this.hostIp) ? requestGetHostIp() : Map.of("ip", this.hostIp);
      return Response.ok(body, MediaType.APPLICATION_JSON_TYPE).build();
    } catch (Exception e) {
      LOG.error("Failed to get Pipeline Service host IP. {}", e.getMessage());
      // We don't want the request to fail for an informative ping
      body =
          Map.of(
              "ip",
              "Failed to find the IP of Airflow Container. Please make sure https://api.ipify.org, "
                  + "https://api.my-ip.io/ip reachable from your network or that the `hostIp` setting is configured.");
      return Response.ok(body, MediaType.APPLICATION_JSON_TYPE).build();
    }
  }

  /**
   * Check the pipeline service status with an exception backoff to make sure we don't raise any
   * false positives.
   */
  public String getServiceStatusBackoff() {
    RetryConfig retryConfig =
        RetryConfig.<String>custom()
            .maxAttempts(MAX_ATTEMPTS)
            .waitDuration(Duration.ofMillis(BACKOFF_TIME_SECONDS * 1_000L))
            .retryOnResult(response -> !HEALTHY_STATUS.equals(response))
            .failAfterMaxAttempts(false)
            .build();

    Retry retry = Retry.of("getServiceStatus", retryConfig);

    Supplier<String> responseSupplier =
        () -> {
          try {
            PipelineServiceClientResponse status = getServiceStatus();
            return status.getCode() != 200 ? UNHEALTHY_STATUS : HEALTHY_STATUS;
          } catch (Exception e) {
            throw new RuntimeException(e);
          }
        };

    return retry.executeSupplier(responseSupplier);
  }

  /* Check the status of pipeline service to ensure it is healthy */
  public PipelineServiceClientResponse getServiceStatus() {
    if (pipelineServiceClientEnabled) {
      return getServiceStatusInternal();
    }
    return buildHealthyStatus(DISABLED_STATUS).withPlatform(DISABLED_STATUS);
  }

  public List<PipelineStatus> getQueuedPipelineStatus(IngestionPipeline ingestionPipeline) {
    if (pipelineServiceClientEnabled) {
      return getQueuedPipelineStatusInternal(ingestionPipeline);
    }
    return new ArrayList<>();
  }

  public abstract PipelineServiceClientResponse getServiceStatusInternal();

  /**
   * This workflow can be used to execute any necessary async automations from the pipeline service.
   * This will be the new Test Connection endpoint. The UI can create a new workflow and trigger it
   * in the server, and keep polling the results.
   */
  public abstract PipelineServiceClientResponse runAutomationsWorkflow(Workflow workflow);

  public abstract PipelineServiceClientResponse runApplicationFlow(App application);

  public abstract PipelineServiceClientResponse validateAppRegistration(
      AppMarketPlaceDefinition app);

  /* Deploy a pipeline to the pipeline service */
  public abstract PipelineServiceClientResponse deployPipeline(
      IngestionPipeline ingestionPipeline, ServiceEntityInterface service);

  /* Deploy run the pipeline at the pipeline service */
  public abstract PipelineServiceClientResponse runPipeline(
      IngestionPipeline ingestionPipeline, ServiceEntityInterface service);

  /* Stop and delete a pipeline at the pipeline service */
  public abstract PipelineServiceClientResponse deletePipeline(IngestionPipeline ingestionPipeline);

  /* Get the status of a deployed pipeline */
  public abstract List<PipelineStatus> getQueuedPipelineStatusInternal(
      IngestionPipeline ingestionPipeline);

  /* Toggle the state of an Ingestion Pipeline as enabled/disabled */
  public abstract PipelineServiceClientResponse toggleIngestion(
      IngestionPipeline ingestionPipeline);

  /* Get the all last run logs of a deployed pipeline */
  public abstract Map<String, String> getLastIngestionLogs(
      IngestionPipeline ingestionPipeline, String after);

  /* Get the all last run logs of a deployed pipeline */
  public abstract PipelineServiceClientResponse killIngestion(IngestionPipeline ingestionPipeline);

  /* Get the Pipeline Service host IP to whitelist in source systems. Should return a map in the shape "ip: 111.11.11.1" */
  public abstract Map<String, String> requestGetHostIp();
}
