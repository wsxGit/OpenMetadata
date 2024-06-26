/*
 *  Copyright 2023 Collate.
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
import { EntityType } from '../../constants/Entity.interface';
import { STORAGE_SERVICE } from '../../constants/EntityConstant';
import { createSingleLevelEntity } from '../EntityUtils';
import { visitEntityDetailsPage } from '../Utils/Entity';
import { getToken } from '../Utils/LocalStorage';
import EntityClass from './EntityClass';

class ContainerClass extends EntityClass {
  containerName: string;

  constructor() {
    const containerName = `cypress-container-${Date.now()}`;
    super(containerName, STORAGE_SERVICE.entity, EntityType.Container);

    this.containerName = containerName;
    this.name = 'Container';
  }

  visitEntity() {
    visitEntityDetailsPage({
      term: this.containerName,
      serviceName: STORAGE_SERVICE.service.name,
      entity: this.endPoint,
    });
  }

  followUnfollowEntity() {
    // Skiping this since not working from backend
  }

  // Creation

  createEntity() {
    // Handle creation here

    cy.getAllLocalStorage().then((data) => {
      const token = getToken(data);

      createSingleLevelEntity({
        token,
        ...STORAGE_SERVICE,
        entity: [{ ...STORAGE_SERVICE.entity, name: this.containerName }],
      });
    });
  }
}

export default ContainerClass;
