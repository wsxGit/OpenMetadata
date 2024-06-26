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
import { interceptURL, uuid, verifyResponseStatusCode } from '../common';
import { getToken } from './LocalStorage';

const userURL =
  '/api/v1/search/query?q=**%20AND%20isBot:false&from=0&size=0&index=user_search_index';
const teamURL =
  '/api/v1/search/query?q=*%20AND%20teamType:Group&from=0&size=10&index=team_search_index&sort_field=displayName.keyword&sort_order=asc';

export const generateRandomUser = () => {
  return {
    firstName: `firstName-${uuid()}`,
    lastName: `lastName-${uuid()}`,
    email: `user${uuid()}@example.com`,
    password: 'User@OMD123',
  };
};

export const validateOwnerAndTeamCounts = () => {
  cy.getAllLocalStorage().then((data) => {
    const token = getToken(data);

    cy.request({
      method: 'GET',
      url: userURL,
      headers: { Authorization: `Bearer ${token}` },
    }).as('UserCount');
    cy.request({
      method: 'GET',
      url: teamURL,
      headers: { Authorization: `Bearer ${token}` },
    }).as('TeamCount');
  });

  cy.get('[data-testid="edit-owner"]').click();

  // check for teams count
  cy.get('@TeamCount').then((response) => {
    const teamCount = response.body.hits.total.value;
    cy.get('.user-team-select-popover [data-testid="filter-count"]')
      .eq(0)
      .contains(`${teamCount}`);
  });

  // check for user count
  cy.get('@UserCount').then((response) => {
    const userCount = response.body.hits.total.value;
    cy.get('.user-team-select-popover [data-testid="filter-count"]')
      .eq(1)
      .contains(`${userCount}`);
  });

  cy.clickOutside();
};

export const addOwner = (
  ownerName: string,
  dataTestId?: string,
  verifyPatchResponse = true
) => {
  interceptURL('GET', '/api/v1/users?*isBot=false*', 'getUsers');
  cy.get('[data-testid="edit-owner"]')
    .scrollIntoView()
    .click({ waitForAnimations: false });

  cy.get("[data-testid='select-owner-tabs']").should('be.visible');
  cy.get('.ant-tabs [id*=tab-users]')
    .scrollIntoView()
    .click({ waitForAnimations: false });

  verifyResponseStatusCode('@getUsers', 200);
  interceptURL(
    'GET',
    `api/v1/search/query?q=*&index=user_search_index*`,
    'searchOwner'
  );

  cy.get('[data-testid="owner-select-users-search-bar"]').type(ownerName);

  verifyResponseStatusCode('@searchOwner', 200);

  interceptURL('PATCH', `/api/v1/**`, 'patchOwner');

  cy.get(`.ant-popover [title="${ownerName}"]`).click();

  if (verifyPatchResponse) {
    verifyResponseStatusCode('@patchOwner', 200);
  }

  cy.get(`[data-testid=${dataTestId ?? 'owner-link'}]`).should(
    'contain',
    ownerName
  );
};

export const updateOwner = (ownerName: string, dataTestId?: string) => {
  cy.get('[data-testid="edit-owner"]').click();
  cy.get("[data-testid='select-owner-tabs']").should('be.visible');
  cy.log('/api/v1/users?limit=*&isBot=false*');
  cy.get('.ant-tabs [id*=tab-users]').click();

  interceptURL(
    'GET',
    `api/v1/search/query?q=*${encodeURI(ownerName)}*&index=user_search_index`,
    'searchOwner'
  );

  cy.get('[data-testid="owner-select-users-search-bar"]')
    .clear()
    .type(ownerName);

  verifyResponseStatusCode('@searchOwner', 200);

  interceptURL('PATCH', `/api/v1/**`, 'patchOwner');

  cy.get(`.ant-popover [title="${ownerName}"]`).click();
  verifyResponseStatusCode('@patchOwner', 200);

  cy.get(`[data-testid=${dataTestId ?? 'owner-link'}]`).should(
    'contain',
    ownerName
  );
};

export const removeOwner = (ownerName: string, dataTestId?: string) => {
  cy.get('[data-testid="edit-owner"]').scrollIntoView().click();

  cy.get("[data-testid='select-owner-tabs']").should('be.visible');

  interceptURL('PATCH', `/api/v1/**`, 'patchOwner');

  cy.get(
    '[data-testid="select-owner-tabs"] [data-testid="remove-owner"]'
  ).should('be.visible');

  cy.get(
    '[data-testid="select-owner-tabs"] [data-testid="remove-owner"]'
  ).click();
  verifyResponseStatusCode('@patchOwner', 200);

  cy.get(`[data-testid=${dataTestId ?? 'owner-link'}]`).should(
    'not.contain',
    ownerName
  );
};

export const addTeamAsOwner = (teamName: string, dataTestId?: string) => {
  interceptURL(
    'GET',
    '/api/v1/search/query?q=*&from=0&size=*&index=team_search_index&sort_field=displayName.keyword&sort_order=asc',
    'getTeams'
  );

  cy.get('[data-testid="edit-owner"]').click();

  cy.get("[data-testid='select-owner-tabs']").should('be.visible');

  verifyResponseStatusCode('@getTeams', 200);

  interceptURL(
    'GET',
    `api/v1/search/query?q=*${encodeURI(teamName)}*`,
    'searchTeams'
  );

  cy.get('[data-testid="owner-select-teams-search-bar"]').type(teamName);

  verifyResponseStatusCode('@searchTeams', 200);

  interceptURL('PATCH', `/api/v1/**`, 'patchOwner');

  cy.get(`.ant-popover [title="${teamName}"]`).click();
  verifyResponseStatusCode('@patchOwner', 200);

  cy.get(`[data-testid=${dataTestId ?? 'owner-link'}]`).should(
    'contain',
    teamName
  );
};

export const updateTeamAsOwner = (teamName: string, dataTestId?: string) => {
  cy.get('[data-testid="edit-owner"]').click();

  cy.get("[data-testid='select-owner-tabs']").should('be.visible');

  interceptURL(
    'GET',
    `api/v1/search/query?q=*${encodeURI(teamName)}*`,
    'searchTeams'
  );

  cy.get('[data-testid="owner-select-teams-search-bar"]')
    .clear()
    .type(teamName);

  verifyResponseStatusCode('@searchTeams', 200);

  interceptURL('PATCH', `/api/v1/**`, 'patchOwner');

  cy.get(`.ant-popover [title="${teamName}"]`).click();
  verifyResponseStatusCode('@patchOwner', 200);

  cy.get(`[data-testid=${dataTestId ?? 'owner-link'}]`).should(
    'contain',
    teamName
  );
};

export const removeTeamAsOwner = (teamName: string, dataTestId?: string) => {
  cy.get('[data-testid="edit-owner"]').click();

  cy.get("[data-testid='select-owner-tabs']").should('be.visible');

  interceptURL('PATCH', `/api/v1/**`, 'patchOwner');

  cy.get('[data-testid="remove-owner"]').scrollIntoView().click();
  verifyResponseStatusCode('@patchOwner', 200);

  cy.get('[data-testid="owner-link"]').should('not.contain', teamName);

  cy.get(`[data-testid=${dataTestId ?? 'owner-link'}]`).should(
    'not.contain',
    teamName
  );
};
