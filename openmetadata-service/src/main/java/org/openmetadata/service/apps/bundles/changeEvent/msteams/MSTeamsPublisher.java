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

package org.openmetadata.service.apps.bundles.changeEvent.msteams;

import static org.openmetadata.schema.entity.events.SubscriptionDestination.SubscriptionType.MS_TEAMS;
import static org.openmetadata.service.util.SubscriptionUtil.appendHeadersToTarget;
import static org.openmetadata.service.util.SubscriptionUtil.getClient;
import static org.openmetadata.service.util.SubscriptionUtil.getTargetsForWebhookAlert;
import static org.openmetadata.service.util.SubscriptionUtil.postWebhookMessage;

import java.util.List;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.Invocation;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.tuple.Pair;
import org.openmetadata.common.utils.CommonUtil;
import org.openmetadata.schema.entity.events.SubscriptionDestination;
import org.openmetadata.schema.type.ChangeEvent;
import org.openmetadata.schema.type.Webhook;
import org.openmetadata.service.apps.bundles.changeEvent.Destination;
import org.openmetadata.service.events.errors.EventPublisherException;
import org.openmetadata.service.exception.CatalogExceptionMessage;
import org.openmetadata.service.formatter.decorators.MSTeamsMessageDecorator;
import org.openmetadata.service.formatter.decorators.MessageDecorator;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.RestUtil;

@Slf4j
public class MSTeamsPublisher implements Destination<ChangeEvent> {
  private final MessageDecorator<TeamsMessage> teamsMessageFormatter =
      new MSTeamsMessageDecorator();
  private final Webhook webhook;
  private Invocation.Builder target;
  private final Client client;

  @Getter private final SubscriptionDestination subscriptionDestination;

  public MSTeamsPublisher(SubscriptionDestination subscription) {
    if (subscription.getType() == MS_TEAMS) {
      this.subscriptionDestination = subscription;
      this.webhook = JsonUtils.convertValue(subscription.getConfig(), Webhook.class);

      // Build Client
      client = getClient(subscription.getTimeout(), subscription.getReadTimeout());

      // Build Target
      if (webhook != null && webhook.getEndpoint() != null) {
        String msTeamsWebhookURL = webhook.getEndpoint().toString();
        if (!CommonUtil.nullOrEmpty(msTeamsWebhookURL)) {
          target = appendHeadersToTarget(client, msTeamsWebhookURL);
        }
      }
    } else {
      throw new IllegalArgumentException("MsTeams Alert Invoked with Illegal Type and Settings.");
    }
  }

  @Override
  public void sendMessage(ChangeEvent event) throws EventPublisherException {
    try {
      TeamsMessage teamsMessage = teamsMessageFormatter.buildOutgoingMessage(event);
      List<Invocation.Builder> targets =
          getTargetsForWebhookAlert(
              webhook, subscriptionDestination.getCategory(), MS_TEAMS, client, event);
      if (target != null) {
        targets.add(target);
      }
      for (Invocation.Builder actionTarget : targets) {
        if (webhook.getSecretKey() != null && !webhook.getSecretKey().isEmpty()) {
          String hmac =
              "sha256="
                  + CommonUtil.calculateHMAC(
                      webhook.getSecretKey(), JsonUtils.pojoToJson(teamsMessage));
          postWebhookMessage(
              this, actionTarget.header(RestUtil.SIGNATURE_HEADER, hmac), teamsMessage);
        } else {
          postWebhookMessage(this, actionTarget, teamsMessage);
        }
      }
    } catch (Exception e) {
      String message =
          CatalogExceptionMessage.eventPublisherFailedToPublish(MS_TEAMS, event, e.getMessage());
      LOG.error(message);
      throw new EventPublisherException(message, Pair.of(subscriptionDestination.getId(), event));
    }
  }

  @Override
  public boolean getEnabled() {
    return subscriptionDestination.getEnabled();
  }

  public void close() {
    if (null != client) {
      client.close();
    }
  }
}
