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
import { DATABASE_SERVICE } from '../../constants/EntityConstant';
import {
  createEntityTableViaREST,
  deleteEntityViaREST,
  visitEntityDetailsPage,
} from '../Utils/Entity';
import { getToken } from '../Utils/LocalStorage';
import EntityClass from './EntityClass';

class TableClass extends EntityClass {
  tableName: string;

  constructor() {
    const tableName = `cypress-table-${Date.now()}`;
    super(tableName, DATABASE_SERVICE.entity, EntityType.Table);

    this.tableName = tableName;
    this.name = 'Table';
  }

  visitEntity() {
    visitEntityDetailsPage({
      term: this.tableName,
      serviceName: DATABASE_SERVICE.service.name,
      entity: this.endPoint,
    });
  }

  // Creation

  createEntity() {
    // Handle creation here

    cy.getAllLocalStorage().then((data) => {
      const token = getToken(data);

      createEntityTableViaREST({
        token,
        ...DATABASE_SERVICE,
        tables: [{ ...DATABASE_SERVICE.entity, name: this.tableName }],
      });
    });
  }

  // Cleanup
  override cleanup() {
    super.cleanup();
    cy.getAllLocalStorage().then((data) => {
      const token = getToken(data);
      deleteEntityViaREST({
        token,
        endPoint: EntityType.DatabaseService,
        entityName: DATABASE_SERVICE.service.name,
      });
    });
  }
}

export default TableClass;
