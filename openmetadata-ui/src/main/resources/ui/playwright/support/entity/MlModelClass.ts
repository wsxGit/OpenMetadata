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

export class MlModelClass extends EntityClass {
  service = {
    name: `pw-ml-model-service-${uuid()}`,
    serviceType: 'Mlflow',
    connection: {
      config: {
        type: 'Mlflow',
        trackingUri: 'Tracking URI',
        registryUri: 'Registry URI',
        supportsMetadataExtraction: true,
      },
    },
  };
  entity = {
    name: `pw-mlmodel-${uuid()}`,
    displayName: `pw-mlmodel-${uuid()}`,
    service: this.service.name,
    algorithm: 'Time Series',
    mlFeatures: [
      {
        name: 'sales',
        dataType: 'numerical',
        description: 'Sales amount',
      },
    ],
  };

  serviceResponseData: unknown;
  entityResponseData: unknown;

  constructor(name?: string) {
    super(EntityTypeEndpoint.MlModel);
    this.service.name = name ?? this.service.name;
    this.type = 'MlModel';
  }

  async create(apiContext: APIRequestContext) {
    const serviceResponse = await apiContext.post(
      '/api/v1/services/mlmodelServices',
      {
        data: this.service,
      }
    );
    const entityResponse = await apiContext.post('/api/v1/mlmodels', {
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
      `/api/v1/services/mlmodelServices/name/${encodeURIComponent(
        this.serviceResponseData?.['fullyQualifiedName']
      )}?recursive=true&hardDelete=true`
    );

    return {
      service: serviceResponse.body,
      entity: this.entityResponseData,
    };
  }
}
