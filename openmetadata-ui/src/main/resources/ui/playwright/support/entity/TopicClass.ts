/*
 *  Copyright 2024 Collate.
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
import { APIRequestContext, Page } from '@playwright/test';
import { uuid } from '../../utils/common';
import { visitEntityPage } from '../../utils/entity';
import { EntityTypeEndpoint } from './Entity.interface';
import { EntityClass } from './EntityClass';

export class TopicClass extends EntityClass {
  service = {
    name: `pw-messaging-service-${uuid()}`,
    serviceType: 'Kafka',
    connection: {
      config: {
        type: 'Kafka',
        bootstrapServers: 'Bootstrap Servers',
        saslUsername: 'admin',
        saslPassword: 'admin',
        saslMechanism: 'PLAIN',
        supportsMetadataExtraction: true,
      },
    },
  };
  private topicName = `pw-topic-${uuid()}`;
  private fqn = `${this.service.name}.${this.topicName}`;
  entity = {
    name: this.topicName,
    service: this.service.name,
    messageSchema: {
      schemaText: `{"type":"object","required":["name","age","club_name"],"properties":{"name":{"type":"object","required":["first_name","last_name"],
    "properties":{"first_name":{"type":"string"},"last_name":{"type":"string"}}},"age":{"type":"integer"},"club_name":{"type":"string"}}}`,
      schemaType: 'JSON',
      schemaFields: [
        {
          name: 'default',
          dataType: 'RECORD',
          fullyQualifiedName: `${this.fqn}.default`,
          tags: [],
          children: [
            {
              name: 'name',
              dataType: 'RECORD',
              fullyQualifiedName: `${this.fqn}.default.name`,
              tags: [],
              children: [
                {
                  name: 'first_name',
                  dataType: 'STRING',
                  description: 'Description for schema field first_name',
                  fullyQualifiedName: `${this.fqn}.default.name.first_name`,
                  tags: [],
                },
                {
                  name: 'last_name',
                  dataType: 'STRING',
                  fullyQualifiedName: `${this.fqn}.default.name.last_name`,
                  tags: [],
                },
              ],
            },
            {
              name: 'age',
              dataType: 'INT',
              fullyQualifiedName: `${this.fqn}.default.age`,
              tags: [],
            },
            {
              name: 'club_name',
              dataType: 'STRING',
              fullyQualifiedName: `${this.fqn}.default.club_name`,
              tags: [],
            },
          ],
        },
      ],
    },
    partitions: 128,
  };

  serviceResponseData: unknown;
  entityResponseData: unknown;

  constructor(name?: string) {
    super(EntityTypeEndpoint.Topic);
    this.service.name = name ?? this.service.name;
    this.type = 'Topic';
  }

  async create(apiContext: APIRequestContext) {
    const serviceResponse = await apiContext.post(
      '/api/v1/services/messagingServices',
      {
        data: this.service,
      }
    );
    const entityResponse = await apiContext.post('/api/v1/topics', {
      data: this.entity,
    });

    this.serviceResponseData = await serviceResponse.json();
    this.entityResponseData = await entityResponse.json();

    return {
      service: serviceResponse.body,
      entity: entityResponse.body,
    };
  }

  async get() {
    return {
      service: this.serviceResponseData,
      entity: this.entityResponseData,
    };
  }

  async visitEntityPage(page: Page) {
    await visitEntityPage({
      page,
      searchTerm: this.entityResponseData?.['fullyQualifiedName'],
      dataTestId: `${this.service.name}-${this.entity.name}`,
    });
  }

  async delete(apiContext: APIRequestContext) {
    const serviceResponse = await apiContext.delete(
      `/api/v1/services/messagingServices/name/${encodeURIComponent(
        this.serviceResponseData?.['fullyQualifiedName']
      )}?recursive=true&hardDelete=true`
    );

    return {
      service: serviceResponse.body,
      entity: this.entityResponseData,
    };
  }
}
