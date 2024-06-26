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
import {
  INVALID_NAMES,
  NAME_VALIDATION_ERROR,
} from '../../constants/constants';
import {
  interceptURL,
  replaceAllSpacialCharWith_,
  toastNotification,
  verifyResponseStatusCode,
} from '../common';
import { visitServiceDetailsPage } from '../serviceUtils';
import { visitEntityDetailsPage } from '../Utils/Entity';
import {
  deleteService,
  retryIngestionRun,
  Services,
  ServicesEntityMap,
  testConnection,
} from '../Utils/Services';

const RETRIES_COUNT = 4;
const RETRY_TIMES = 4;
const BASE_WAIT_TIME = 20000;

export const descriptionBox =
  '.toastui-editor-md-container > .toastui-editor > .ProseMirror';

class ServiceBaseClass {
  public category: Services;
  protected serviceName: string;
  public serviceType: string;
  protected entityName: string;
  protected shouldTestConnection: boolean;
  protected shouldAddIngestion: boolean;

  constructor(
    category: Services,
    name: string,
    serviceType: string,
    entity: string,
    shouldTestConnection = true,
    shouldAddIngestion = true
  ) {
    this.category = category;
    this.serviceName = name;
    this.serviceType = serviceType;
    this.entityName = entity;
    this.shouldTestConnection = shouldTestConnection;
    this.shouldAddIngestion = shouldAddIngestion;
  }

  visitService() {
    // Handle visit service here
  }

  createService() {
    // Handle create service here
    // intercept the service requirement md file fetch request
    interceptURL(
      'GET',
      `en-US/*/${this.serviceType}.md`,
      'getServiceRequirements'
    );

    cy.get('[data-testid="add-service-button"]').click();

    // Select Service in step 1
    this.serviceSetp1(this.serviceType);

    // Enter service name in step 2
    this.serviceSetp2(this.serviceName);

    // Connection Details in step 3
    cy.get('[data-testid="add-new-service-container"]')
      .parent()
      .parent()
      .scrollTo('top', {
        ensureScrollable: false,
      });
    cy.contains('Connection Details').scrollIntoView().should('be.visible');

    // Requirement panel should be visible and fetch the requirements md file
    cy.get('[data-testid="service-requirements"]').should('be.visible');
    verifyResponseStatusCode('@getServiceRequirements', [200, 304], {}, true);

    this.fillConnectionDetails();

    this.shouldTestConnection && testConnection();

    this.submitService(this.serviceName);

    this.shouldAddIngestion && this.addIngestionPipeline(this.serviceName);
  }

  serviceSetp1(serviceType: string) {
    // Storing the created service name and the type of service
    // Select Service in step 1
    cy.get(`[data-testid="${serviceType}"]`).click();
    cy.get('[data-testid="next-button"]').click();
  }

  serviceSetp2(serviceName: string) {
    // validation should work
    cy.get('[data-testid="next-button"]').click();

    cy.get('#name_help').should('contain', 'Name is required');

    // invalid name validation should work
    cy.get('[data-testid="service-name"]').type(
      INVALID_NAMES.WITH_SPECIAL_CHARS
    );
    cy.get('#name_help').should('contain', NAME_VALIDATION_ERROR);

    cy.get('[data-testid="service-name"]').clear().type(serviceName);
    interceptURL('GET', '/api/v1/services/ingestionPipelines/ip', 'ipApi');
    interceptURL(
      'GET',
      'api/v1/services/ingestionPipelines/*',
      'ingestionPipelineStatus'
    );

    cy.get('[data-testid="next-button"]').click();
  }

  fillConnectionDetails() {
    // Handle fill connection details in respective service here
  }

  fillIngestionDetails() {
    // Handle fill ingestion details in respective service here
  }

  validateIngestionDetails() {
    // Handle validate ingestion details in respective service here
  }

  addIngestionPipeline(serviceName: string) {
    cy.get('[data-testid="add-ingestion-button"]').click();

    // Add ingestion page
    cy.get('[data-testid="add-ingestion-container"]').should('be.visible');

    this.fillIngestionDetails();

    cy.get('[data-testid="submit-btn"]').scrollIntoView().click();

    // Go back and data should persist
    cy.get('[data-testid="back-button"]').scrollIntoView().click();

    this.validateIngestionDetails();

    // Go Next
    cy.get('[data-testid="submit-btn"]').scrollIntoView().click();

    this.scheduleIngestion();

    cy.contains(`${replaceAllSpacialCharWith_(serviceName)}_metadata`).should(
      'be.visible'
    );

    interceptURL(
      'GET',
      '/api/v1/services/ingestionPipelines?*',
      'ingestionPipelines'
    );
    interceptURL('GET', '/api/v1/services/*/name/*', 'serviceDetails');

    cy.get('[data-testid="view-service-button"]').click();
    verifyResponseStatusCode('@serviceDetails', 200);
    cy.wait('@ingestionPipelines');

    this.handleIngestionRetry();
  }

  submitService(serviceName: string) {
    interceptURL(
      'GET',
      '/api/v1/services/ingestionPipelines/status',
      'getIngestionPipelineStatus'
    );
    cy.get('[data-testid="submit-btn"]').should('exist').click();
    verifyResponseStatusCode('@getIngestionPipelineStatus', 200);

    // check success
    cy.get('[data-testid="success-line"]').should('be.visible');
    cy.contains(`"${serviceName}"`).should('be.visible');
    cy.contains('has been created successfully').should('be.visible');
  }

  scheduleIngestion(hasRetryCount = true) {
    interceptURL(
      'POST',
      '/api/v1/services/ingestionPipelines',
      'createIngestionPipelines'
    );
    interceptURL(
      'POST',
      '/api/v1/services/ingestionPipelines/deploy/*',
      'deployPipeline'
    );
    interceptURL(
      'GET',
      '/api/v1/services/ingestionPipelines/status',
      'getIngestionPipelineStatus'
    );
    // Schedule & Deploy
    cy.get('[data-testid="cron-type"]').should('be.visible').click();
    cy.get('.ant-select-item-option-content').contains('Hour').click();

    if (hasRetryCount) {
      cy.get('#retries')
        .scrollIntoView()
        .clear()
        .type(RETRIES_COUNT + '');
    }

    cy.get('[data-testid="deploy-button"]').click();

    verifyResponseStatusCode('@createIngestionPipelines', 201);
    verifyResponseStatusCode('@deployPipeline', 200, {
      responseTimeout: 50000,
    });
    verifyResponseStatusCode('@getIngestionPipelineStatus', 200);
    // check success
    cy.get('[data-testid="success-line"]', { timeout: 15000 }).should(
      'be.visible'
    );
    cy.contains('has been created and deployed successfully').should(
      'be.visible'
    );
  }

  handleIngestionRetry = (ingestionType = 'metadata') => {
    let timer = BASE_WAIT_TIME;
    const rowIndex = ingestionType === 'metadata' ? 1 : 2;

    interceptURL(
      'GET',
      '/api/v1/services/ingestionPipelines?*',
      'ingestionPipelines'
    );
    interceptURL(
      'GET',
      '/api/v1/services/ingestionPipelines/*/pipelineStatus?startTs=*&endTs=*',
      'pipelineStatuses'
    );
    interceptURL('GET', '/api/v1/services/*/name/*', 'serviceDetails');
    interceptURL('GET', '/api/v1/permissions?limit=100', 'allPermissions');

    // ingestions page
    let retryCount = 0;
    const testIngestionsTab = () => {
      // click on the tab only for the first time
      if (retryCount === 0) {
        cy.get('[data-testid="ingestions"]').should('exist').and('be.visible');
        cy.get('[data-testid="ingestions"] >> [data-testid="count"]').should(
          'have.text',
          rowIndex
        );
        cy.get('[data-testid="ingestions"]').click();

        if (ingestionType === 'metadata') {
          cy.wait('@pipelineStatuses', {
            responseTimeout: 50000,
          });
        }

        cy.contains('td', `${ingestionType}`) // find the element with the text
          .parent('tr') // find the parent 'tr'
          .find('[data-testid="run"]')
          .click();

        // Check cron schedule for Hour here
        // Being set from this.scheduleIngestion method
        cy.get('.ant-table-cell').should('contain', '0 * * * *');
      }
    };
    const checkSuccessState = () => {
      testIngestionsTab();

      if (retryCount !== 0) {
        cy.wait('@allPermissions').then(() => {
          cy.wait('@serviceDetails').then(() => {
            cy.wait('@ingestionPipelines');
            cy.wait('@pipelineStatuses', {
              responseTimeout: 50000,
            });
          });
        });
      }

      retryCount++;

      cy.contains('td', `${ingestionType}`) // find the element with the text
        .parent('tr') // find the parent 'tr'
        .find('[data-testid="pipeline-status"]') // find the element with '[data-testid="run"]'
        .as('checkRun');
      // the latest run should be success
      cy.get('@checkRun').then(($ingestionStatus) => {
        const text = $ingestionStatus.text();
        if (
          text !== 'Success' &&
          text !== 'Failed' &&
          retryCount <= RETRY_TIMES
        ) {
          // retry after waiting with log1 method [20s,40s,80s,160s,320s]
          cy.wait(timer);
          timer *= 2;
          cy.reload();
          checkSuccessState();
        } else {
          cy.get('@checkRun').should('contain', 'Success');
        }
      });
    };

    checkSuccessState();
  };

  updateService() {
    this.updateDescriptionForIngestedTables();
  }

  updateScheduleOptions() {
    visitServiceDetailsPage(
      { type: this.category, name: this.serviceName },
      false
    );

    interceptURL(
      'GET',
      `/api/v1/services/ingestionPipelines/**`,
      'pipelineServices'
    );

    cy.get('[data-testid="ingestions"]').click();

    verifyResponseStatusCode('@pipelineServices', 200);

    // click and edit pipeline schedule for Minutes

    cy.get('[data-testid="edit"]').click();
    cy.get('[data-testid="submit-btn"]').click();

    // select schedule
    cy.get('[data-testid="cron-type"]').click();
    cy.get('.ant-select-item-option-content').contains('Minutes').click();
    cy.get('[data-testid="minute-segment-options"]').click();
    cy.get('.ant-select-item-option-content').contains('10').click();

    // Deploy with scehdule
    cy.get('[data-testid="deploy-button"]').click();
    cy.get('[data-testid="view-service-button"]').click();

    cy.get('.ant-table-cell').should('contain', '*/10 * * * *');

    // click and edit pipeline schedule for Day
    cy.get('[data-testid="edit"]').click();
    cy.get('[data-testid="submit-btn"]').click();
    cy.get('[data-testid="cron-type"]').click();
    cy.get('.ant-select-item-option-content').contains('Day').click();

    cy.get('[data-testid="hour-options"]').click();
    cy.get('.ant-select-item-option-content').contains('4').click();
    cy.get('[data-testid="minute-options"]').click();
    cy.get('.ant-select-item-option-content')
      .filter(':visible')
      .contains('4')
      .click();

    // Deploy with scehdule
    cy.get('[data-testid="deploy-button"]').click();
    cy.get('[data-testid="view-service-button"]').click();

    cy.get('.ant-table-cell').should('contain', '4 4 * * *');

    // click and edit pipeline schedule for Week
    cy.get('[data-testid="edit"]').click();
    cy.get('[data-testid="submit-btn"]').click();
    cy.get('[data-testid="cron-type"]').click();
    cy.get('.ant-select-item-option-content').contains('Week').click();
    cy.get('[data-value="6"]').click();
    cy.get('[data-testid="hour-options"]').click();
    cy.get('.ant-select-item-option-content').contains('5').click();
    cy.get('[data-testid="minute-options"]').click();
    cy.get('.ant-select-item-option-content')
      .filter(':visible')
      .contains('05')
      .click();

    // Deploy with scehdule
    cy.get('[data-testid="deploy-button"]').click();
    cy.get('[data-testid="view-service-button"]').click();

    cy.get('.ant-table-cell').should('contain', '5 5 * * 6');

    // click and edit pipeline schedule for Custom
    cy.get('[data-testid="edit"]').click();
    cy.get('[data-testid="submit-btn"]').click();
    cy.get('[data-testid="cron-type"]').click();
    cy.get('.ant-select-item-option-content').contains('Custom').click();
    cy.get('#cron').clear().type('* * * 2 6');

    cy.get('[data-testid="deploy-button"]').click();
    cy.get('[data-testid="view-service-button"]').click();
    cy.get('.ant-table-cell').should('contain', '* * * 2 6');
  }

  updateDescriptionForIngestedTables() {
    const description = `${this.entityName} description`;
    interceptURL(
      'GET',
      `/api/v1/services/ingestionPipelines?fields=*&service=*`,
      'ingestionPipelines'
    );
    interceptURL('GET', `/api/v1/*?service=*&fields=*`, 'serviceDetails');
    interceptURL(
      'GET',
      `/api/v1/system/config/pipeline-service-client`,
      'pipelineServiceClient'
    );
    interceptURL(
      'GET',
      `/api/v1/services/ingestionPipelines/*/pipelineStatus?*`,
      'pipelineStatus'
    );
    // Navigate to ingested table
    visitEntityDetailsPage({
      term: this.entityName,
      serviceName: this.serviceName,
      entity: ServicesEntityMap[this.category],
    });

    // update description
    cy.get('[data-testid="edit-description"]').click();
    cy.get(descriptionBox).click().clear().type(description);
    interceptURL('PATCH', '/api/v1/*/*', 'updateEntity');
    cy.get('[data-testid="save"]').click();
    verifyResponseStatusCode('@updateEntity', 200);

    // re-run ingestion flow
    // Services page
    cy.settingClick(this.category);
    interceptURL(
      'GET',
      'api/v1/search/query?q=*&from=0&size=15&index=*',
      'searchService'
    );
    cy.get('[data-testid="searchbar"]').type(this.serviceName);

    verifyResponseStatusCode('@searchService', 200);

    // click on created service
    cy.get(`[data-testid="service-name-${this.serviceName}"]`).click();

    verifyResponseStatusCode('@serviceDetails', 200);
    verifyResponseStatusCode('@ingestionPipelines', 200);
    verifyResponseStatusCode('@pipelineServiceClient', 200);
    cy.get('[data-testid="ingestions"]').click();
    verifyResponseStatusCode('@pipelineStatus', 200);

    interceptURL(
      'POST',
      '/api/v1/services/ingestionPipelines/trigger/*',
      'checkRun'
    );

    cy.contains(
      'td',
      `${replaceAllSpacialCharWith_(this.serviceName)}_metadata`
    ) // find the element with the text
      .parent('tr') // find the parent 'tr'
      .find('[data-testid="run"]') // find the element with '[data-testid="run"]'
      .click();

    verifyResponseStatusCode('@checkRun', 200);

    toastNotification(`Pipeline triggered successfully!`);

    // Wait for success
    retryIngestionRun();

    // Navigate to table name
    visitEntityDetailsPage({
      term: this.entityName,
      serviceName: this.serviceName,
      entity: ServicesEntityMap[this.category],
    });
    cy.get('[data-testid="markdown-parser"]')
      .first()
      .invoke('text')
      .should('contain', description);
  }

  runAdditionalTests() {
    // Write service specific tests
  }

  deleteService() {
    deleteService(this.category, this.serviceName);
  }
}

export default ServiceBaseClass;
