/*
 *  Copyright 2022 Collate.
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

import {
  addNewTagToEntity,
  descriptionBox,
  interceptURL,
  verifyResponseStatusCode,
} from '../../common/common';
import {
  deleteClassification,
  submitForm,
  validateForm,
  visitClassificationPage,
} from '../../common/TagUtils';
import { visitEntityDetailsPage } from '../../common/Utils/Entity';
import { assignTags, removeTags } from '../../common/Utils/Tags';
import {
  DELETE_TERM,
  NEW_CLASSIFICATION,
  NEW_TAG,
  SEARCH_ENTITY_TABLE,
} from '../../constants/constants';
import { EntityType } from '../../constants/Entity.interface';

const permanentDeleteModal = (entity) => {
  cy.get('[data-testid="delete-confirmation-modal"]')
    .should('exist')
    .then(() => {
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('[data-testid="modal-header"]').should('be.visible');
    });
  cy.get('[data-testid="modal-header"]')
    .should('be.visible')
    .should('contain', `Delete ${entity}`);
  cy.get('[data-testid="confirmation-text-input"]')
    .should('be.visible')
    .type(DELETE_TERM);

  cy.get('[data-testid="confirm-button"]')
    .should('be.visible')
    .should('not.disabled')
    .click();
};

describe('Classification Page', { tags: 'Governance' }, () => {
  beforeEach(() => {
    cy.login();
    interceptURL(
      'GET',
      `/api/v1/tags?fields=usageCount&parent=${NEW_CLASSIFICATION.name}&limit=10`,
      'getTagList'
    );
    interceptURL('GET', `/api/v1/permissions/classification/*`, 'permissions');
    interceptURL(
      'GET',
      `/api/v1/search/query?q=*%20AND%20disabled:false&index=tag_search_index*`,
      'suggestTag'
    );
    visitClassificationPage();
  });

  it('Should render basic elements on page', () => {
    cy.get('[data-testid="add-classification"]').should('be.visible');
    cy.get('[data-testid="add-new-tag-button"]').should('be.visible');
    cy.get('[data-testid="manage-button"]').should('be.visible');
    cy.get('[data-testid="description-container"]').should('be.visible');
    cy.get('[data-testid="table"]').should('be.visible');

    cy.get('.ant-table-thead > tr > .ant-table-cell')
      .eq(0)
      .contains('Tag')
      .should('be.visible');
    cy.get('.ant-table-thead > tr > .ant-table-cell')
      .eq(1)
      .contains('Display Name')
      .should('be.visible');
    cy.get('.ant-table-thead > tr > .ant-table-cell')
      .eq(2)
      .contains('Description')
      .should('be.visible');
    cy.get('.ant-table-thead > tr > .ant-table-cell')
      .eq(3)
      .contains('Actions')
      .should('be.visible');

    cy.get('.activeCategory > .tag-category')
      .should('be.visible')
      .invoke('text')
      .then((text) => {
        cy.get('.activeCategory > .tag-category')
          .should('be.visible')
          .invoke('text')
          .then((heading) => {
            expect(text).to.equal(heading);
          });
      });
  });

  it('Create classification with validation checks', () => {
    interceptURL('POST', 'api/v1/classifications', 'createTagCategory');
    cy.get('[data-testid="add-classification"]').should('be.visible').click();
    cy.get('[data-testid="modal-container"]')
      .should('exist')
      .then(() => {
        cy.get('[role="dialog"]').should('be.visible');
      });

    // validation should work
    validateForm();

    cy.get('[data-testid="name"]')
      .should('be.visible')
      .clear()
      .type(NEW_CLASSIFICATION.name);
    cy.get('[data-testid="displayName"]')
      .should('be.visible')
      .type(NEW_CLASSIFICATION.displayName);
    cy.get(descriptionBox)
      .should('be.visible')
      .type(NEW_CLASSIFICATION.description);
    cy.get('[data-testid="mutually-exclusive-button"]')
      .scrollIntoView()
      .should('be.visible')
      .click();

    submitForm();

    verifyResponseStatusCode('@createTagCategory', 201);
    cy.get('[data-testid="modal-container"]').should('not.exist');
    cy.get('[data-testid="data-summary-container"]')
      .should('be.visible')
      .and('contain', NEW_CLASSIFICATION.displayName);
  });

  it('Create tag with validation checks', () => {
    cy.get('[data-testid="data-summary-container"]')
      .contains(NEW_CLASSIFICATION.displayName)
      .should('be.visible')
      .as('newCategory');

    cy.get('@newCategory')
      .click()
      .parent()
      .should('have.class', 'activeCategory');
    cy.get('[data-testid="add-new-tag-button"]').should('be.visible').click();
    cy.get('[data-testid="modal-container"]')
      .should('exist')
      .then(() => {
        cy.get('[role="dialog"]').should('be.visible');
      });

    // validation should work
    validateForm();

    cy.get('[data-testid="name"]')
      .should('be.visible')
      .clear()
      .type(NEW_TAG.name);
    cy.get('[data-testid="displayName"]')
      .should('be.visible')
      .type(NEW_TAG.displayName);
    cy.get(descriptionBox).should('be.visible').type(NEW_TAG.description);

    cy.get('[data-testid="icon-url"]').scrollIntoView().type(NEW_TAG.icon);
    cy.get('[data-testid="tags_color-color-input"]')
      .scrollIntoView()
      .type(NEW_TAG.color);

    interceptURL('POST', '/api/v1/tags', 'createTag');
    submitForm();

    verifyResponseStatusCode('@createTag', 201);

    cy.get('[data-testid="table"]').should('contain', NEW_TAG.name);
  });

  it(`Assign tag to table ${SEARCH_ENTITY_TABLE.table_3.displayName}`, () => {
    const entity = SEARCH_ENTITY_TABLE.table_3;
    visitEntityDetailsPage({
      term: entity.term,
      serviceName: entity.serviceName,
      entity: entity.entity,
    });
    addNewTagToEntity(NEW_TAG);
  });

  it('Assign tag to DatabaseSchema', () => {
    interceptURL(
      'GET',
      '/api/v1/permissions/databaseSchema/name/*',
      'permissions'
    );
    interceptURL('PUT', '/api/v1/feed/tasks/*/resolve', 'taskResolve');
    interceptURL(
      'GET',
      '/api/v1/databaseSchemas/name/*',
      'databaseSchemasPage'
    );
    interceptURL('PATCH', '/api/v1/databaseSchemas/*', 'addTags');

    const entity = SEARCH_ENTITY_TABLE.table_3;
    const tag = 'PII.Sensitive';

    visitEntityDetailsPage({
      term: entity.term,
      serviceName: entity.serviceName,
      entity: entity.entity,
    });

    cy.get('[data-testid="breadcrumb-link"]')
      .should('be.visible')
      .contains(entity.schemaName)
      .click();

    verifyResponseStatusCode('@databaseSchemasPage', 200);
    verifyResponseStatusCode('@permissions', 200);

    assignTags(tag, EntityType.DatabaseSchema);

    removeTags(tag, EntityType.DatabaseSchema);
  });

  it('Assign tag using Task & Suggestion flow to DatabaseSchema', () => {
    interceptURL(
      'GET',
      '/api/v1/permissions/databaseSchema/name/*',
      'permissions'
    );
    interceptURL('PUT', '/api/v1/feed/tasks/*/resolve', 'taskResolve');
    interceptURL(
      'GET',
      '/api/v1/databaseSchemas/name/*',
      'databaseSchemasPage'
    );

    const entity = SEARCH_ENTITY_TABLE.table_2;
    const tag = 'Personal';
    const assignee = 'admin';

    visitEntityDetailsPage({
      term: entity.term,
      serviceName: entity.serviceName,
      entity: entity.entity,
    });

    cy.get('[data-testid="breadcrumb-link"]')
      .should('be.visible')
      .contains(entity.schemaName)
      .click();

    verifyResponseStatusCode('@databaseSchemasPage', 200);
    verifyResponseStatusCode('@permissions', 200);

    // Create task to add tags
    interceptURL('POST', '/api/v1/feed', 'taskCreated');
    cy.get('[data-testid="request-entity-tags"]').should('exist').click();

    // set assignees for task
    cy.get(
      '[data-testid="select-assignee"] > .ant-select-selector > .ant-select-selection-overflow'
    )
      .click()
      .type(assignee);
    cy.get(`[data-testid="${assignee}"]`).scrollIntoView().click();

    // click outside the select box
    cy.clickOutside();

    cy.get('[data-testid="tag-selector"]').click().type(tag);

    verifyResponseStatusCode('@suggestTag', 200);
    cy.get('[data-testid="tag-PersonalData.Personal"]').click();

    cy.get('[data-testid="tags-label"]').click();

    cy.get('[data-testid="submit-tag-request"]').click();
    verifyResponseStatusCode('@taskCreated', 201);

    // Accept the tag suggestion which is created
    cy.get('.ant-btn-compact-first-item').contains('Accept Suggestion').click();

    verifyResponseStatusCode('@taskResolve', 200);
    verifyResponseStatusCode('@databaseSchemasPage', 200);
    cy.get('[data-testid="table"]').click();

    cy.reload();
    verifyResponseStatusCode('@databaseSchemasPage', 200);

    cy.get('[data-testid="tags-container"]').scrollIntoView().contains(tag);

    cy.get('[data-testid="edit-button"]').click();

    // Remove all added tags
    cy.get('[data-testid="remove-tags"]').click({ multiple: true });

    interceptURL('PATCH', '/api/v1/databaseSchemas/*', 'removeTags');
    cy.get('[data-testid="saveAssociatedTag"]').scrollIntoView().click();
    verifyResponseStatusCode('@removeTags', 200);
  });

  it('Should have correct tag usage count and redirection should work', () => {
    cy.get('[data-testid="data-summary-container"]')
      .contains(NEW_CLASSIFICATION.displayName)
      .should('be.visible')
      .as('newCategory');

    cy.get('@newCategory')
      .click()
      .parent()
      .should('have.class', 'activeCategory');

    verifyResponseStatusCode('@permissions', 200);
    cy.get('[data-testid="entity-header-display-name"]')
      .invoke('text')
      .then((text) => {
        // Get the text of the first menu item
        if (text !== NEW_CLASSIFICATION.displayName) {
          verifyResponseStatusCode('@getTags', 200);
        }
      });

    cy.get('[data-testid="usage-count"]').should('be.visible').as('count');
    cy.get('@count')
      .invoke('text')
      .then((text) => {
        expect(text).to.equal('1');
      });

    interceptURL(
      'GET',
      'api/v1/search/query?q=&index=**',
      'getEntityDetailsPage'
    );
    cy.get('@count').click();
    verifyResponseStatusCode('@getEntityDetailsPage', 200);
  });

  it('Remove tag', () => {
    interceptURL(
      'DELETE',
      '/api/v1/tags/*?recursive=true&hardDelete=true',
      'deleteTag'
    );
    cy.get('[data-testid="data-summary-container"]')
      .contains(NEW_CLASSIFICATION.displayName)
      .click()
      .parent()
      .should('have.class', 'activeCategory');

    verifyResponseStatusCode('@permissions', 200);

    cy.get('[data-testid="table"]').should('contain', NEW_TAG.name);

    cy.get('[data-testid="table"]').find('[data-testid="delete-tag"]').click();
    cy.wait(500); // adding manual wait to open modal, as it depends on click not an api.
    permanentDeleteModal(NEW_TAG.name);

    verifyResponseStatusCode('@deleteTag', 200);
    cy.wait(500);
    cy.get('[data-testid="table"]')
      .contains(NEW_TAG.name)
      .should('not.be.exist');
  });

  it('Remove classification', () => {
    deleteClassification(NEW_CLASSIFICATION);
  });
});
