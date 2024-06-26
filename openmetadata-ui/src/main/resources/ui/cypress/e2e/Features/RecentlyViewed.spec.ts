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
import { interceptURL, verifyResponseStatusCode } from '../../common/common';
import {
  createEntityTable,
  createSingleLevelEntity,
  hardDeleteService,
} from '../../common/EntityUtils';
import { visitEntityDetailsPage } from '../../common/Utils/Entity';
import { getToken } from '../../common/Utils/LocalStorage';
import {
  DATABASE_SERVICE,
  SINGLE_LEVEL_SERVICE,
  STORED_PROCEDURE_DETAILS,
  VISIT_ENTITIES_DATA,
} from '../../constants/EntityConstant';
import { SERVICE_CATEGORIES } from '../../constants/service.constants';

// Update list if we support this for other entities too
const RECENTLY_VIEW_ENTITIES = [
  VISIT_ENTITIES_DATA.table,
  VISIT_ENTITIES_DATA.dashboard,
  VISIT_ENTITIES_DATA.topic,
  VISIT_ENTITIES_DATA.pipeline,
  VISIT_ENTITIES_DATA.mlmodel,
  // ES issue
  //   VISIT_ENTITIES_DATA.storedProcedure,
];

describe('Recently viwed data assets', { tags: 'DataAssets' }, () => {
  before(() => {
    cy.login();
    cy.getAllLocalStorage().then((data) => {
      const token = getToken(data);

      createEntityTable({
        token,
        ...DATABASE_SERVICE,
        tables: [DATABASE_SERVICE.entity],
      });
      SINGLE_LEVEL_SERVICE.forEach((data) => {
        createSingleLevelEntity({
          token,
          ...data,
          entity: [data.entity],
        });
      });

      // creating stored procedure
      cy.request({
        method: 'POST',
        url: `/api/v1/storedProcedures`,
        headers: { Authorization: `Bearer ${token}` },
        body: STORED_PROCEDURE_DETAILS,
      });
    });
  });

  after(() => {
    cy.login();
    cy.getAllLocalStorage().then((data) => {
      const token = getToken(data);

      hardDeleteService({
        token,
        serviceFqn: DATABASE_SERVICE.service.name,
        serviceType: SERVICE_CATEGORIES.DATABASE_SERVICES,
      });
      SINGLE_LEVEL_SERVICE.forEach((data) => {
        hardDeleteService({
          token,
          serviceFqn: data.service.name,
          serviceType: data.serviceType,
        });
      });
    });
  });

  beforeEach(() => {
    cy.login();
  });

  it('recently view section should be present', () => {
    cy.get('[data-testid="recently-viewed-widget"]')
      .scrollIntoView()
      .should('be.visible');

    cy.get(
      `[data-testid="recently-viewed-widget"] .right-panel-list-item`
    ).should('have.length', 0);
  });

  it(`recently view section should have at max list of 5 entity`, () => {
    RECENTLY_VIEW_ENTITIES.map((entity, index) => {
      visitEntityDetailsPage({
        term: entity.term,
        serviceName: entity.serviceName,
        entity: entity.entity,
      });
      cy.get('[data-testid="entity-header-display-name"]').should(
        'contain',
        entity.term
      );
      interceptURL(
        'GET',
        '/api/v1/feed?type=Announcement&activeAnnouncement=true',
        'getAnnouncements'
      );

      cy.clickOnLogo();
      verifyResponseStatusCode('@getAnnouncements', 200);

      // need to add manual wait as we are dependant on local storage for recently view data
      cy.wait(500);
      cy.get('[data-testid="recently-viewed-widget"]')
        .scrollIntoView()
        .should('be.visible');
      cy.get(
        `[data-testid="recently-viewed-widget"] [title="${entity.displayName}"]`,
        { timeout: 10000 }
      )
        .scrollIntoView()
        .should('be.visible');

      // Checking count since we will only show max 5 not more than that
      cy.get(
        `[data-testid="recently-viewed-widget"] .right-panel-list-item`
      ).should('have.length', index + 1);
    });
  });
});
