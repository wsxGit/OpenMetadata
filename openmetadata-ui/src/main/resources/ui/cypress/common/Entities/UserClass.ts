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
  descriptionBox,
  interceptURL,
  verifyResponseStatusCode,
} from '../../common/common';
import { SidebarItem } from '../../constants/Entity.interface';
import { VISIT_SERVICE_PAGE_DETAILS } from '../../constants/service.constants';
import { GlobalSettingOptions } from '../../constants/settings.constant';
import {
  checkNoPermissionPlaceholder,
  permanentDeleteUser,
  restoreUser,
  softDeleteUser,
} from '../Utils/Users';

class UsersTestClass {
  protected name: string;

  public getName() {
    return this.name;
  }

  visitUserListPage() {
    interceptURL('GET', '/api/v1/users?*', 'getUsers');
    cy.settingClick(GlobalSettingOptions.USERS);
  }

  softDeleteUser(name: string, displayName: string) {
    interceptURL('GET', '/api/v1/users?*', 'getUsers');
    verifyResponseStatusCode('@getUsers', 200);
    softDeleteUser(name, displayName);
  }

  restoreSoftDeletedUser(name, editedName) {
    restoreUser(name, editedName);
  }

  permanentDeleteUser(name: string, displayName: string) {
    permanentDeleteUser(name, displayName);
    cy.logout();
  }

  checkConsumerPermissions() {
    // check Add domain permission
    cy.get('[data-testid="add-domain"]').should('not.be.exist');
    cy.get('[data-testid="edit-displayName-button"]').should('not.be.exist');
    // check edit owner permission
    cy.get('[data-testid="edit-owner"]').should('not.be.exist');
    // check edit description permission
    cy.get('[data-testid="edit-description"]').should('be.exist');
    // check edit tier permission
    cy.get('[data-testid="edit-tier"]').should('be.exist');
    // check add tags button
    cy.get(
      ':nth-child(2) > [data-testid="tags-container"] > [data-testid="entity-tags"] > .m-t-xss > .ant-tag'
    ).should('be.exist');
    // check add glossary term button
    cy.get(
      ':nth-child(3) > [data-testid="glossary-container"] > [data-testid="entity-tags"] > .m-t-xss > .ant-tag'
    ).should('be.exist');
    if (Cypress.env('isOss')) {
      cy.get('[data-testid="manage-button"]').should('not.be.exist');
    } else {
      cy.get('[data-testid="manage-button"]').should('be.visible');
      cy.get('[data-testid="manage-button"]').click();
      cy.get('[data-testid="export-button"]').should('be.visible');
      cy.get('[data-testid="import-button"]').should('not.be.exist');
      cy.get('[data-testid="announcement-button"]').should('not.be.exist');
      cy.get('[data-testid="delete-button"]').should('not.be.exist');
    }
    cy.get('[data-testid="lineage"] > .ant-space-item').click();
    cy.get('[data-testid="edit-lineage"]').should('be.disabled');
  }

  viewPermissions(permission?: {
    viewSampleData?: boolean;
    viewQueries?: boolean;
    viewTests?: boolean;
    editDisplayName?: boolean;
  }) {
    // check Add domain permission
    cy.get('[data-testid="add-domain"]').should('not.be.exist');
    cy.get('[data-testid="edit-displayName-button"]').should(
      permission?.editDisplayName ? 'be.exist' : 'not.be.exist'
    );
    // check edit owner permission
    cy.get('[data-testid="edit-owner"]').should('not.be.exist');
    // check edit description permission
    cy.get('[data-testid="edit-description"]').should('not.be.exist');
    // check edit tier permission
    cy.get('[data-testid="edit-tier"]').should('not.be.exist');
    // check add tags button
    cy.get(
      ':nth-child(2) > [data-testid="tags-container"] > [data-testid="entity-tags"] > .m-t-xss > .ant-tag'
    ).should('not.be.exist');
    // check add glossary term button
    cy.get(
      ':nth-child(3) > [data-testid="glossary-container"] > [data-testid="entity-tags"] > .m-t-xss > .ant-tag'
    ).should('not.be.exist');
    // check edit tier permission

    cy.get('[data-testid="manage-button"]').should(
      permission?.editDisplayName ? 'be.visible' : 'not.be.exist'
    );
    if (permission?.editDisplayName) {
      interceptURL('PATCH', '/api/v1/tables/*', 'updateName');
      cy.get('[data-testid="manage-button"]').click();
      cy.get('[data-testid="rename-button"]').click();
      cy.get('#displayName').clear().type('updated-table-name');
      cy.get('[data-testid="save-button"]').click();
      verifyResponseStatusCode('@updateName', 200);
      cy.get('[data-testid="entity-header-display-name').should(
        'contain',
        'updated-table-name'
      );
    }
    cy.get('[data-testid="sample_data"]').click();
    checkNoPermissionPlaceholder(permission?.viewSampleData);
    cy.get('[data-testid="table_queries"]').click();
    checkNoPermissionPlaceholder(permission?.viewQueries);
    cy.get('[data-testid="profiler"]').click();
    checkNoPermissionPlaceholder(permission?.viewTests);
    cy.get('[data-testid="lineage"]').click();
    cy.get('[data-testid="edit-lineage"]').should('be.disabled');
    cy.get('[data-testid="custom_properties"]').click();
    checkNoPermissionPlaceholder();
  }

  checkStewardServicesPermissions() {
    cy.sidebarClick(SidebarItem.EXPLORE);
    Object.values(VISIT_SERVICE_PAGE_DETAILS).forEach((service) => {
      cy.settingClick(service.settingsMenuId);
      cy.get('[data-testid="add-service-button"] > span').should('not.exist');
    });
    cy.sidebarClick(SidebarItem.EXPLORE);
    cy.get('[data-testid="tables-tab"]').click();
    cy.get(
      '.ant-drawer-title > [data-testid="entity-link"] > .ant-typography'
    ).click();
    cy.get('[data-testid="edit-tier"]').should('be.visible');
  }

  checkStewardPermissions() {
    // check Add domain permission
    cy.get('[data-testid="add-domain"]').should('not.be.exist');
    cy.get('[data-testid="edit-displayName-button"]').should('be.exist');
    // check edit owner permission
    cy.get('[data-testid="edit-owner"]').should('be.exist');
    // check edit description permission
    cy.get('[data-testid="edit-description"]').should('be.exist');
    // check edit tier permission
    cy.get('[data-testid="edit-tier"]').should('be.exist');
    // check add tags button
    cy.get(
      ':nth-child(2) > [data-testid="tags-container"] > [data-testid="entity-tags"] > .m-t-xss > .ant-tag'
    ).should('be.exist');
    // check add glossary term button
    cy.get(
      ':nth-child(3) > [data-testid="glossary-container"] > [data-testid="entity-tags"] > .m-t-xss > .ant-tag'
    ).should('be.exist');
    // check edit tier permission
    cy.get('[data-testid="manage-button"]').should('be.exist');
    cy.get('[data-testid="lineage"] > .ant-space-item').click();
    cy.get('[data-testid="edit-lineage"]').should('be.enabled');
  }

  restoreAdminDetails() {
    cy.get('[data-testid="dropdown-profile"]').click({ force: true });
    cy.get('[data-testid="user-name"] > .ant-typography').click({
      force: true,
    });
    cy.get('[data-testid="edit-displayName"]').should('be.visible');
    cy.get('[data-testid="edit-displayName"]').click();
    cy.get('[data-testid="displayName"]').clear();
    interceptURL('PATCH', '/api/v1/users/*', 'updateName');
    cy.get('[data-testid="inline-save-btn"]').click();
    cy.get('[data-testid="edit-displayName"]').scrollIntoView();
    verifyResponseStatusCode('@updateName', 200);

    cy.get('.ant-collapse-expand-icon > .anticon > svg').click();
    cy.get('[data-testid="edit-teams-button"]').click();
    interceptURL('PATCH', '/api/v1/users/*', 'updateTeam');
    cy.get('.ant-select-selection-item-remove > .anticon').click();
    cy.get('[data-testid="inline-save-btn"]').click();
    verifyResponseStatusCode('@updateTeam', 200);

    cy.get('.ant-collapse-expand-icon > .anticon > svg').click();
    cy.get('[data-testid="edit-description"]').click();
    cy.get(descriptionBox).clear();
    interceptURL('PATCH', '/api/v1/users/*', 'patchDescription');
    cy.get('[data-testid="save"]').should('be.visible').click();
    verifyResponseStatusCode('@patchDescription', 200);
    cy.get('.ant-collapse-expand-icon > .anticon > svg').scrollIntoView();
    cy.get('.ant-collapse-expand-icon > .anticon > svg').click();
  }
}

export default UsersTestClass;
