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
import { DBT, HTTP_CONFIG_SOURCE } from '../../constants/constants';
import { EntityType, SidebarItem } from '../../constants/Entity.interface';
import { REDSHIFT } from '../../constants/service.constants';
import { GlobalSettingOptions } from '../../constants/settings.constant';
import {
  checkServiceFieldSectionHighlighting,
  interceptURL,
  verifyResponseStatusCode,
} from '../common';
import ServiceBaseClass from '../Entities/ServiceBaseClass';
import { searchServiceFromSettingPage } from '../serviceUtils';
import { visitEntityDetailsPage } from '../Utils/Entity';
import { handleIngestionRetry, scheduleIngestion } from '../Utils/Ingestion';
import { Services } from '../Utils/Services';

class RedshiftWithDBTIngestionClass extends ServiceBaseClass {
  name: string;
  filterPattern: string;
  dbtEntityFqn: string;

  constructor() {
    super(
      Services.Database,
      REDSHIFT.serviceName,
      REDSHIFT.serviceType,
      REDSHIFT.tableName
    );

    this.filterPattern = 'sales';
    this.dbtEntityFqn = `${REDSHIFT.serviceName}.${Cypress.env(
      'redshiftDatabase'
    )}.dbt_jaffle.${REDSHIFT.DBTTable}`;
  }

  createService() {
    super.createService();
  }

  updateService() {
    super.updateService();
  }

  fillConnectionDetails() {
    cy.get('#root\\/username').type(Cypress.env('redshiftUsername'));
    checkServiceFieldSectionHighlighting('username');
    cy.get('#root\\/password')
      .scrollIntoView()
      .type(Cypress.env('redshiftPassword'));
    checkServiceFieldSectionHighlighting('password');
    cy.get('#root\\/hostPort')
      .scrollIntoView()
      .type(Cypress.env('redshiftHost'));
    checkServiceFieldSectionHighlighting('hostPort');
    cy.get('#root\\/database')
      .scrollIntoView()
      .type(Cypress.env('redshiftDatabase'));
    checkServiceFieldSectionHighlighting('database');
  }

  fillIngestionDetails() {
    // no schema or database filters
    cy.get('#root\\/schemaFilterPattern\\/includes')
      .scrollIntoView()
      .type('dbt_jaffle{enter}');

    cy.get('#root\\/includeViews').click();
  }

  runAdditionalTests() {
    it('Add DBT ingestion', () => {
      interceptURL(
        'POST',
        '/api/v1/services/ingestionPipelines/deploy/*',
        'deployIngestion'
      );
      interceptURL(
        'GET',
        '/api/v1/services/ingestionPipelines/*/pipelineStatus?startTs=*&endTs=*',
        'pipelineStatus'
      );
      cy.sidebarClick(SidebarItem.SETTINGS);
      // Services page
      interceptURL('GET', '/api/v1/services/*', 'getServices');

      cy.settingClick(GlobalSettingOptions.DATABASES);

      verifyResponseStatusCode('@getServices', 200);
      interceptURL(
        'GET',
        '/api/v1/services/ingestionPipelines?*',
        'ingestionData'
      );
      interceptURL(
        'GET',
        '/api/v1/system/config/pipeline-service-client',
        'airflow'
      );
      interceptURL(
        'GET',
        '/api/v1/permissions/ingestionPipeline/name/*',
        'ingestionPermissions'
      );
      interceptURL(
        'GET',
        '/api/v1/services/ingestionPipelines/status',
        'getIngestionPipelineStatus'
      );
      interceptURL('GET', '/api/v1/services/*/name/*', 'serviceDetails');
      interceptURL('GET', '/api/v1/databases?*', 'databases');
      searchServiceFromSettingPage(REDSHIFT.serviceName);
      cy.get(`[data-testid="service-name-${REDSHIFT.serviceName}"]`)
        .should('exist')
        .click();

      verifyResponseStatusCode('@ingestionData', 200, {
        responseTimeout: 50000,
      });
      verifyResponseStatusCode('@serviceDetails', 200);
      verifyResponseStatusCode('@airflow', 200);
      verifyResponseStatusCode('@databases', 200);
      cy.get('[data-testid="tabs"]').should('exist');
      cy.get('[data-testid="ingestions"]')
        .scrollIntoView()
        .should('be.visible')
        .click();

      verifyResponseStatusCode('@pipelineStatus', 200);
      verifyResponseStatusCode('@ingestionPermissions', 200);

      cy.get('[data-testid="ingestion-details-container"]').should('exist');
      cy.get('[data-testid="add-new-ingestion-button"]')
        .should('be.visible')
        .click();
      cy.get('[data-testid="list-item"]').contains('Add dbt Ingestion').click();

      verifyResponseStatusCode('@getServices', 200);
      verifyResponseStatusCode('@getIngestionPipelineStatus', 200);

      // Add DBT ingestion
      cy.get('#root\\/dbtConfigSource__oneof_select')
        .scrollIntoView()
        .should('be.visible');
      cy.get('#root\\/dbtConfigSource__oneof_select').select('DBT HTTP Config');

      cy.get('#root\\/dbtConfigSource\\/dbtCatalogHttpPath')
        .scrollIntoView()
        .type(HTTP_CONFIG_SOURCE.DBT_CATALOG_HTTP_PATH);
      cy.get('#root\\/dbtConfigSource\\/dbtManifestHttpPath')
        .scrollIntoView()
        .type(HTTP_CONFIG_SOURCE.DBT_MANIFEST_HTTP_PATH);
      cy.get('#root\\/dbtConfigSource\\/dbtRunResultsHttpPath')
        .scrollIntoView()
        .type(HTTP_CONFIG_SOURCE.DBT_RUN_RESULTS_FILE_PATH);

      cy.get('[data-testid="submit-btn"]').should('be.visible').click();

      scheduleIngestion();

      cy.wait('@deployIngestion').then(() => {
        interceptURL(
          'GET',
          '/api/v1/services/ingestionPipelines?*',
          'ingestionPipelines'
        );
        interceptURL(
          'GET',
          '/api/v1/permissions/*/name/*',
          'serviceDetailsPermission'
        );
        interceptURL('GET', '/api/v1/services/*/name/*', 'serviceDetails');
        cy.get('[data-testid="view-service-button"]')
          .scrollIntoView()
          .should('be.visible')
          .click();
        verifyResponseStatusCode('@getIngestionPipelineStatus', 200);
        verifyResponseStatusCode('@serviceDetails', 200);
        verifyResponseStatusCode('@ingestionPipelines', 200);
        handleIngestionRetry(0, 'dbt');
      });
    });

    it('Validate DBT is ingested properly', () => {
      interceptURL(
        'GET',
        `/api/v1/classifications?fields=termCount&limit=*`,
        'fetchClassifications'
      );
      // Verify DBT tags
      interceptURL(
        'GET',
        `/api/v1/tags?*parent=${DBT.classification}*`,
        'getTagList'
      );

      cy.sidebarClick(SidebarItem.TAGS);

      verifyResponseStatusCode('@fetchClassifications', 200);

      cy.get('[data-testid="data-summary-container"]')
        .contains(DBT.classification)
        .click();

      verifyResponseStatusCode('@getTagList', 200);
      // Verify DBT tag category is added
      cy.get('[data-testid="tag-name"]')
        .should('be.visible')
        .should('contain', DBT.classification);

      cy.get('.ant-table-row')
        .should('be.visible')
        .should('contain', DBT.tagName);

      // Verify DBT in table entity
      visitEntityDetailsPage({
        term: REDSHIFT.DBTTable,
        serviceName: REDSHIFT.serviceName,
        entity: EntityType.Table,
        entityFqn: this.dbtEntityFqn,
      });

      // Verify tags
      cy.get('[data-testid="entity-tags"]').should('contain', `${DBT.tagName}`);
      // Verify DBT tab is present
      cy.get('[data-testid="dbt"]').click();
      // Verify query is present in the DBT tab
      cy.get('.CodeMirror')
        .should('be.visible')
        .should('contain', DBT.dbtQuery);

      cy.get('[data-testid="lineage"]').click();

      cy.get('[data-testid="entity-header-display-name"]').should(
        'contain',
        DBT.dbtLineageNodeLabel
      );

      // Verify Data Quality
      cy.get('[data-testid="profiler"]').should('be.visible').click();

      cy.get('[data-testid="profiler-tab-left-panel"]')
        .should('be.visible')
        .contains('Data Quality')
        .click();

      cy.get(`[data-testid=${DBT.dataQualityTest1}]`)
        .should('exist')
        .should('be.visible')
        .should('contain', DBT.dataQualityTest1);
      cy.get(`[data-testid=${DBT.dataQualityTest2}]`)
        .should('exist')
        .should('be.visible')
        .should('contain', DBT.dataQualityTest2);
    });
  }

  deleteService() {
    super.deleteService();
  }
}

// eslint-disable-next-line jest/no-export
export default RedshiftWithDBTIngestionClass;
