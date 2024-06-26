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
  toastNotification,
  verifyResponseStatusCode,
  visitServiceDetailsPage,
} from '../../common/common';
import { hardDeleteService } from '../../common/EntityUtils';
import { getToken } from '../../common/Utils/LocalStorage';
import { addOwner } from '../../common/Utils/Owner';
import { addTier } from '../../common/Utils/Tier';
import { DELETE_TERM } from '../../constants/constants';
import { DOMAIN_CREATION_DETAILS } from '../../constants/EntityConstant';
import {
  OWNER_DETAILS,
  SERVICE_DETAILS_FOR_VERSION_TEST,
  TIER,
} from '../../constants/Version.constants';

const navigateToVersionPageFromServicePage = (
  serviceCategory,
  serviceName,
  serviceId,
  versionNumber
) => {
  interceptURL(
    'GET',
    `/api/v1/services/${serviceCategory}/name/${serviceName}?*`,
    `getServiceDetails`
  );
  interceptURL(
    'GET',
    `/api/v1/services/${serviceCategory}/${serviceId}/versions`,
    'getVersionsList'
  );
  interceptURL(
    'GET',
    `/api/v1/services/${serviceCategory}/${serviceId}/versions/${versionNumber}`,
    'getSelectedVersionDetails'
  );

  cy.get('[data-testid="version-button"]').contains(versionNumber).click();

  verifyResponseStatusCode(`@getServiceDetails`, 200);
  verifyResponseStatusCode('@getVersionsList', 200);
  verifyResponseStatusCode('@getSelectedVersionDetails', 200);
};

describe(
  'Common prerequisite for service version test',
  { tags: 'Integration' },
  () => {
    const data = { user: { id: '', displayName: '' }, domain: { id: '' } };

    before(() => {
      cy.login();
      cy.getAllLocalStorage().then((responseData) => {
        const token = getToken(responseData);
        cy.request({
          method: 'PUT',
          url: `/api/v1/domains`,
          headers: { Authorization: `Bearer ${token}` },
          body: DOMAIN_CREATION_DETAILS,
        }).then((response) => {
          data.domain = response.body;
        });

        // Create user
        cy.request({
          method: 'POST',
          url: `/api/v1/users/signup`,
          headers: { Authorization: `Bearer ${token}` },
          body: OWNER_DETAILS,
        }).then((response) => {
          data.user = response.body;
        });
      });
    });

    after(() => {
      cy.login();
      cy.getAllLocalStorage().then((responseData) => {
        const token = getToken(responseData);
        cy.request({
          method: 'DELETE',
          url: `/api/v1/domains/name/${DOMAIN_CREATION_DETAILS.name}`,
          headers: { Authorization: `Bearer ${token}` },
        });

        // Delete created user
        cy.request({
          method: 'DELETE',
          url: `/api/v1/users/${data.user.id}?hardDelete=true&recursive=false`,
          headers: { Authorization: `Bearer ${token}` },
        });
      });
    });

    Object.entries(SERVICE_DETAILS_FOR_VERSION_TEST).map(
      ([serviceType, serviceDetails]) => {
        describe(`${serviceType} service version page`, () => {
          let serviceId;
          const {
            serviceCategory,
            serviceName,
            settingsMenuId,
            entityCreationDetails,
            entityPatchPayload,
          } = serviceDetails;

          before(() => {
            cy.login();
            cy.getAllLocalStorage().then((responseData) => {
              const token = getToken(responseData);
              cy.request({
                method: 'POST',
                url: `/api/v1/services/${serviceCategory}`,
                headers: { Authorization: `Bearer ${token}` },
                body: entityCreationDetails,
              }).then((response) => {
                serviceId = response.body.id;

                cy.request({
                  method: 'PATCH',
                  url: `/api/v1/services/${serviceCategory}/${serviceId}`,
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json-patch+json',
                  },
                  body: [
                    ...entityPatchPayload,
                    {
                      op: 'add',
                      path: '/domain',
                      value: {
                        id: data.domain.id,
                        type: 'domain',
                        name: DOMAIN_CREATION_DETAILS.name,
                        description: DOMAIN_CREATION_DETAILS.description,
                      },
                    },
                  ],
                });
              });
            });
          });

          beforeEach(() => {
            cy.login();
          });

          after(() => {
            cy.login();
            cy.getAllLocalStorage().then((data) => {
              const token = getToken(data);

              hardDeleteService({
                token,
                serviceFqn: serviceName,
                serviceType: serviceCategory,
              });
            });
          });

          serviceType !== 'Metadata' &&
            it(`${serviceType} service version page should show edited tags and description changes properly`, () => {
              visitServiceDetailsPage(
                settingsMenuId,
                serviceCategory,
                serviceName
              );

              navigateToVersionPageFromServicePage(
                serviceCategory,
                serviceName,
                serviceId,
                '0.2'
              );

              cy.get(`[data-testid="domain-link"]`)
                .within(($this) => $this.find(`[data-testid="diff-added"]`))
                .scrollIntoView()
                .should('be.visible');

              cy.get('[data-testid="viewer-container"]')
                .within(($this) => $this.find('[data-testid="diff-added"]'))
                .scrollIntoView()
                .should('be.visible');

              cy.get(
                `[data-testid="entity-right-panel"] .diff-added [data-testid="tag-PersonalData.SpecialCategory"]`
              )
                .scrollIntoView()
                .should('be.visible');

              cy.get(
                `[data-testid="entity-right-panel"] .diff-added [data-testid="tag-PII.Sensitive"]`
              )
                .scrollIntoView()
                .should('be.visible');
            });

          it(`${serviceType} version page should show owner changes properly`, () => {
            visitServiceDetailsPage(
              settingsMenuId,
              serviceCategory,
              serviceName
            );

            cy.get('[data-testid="version-button"]').as('versionButton');

            cy.get('@versionButton').contains('0.2');

            addOwner(data.user.displayName);

            navigateToVersionPageFromServicePage(
              serviceCategory,
              serviceName,
              serviceId,
              '0.2'
            );

            cy.get('[data-testid="owner-link"] > [data-testid="diff-added"]')
              .scrollIntoView()
              .should('be.visible');
          });

          it(`${serviceType} version page should show tier changes properly`, () => {
            visitServiceDetailsPage(
              settingsMenuId,
              serviceCategory,
              serviceName
            );

            cy.get('[data-testid="version-button"]').as('versionButton');

            cy.get('@versionButton').contains('0.2');

            addTier(TIER);

            navigateToVersionPageFromServicePage(
              serviceCategory,
              serviceName,
              serviceId,
              '0.2'
            );

            cy.get('[data-testid="Tier"] > [data-testid="diff-added"]')
              .scrollIntoView()
              .should('be.visible');
          });

          it(`${serviceType} version page should show version details after soft deleted`, () => {
            visitServiceDetailsPage(
              settingsMenuId,
              serviceCategory,
              serviceName
            );

            cy.get('[data-testid="manage-button"]').click();

            cy.get('[data-menu-id*="delete-button"]').should('be.visible');
            cy.get('[data-testid="delete-button-title"]').click();

            // Clicking on soft delete radio button and checking the service name
            cy.get('[data-testid="soft-delete-option"]')
              .contains(serviceName)
              .click();

            cy.get('[data-testid="confirmation-text-input"]').type(DELETE_TERM);
            interceptURL(
              'DELETE',
              `/api/v1/services/${serviceCategory}/*hardDelete=false*`,
              'deleteService'
            );
            interceptURL(
              'GET',
              '/api/v1/services/*/name/*?fields=owner',
              'serviceDetails'
            );

            cy.get('[data-testid="confirm-button"]')
              .should('be.visible')
              .click();
            verifyResponseStatusCode('@deleteService', 200);

            // Closing the toast notification
            toastNotification(`"${serviceName}" deleted successfully!`);

            navigateToVersionPageFromServicePage(
              serviceCategory,
              serviceName,
              serviceId,
              '0.3'
            );

            // Deleted badge should be visible
            cy.get('[data-testid="deleted-badge"]')
              .scrollIntoView()
              .should('be.visible');
          });
        });
      }
    );
  }
);
