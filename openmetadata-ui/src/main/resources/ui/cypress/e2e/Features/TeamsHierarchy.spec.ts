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
  interceptURL,
  uuid,
  verifyResponseStatusCode,
} from '../../common/common';
import { addTeam } from '../../common/Utils/Teams';
import { GlobalSettingOptions } from '../../constants/settings.constant';

const buTeamName = `bu-${uuid()}`;
const divTeamName = `div-${uuid()}`;
const depTeamName = `dep-${uuid()}`;
const grpTeamName = `grp-${uuid()}`;
const teamNames = [buTeamName, divTeamName, depTeamName, grpTeamName];

const getTeam = (teamName: string) => {
  return {
    name: teamName,
    displayName: teamName,
    teamType: 'BusinessUnit',
    description: `Team ${teamName} Description`,
    ownername: 'admin',
    email: 'team@gmail.com',
  };
};

describe(
  'Add nested teams and test TeamsSelectable',
  { tags: 'Settings' },
  () => {
    beforeEach(() => {
      cy.login();

      interceptURL('GET', '/api/v1/teams/name/*', 'getOrganization');
      interceptURL('GET', '/api/v1/permissions/team/name/*', 'getPermissions');

      cy.settingClick(GlobalSettingOptions.TEAMS);

      verifyResponseStatusCode('@getOrganization', 200);
    });

    it('Add teams', () => {
      verifyResponseStatusCode('@getPermissions', 200);
      teamNames.forEach((teamName, index) => {
        addTeam(getTeam(teamName), index, true);
        verifyResponseStatusCode('@getOrganization', 200);

        // asserting the added values
        cy.get('table').find('.ant-table-row').contains(teamName).click();
        verifyResponseStatusCode('@getOrganization', 200);
        verifyResponseStatusCode('@getPermissions', 200);
      });
    });

    it('Check hierarchy in Add User page', () => {
      // Clicking on users
      cy.settingClick(GlobalSettingOptions.USERS);

      cy.get('[data-testid="add-user"]').should('be.visible').click();

      // Enter team name
      cy.get('[data-testid="team-select"] .ant-select-selector')
        .should('exist')
        .scrollIntoView()
        .should('be.visible')
        .click()
        .type(buTeamName);

      teamNames.forEach((teamName) => {
        cy.get('.ant-tree-select-dropdown').should('contain', teamName);
      });

      teamNames.forEach((teamName) => {
        cy.get('[data-testid="team-select"] .ant-select-selector')
          .should('exist')
          .scrollIntoView()
          .should('be.visible')
          .click()
          .type(teamName);
        cy.get('.ant-tree-select-dropdown').should('contain', teamName);
      });
    });
  }
);
