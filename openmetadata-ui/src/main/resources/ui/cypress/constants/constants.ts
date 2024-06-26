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

import { EntityType } from './Entity.interface';
import { GlobalSettingOptions } from './settings.constant';

export const uuid = () => Cypress._.random(0, 1e6);
const id = uuid();

export const BASE_URL = location.origin;

export const LOGIN_ERROR_MESSAGE =
  'You have entered an invalid username or password.';

export const DATA_ASSETS = {
  tables: 'tables',
  topics: 'topics',
  dashboards: 'dashboards',
  pipelines: 'pipelines',
  mlmodels: 'mlmodels',
  service: 'service',
  user: 'user',
  teams: 'teams',
  testSuite: 'test-suite',
  containers: 'containers',
  glossaryTerms: 'glossary-terms',
  tags: 'tags',
  storedProcedures: 'storedProcedures',
  dataModel: 'dashboardDataModel',
  searchIndexes: 'searchIndexes',
};
export const EXPLORE_PAGE_TABS = {
  mlmodels: 'ml models',
  storedProcedures: 'stored procedures',
  dataProducts: 'data products',
  dataModel: 'dashboard data models',
  searchIndexes: 'search indexes',
};

export const SEARCH_INDEX = {
  tables: 'table_search_index',
  topics: 'topic_search_index',
  dashboards: 'dashboard_search_index',
  pipelines: 'pipeline_search_index',
  mlmodels: 'mlmodel_search_index',
  containers: 'container_search_index',
  searchIndexes: 'search_entity_search_index',
};

export const DATA_QUALITY_SAMPLE_DATA_TABLE = {
  term: 'dim_address',
  entity: EntityType.Table,
  serviceName: 'sample_data',
  testCaseName: 'column_value_max_to_be_between',
  sqlTestCaseName: 'my_sql_test_case_cypress',
  sqlTestCase: 'Custom SQL Query',
  sqlQuery: 'Select * from dim_address',
};

export const COLUMN_NAME_FOR_APPLY_GLOSSARY_TERM = 'customer';

export const SEARCH_ENTITY_TABLE = {
  table_1: {
    term: 'raw_customer',
    displayName: 'raw_customer',
    entity: EntityType.Table,
    serviceName: 'sample_data',
    entityType: 'Table',
  },
  table_2: {
    term: 'fact_session',
    displayName: 'fact_session',
    entity: EntityType.Table,
    serviceName: 'sample_data',
    schemaName: 'shopify',
    entityType: 'Table',
  },
  table_3: {
    term: 'raw_product_catalog',
    displayName: 'raw_product_catalog',
    entity: EntityType.Table,
    serviceName: 'sample_data',
    schemaName: 'shopify',
    entityType: 'Table',
  },
  table_4: {
    term: 'dim_address',
    displayName: 'dim_address',
    entity: EntityType.Table,
    serviceName: 'sample_data',
    entityType: 'Table',
  },
  table_5: {
    term: 'dim.api/client',
    displayName: 'dim.api/client',
    entity: EntityType.Table,
    serviceName: 'sample_data',
    entityType: 'Table',
  },
};

export const SEARCH_ENTITY_TOPIC = {
  topic_1: {
    term: 'shop_products',
    displayName: 'shop_products',
    entity: EntityType.Topic,
    serviceName: 'sample_kafka',
    entityType: 'Topic',
  },
  topic_2: {
    term: 'orders',
    entity: EntityType.Topic,
    serviceName: 'sample_kafka',
    entityType: 'Topic',
  },
};

export const SEARCH_ENTITY_DASHBOARD = {
  dashboard_1: {
    term: 'Slack Dashboard',
    displayName: 'Slack Dashboard',
    entity: EntityType.Dashboard,
    serviceName: 'sample_superset',
    entityType: 'Dashboard',
  },
  dashboard_2: {
    term: 'Unicode Test',
    entity: EntityType.Dashboard,
    serviceName: 'sample_superset',
    entityType: 'Dashboard',
  },
};

export const SEARCH_ENTITY_PIPELINE = {
  pipeline_1: {
    term: 'dim_product_etl',
    displayName: 'dim_product etl',
    entity: EntityType.Pipeline,
    serviceName: 'sample_airflow',
    entityType: 'Pipeline',
  },
  pipeline_2: {
    term: 'dim_user_etl',
    displayName: 'dim_user etl',
    entity: EntityType.Pipeline,
    serviceName: 'sample_airflow',
    entityType: 'Pipeline',
  },
};
export const SEARCH_ENTITY_MLMODEL = {
  mlmodel_1: {
    term: 'forecast_sales',
    entity: EntityType.MlModel,
    serviceName: 'mlflow_svc',
    entityType: 'ML Model',
  },
  mlmodel_2: {
    term: 'eta_predictions',
    entity: EntityType.MlModel,
    serviceName: 'mlflow_svc',
    displayName: 'ETA Predictions',
    entityType: 'ML Model',
  },
};

export const SEARCH_ENTITY_STORED_PROCEDURE = {
  stored_procedure_1: {
    term: 'update_dim_address_table',
    entity: EntityType.StoreProcedure,
    serviceName: 'sample_data',
    entityType: 'Stored Procedure',
  },
  stored_procedure_2: {
    term: 'update_dim_address_table',
    entity: EntityType.StoreProcedure,
    serviceName: 'sample_data',
    displayName: 'update_dim_address_table',
    entityType: 'Stored Procedure',
  },
};

export const SEARCH_ENTITY_DATA_MODEL = {
  data_model_1: {
    term: 'operations_view',
    entity: EntityType.DataModel,
    serviceName: 'sample_looker',
    entityType: 'Data Model',
  },
  data_model_2: {
    term: 'orders_view',
    entity: EntityType.DataModel,
    serviceName: 'sample_looker',
    displayName: 'Orders View',
    entityType: 'Data Model',
  },
};

export const DELETE_ENTITY = {
  table: {
    term: 'dim.shop',
    entity: EntityType.Table,
    serviceName: 'sample_data',
    entityType: 'Table',
  },
  topic: {
    term: 'shop_updates',
    entity: EntityType.Topic,
    serviceName: 'sample_kafka',
    entityType: 'Topic',
  },
};

export const RECENT_SEARCH_TITLE = 'Recent Search Terms';
export const RECENT_VIEW_TITLE = 'Recent Views';
export const MY_DATA_TITLE = 'My Data';
export const FOLLOWING_TITLE = 'Following';

export const NO_SEARCHED_TERMS = 'No searched terms';
export const DELETE_TERM = 'DELETE';

export const TOTAL_SAMPLE_DATA_TEAMS_COUNT = 7;
export const TEAMS = {
  Cloud_Infra: { name: 'Cloud_Infra', users: 15 },
  Customer_Support: { name: 'Customer_Support', users: 20 },
  Data_Platform: { name: 'Data_Platform', users: 16 },
};

export const NEW_TEST_SUITE = {
  name: `mysql_matrix`,
  description: 'mysql critical matrix',
};

export const NEW_TABLE_TEST_CASE = {
  name: `table_column_name_to_exist_in_id_${uuid()}`,
  label: 'Table Column Name To Exist',
  type: 'tableColumnNameToExist',
  field: 'testCase',
  description: 'New table test case for TableColumnNameToExist',
};

export const NEW_COLUMN_TEST_CASE = {
  name: 'id_column_value_lengths_to_be_between',
  column: 'user_id',
  type: 'columnValueLengthsToBeBetween',
  label: 'Column Value Lengths To Be Between',
  min: '3',
  max: '6',
  description: 'New table test case for columnValueLengthsToBeBetween',
};

export const NEW_COLUMN_TEST_CASE_WITH_NULL_TYPE = {
  name: 'id_column_values_to_be_not_null',
  column: 'user_id',
  type: 'columnValuesToBeNotNull',
  label: 'Column Values To Be Not Null',
  description: 'New table test case for columnValuesToBeNotNull',
};

export const NEW_TEAM = {
  team_1: {
    name: 'account',
    display_name: 'Account',
    description: 'Account department',
  },
  team_2: {
    name: 'service',
    display_name: 'Service',
    description: 'Service department',
  },
};

export const NEW_USER = {
  email: `test_${id}@gmail.com`,
  display_name: `Test user ${id}`,
  description: 'Hello, I am test user',
};

export const NEW_ADMIN = {
  email: `test_${id}@gmail.com`,
  display_name: `Test admin ${id}`,
  description: 'Hello, I am test admin',
};

export const NEW_CLASSIFICATION = {
  name: 'CypressClassification',
  displayName: 'CypressClassification',
  description: 'This is the CypressClassification',
};
export const NEW_TAG = {
  name: 'CypressTag',
  displayName: 'CypressTag',
  renamedName: 'CypressTag-1',
  fqn: `${NEW_CLASSIFICATION.name}.CypressTag`,
  description: 'This is the CypressTag',
  color: '#FF5733',
  icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF8AAACFCAMAAAAKN9SOAAAAA1BMVEXmGSCqexgYAAAAI0lEQVRoge3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAHgaMeAAAUWJHZ4AAAAASUVORK5CYII=',
};

export const service = {
  name: 'Glue',
  description: 'This is a Glue service',
  newDescription: 'This is updated Glue service description',
  Owner: 'Aaron Johnson',
  serviceType: 'databaseService',
};

export const SERVICE_TYPE = {
  Database: GlobalSettingOptions.DATABASES,
  Messaging: GlobalSettingOptions.MESSAGING,
  Dashboard: GlobalSettingOptions.DASHBOARDS,
  Pipeline: GlobalSettingOptions.PIPELINES,
  MLModels: GlobalSettingOptions.MLMODELS,
  Storage: GlobalSettingOptions.STORAGES,
  Search: GlobalSettingOptions.SEARCH,
  Metadata: GlobalSettingOptions.METADATA,
  StoredProcedure: GlobalSettingOptions.STORED_PROCEDURES,
};

export const ENTITY_SERVICE_TYPE = {
  Database: 'Database',
  Messaging: 'Messaging',
  Dashboard: 'Dashboard',
  Pipeline: 'Pipeline',
  MLModels: 'ML Models',
  Storage: 'Storage',
  StoredProcedure: 'StoredProcedure',
  Search: 'Search',
};

export const ENTITIES = {
  entity_container: {
    name: 'container',
    description: 'This is Container custom property',
    integerValue: '14',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: {},
    entityApiType: 'containers',
  },

  entity_dashboard: {
    name: 'dashboard',
    description: 'This is Dashboard custom property',
    integerValue: '14',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: SEARCH_ENTITY_DASHBOARD.dashboard_1,
    entityApiType: 'dashboards',
  },

  entity_database: {
    name: 'database',
    description: 'This is Database custom property',
    integerValue: '14',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: {},
    entityApiType: 'databases',
  },

  entity_databaseSchema: {
    name: 'databaseSchema',
    description: 'This is Database Schema custom property',
    integerValue: '14',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: {},
    entityApiType: 'databaseSchemas',
  },

  entity_glossaryTerm: {
    name: 'glossaryTerm',
    description: 'This is Glossary Term custom property',
    integerValue: '14',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: {},
    entityApiType: 'glossaryTerm',
  },

  entity_mlmodel: {
    name: 'mlmodel',
    description: 'This is ML Model custom property',
    integerValue: '14',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: {},
    entityApiType: 'mlmodels',
  },

  entity_pipeline: {
    name: 'pipeline',
    description: 'This is Pipeline custom property',
    integerValue: '78',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: true,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: SEARCH_ENTITY_PIPELINE.pipeline_1,
    entityApiType: 'pipelines',
  },

  entity_searchIndex: {
    name: 'searchIndex',
    description: 'This is Search Index custom property',
    integerValue: '14',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: {},
    entityApiType: 'searchIndexes',
  },

  entity_storedProcedure: {
    name: 'storedProcedure',
    description: 'This is Stored Procedure custom property',
    integerValue: '14',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: {},
    entityApiType: 'storedProcedures',
  },

  entity_table: {
    name: 'table',
    description: 'This is Table custom property',
    integerValue: '45',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: SEARCH_ENTITY_TABLE.table_1,
    entityApiType: 'tables',
  },

  entity_topic: {
    name: 'topic',
    description: 'This is Topic custom property',
    integerValue: '23',
    stringValue: 'This is string propery',
    markdownValue: 'This is markdown value',
    enumConfig: {
      values: ['enum1', 'enum2', 'enum3'],
      multiSelect: false,
    },
    dateFormatConfig: 'yyyy-mm-dd',
    dateTimeFormatConfig: 'yyyy-mm-dd hh:mm:ss',
    entityReferenceConfig: ['User', 'Team'],
    entityObj: SEARCH_ENTITY_TOPIC.topic_1,
    entityApiType: 'topics',
  },
};

export const LOGIN = {
  username: 'admin',
  password: 'admin',
};

// For now skipping the dashboard entity "SEARCH_ENTITY_DASHBOARD.dashboard_1"
export const ANNOUNCEMENT_ENTITIES = [
  SEARCH_ENTITY_TABLE.table_1,
  SEARCH_ENTITY_TOPIC.topic_1,
  SEARCH_ENTITY_PIPELINE.pipeline_1,
];

export const HTTP_CONFIG_SOURCE = {
  DBT_CATALOG_HTTP_PATH:
    'https://raw.githubusercontent.com/OnkarVO7/dbt_git_test/master/catalog.json',
  DBT_MANIFEST_HTTP_PATH:
    'https://raw.githubusercontent.com/OnkarVO7/dbt_git_test/master/manifest.json',
  DBT_RUN_RESULTS_FILE_PATH:
    'https://raw.githubusercontent.com/OnkarVO7/dbt_git_test/master/run_results.json',
};

export const DBT = {
  classification: 'dbtTags',
  tagName: 'model_tag_two',
  dbtQuery: 'select * from "dev"."dbt_jaffle"."stg_orders"',
  dbtLineageNodeLabel: 'customers',
  dbtLineageNode: 'dev.dbt_jaffle.stg_customers',
  dataQualityTest1: 'dbt_utils_equal_rowcount_customers_ref_orders_',
  dataQualityTest2: 'not_null_customers_customer_id',
};

export const API_SERVICE = {
  databaseServices: 'databaseServices',
  messagingServices: 'messagingServices',
  pipelineServices: 'pipelineServices',
  dashboardServices: 'dashboardServices',
  mlmodelServices: 'mlmodelServices',
  storageServices: 'storageServices',
};

export const TEST_CASE = {
  testCaseAlert: `TestCaseAlert-ct-test-${uuid()}`,
  testCaseDescription: 'This is test case alert description',
  dataAsset: 'Test Case',
  filters: 'Test Results === Failed',
};

export const DESTINATION = {
  webhook: {
    name: `webhookAlert-ct-test-${uuid()}`,
    locator: 'Webhook',
    description: 'This is webhook description',
    url: 'http://localhost:8585',
  },
  slack: {
    name: `slackAlert-ct-test-${uuid()}`,
    locator: 'Slack',
    description: 'This is slack description',
    url: 'http://localhost:8585',
  },
  msteams: {
    name: `msteamsAlert-ct-test-${uuid()}`,
    locator: 'MS Teams',
    description: 'This is ms teams description',
    url: 'http://localhost:8585',
  },
};

export const CUSTOM_PROPERTY_INVALID_NAMES = {
  CAPITAL_CASE: 'CapitalCase',
  WITH_UNDERSCORE: 'with_underscore',
  WITH_DOTS: 'with.',
  WITH_SPACE: 'with ',
};

export const CUSTOM_PROPERTY_NAME_VALIDATION_ERROR =
  'Name must start with lower case with no space, underscore, or dots.';

export const TAG_INVALID_NAMES = {
  MIN_LENGTH: 'c',
  MAX_LENGTH: 'a87439625b1c2d3e4f5061728394a5b6c7d8e90a1b2c3d4e5f67890ab',
  WITH_SPECIAL_CHARS: '!@#$%^&*()',
};

export const INVALID_NAMES = {
  MAX_LENGTH:
    'a87439625b1c2d3e4f5061728394a5b6c7d8e90a1b2c3d4e5f67890aba87439625b1c2d3e4f5061728394a5b6c7d8e90a1b2c3d4e5f67890abName can be a maximum of 128 characters',
  WITH_SPECIAL_CHARS: '::normalName::',
};

export const NAME_VALIDATION_ERROR =
  'Name must contain only letters, numbers, underscores, hyphens, periods, parenthesis, and ampersands.';

export const NAME_MIN_MAX_LENGTH_VALIDATION_ERROR =
  'Name size must be between 2 and 64';

export const NAME_MAX_LENGTH_VALIDATION_ERROR =
  'Name can be a maximum of 128 characters';

export const DOMAIN_1 = {
  name: 'Cypress%Domain',
  updatedName: 'Cypress_Domain_Name',
  fullyQualifiedName: 'Cypress%Domain',
  updatedDisplayName: 'Cypress_Domain_Display_Name',
  description:
    'This is the Cypress for testing domain creation with percent and dot',
  updatedDescription:
    'This is the updated description for Cypress for testing domain creation',
  experts: 'Aaron Johnson',
  owner: 'Alex Pollard',
  updatedOwner: 'Aaron Johnson',
  domainType: 'Source-aligned',
  dataProducts: [
    {
      name: 'Cypress.Data.Product1',
      description:
        'This is the data product description for Cypress.Data.Product1',
      experts: 'Aaron Johnson',
      owner: 'Aaron Johnson',
    },
    {
      name: 'Cypress.Data.Product2With%',
      description:
        'This is the data product description for Cypress.Data.Product2With%',
      experts: 'Aaron Johnson',
      owner: 'Aaron Johnson',
    },
  ],
};

export const DOMAIN_2 = {
  name: 'Cypress.Domain.New',
  updatedName: 'Cypress.Domain.New',
  updatedDisplayName: 'Cypress.Domain.New',
  fullyQualifiedName: '"Cypress.Domain.New"',
  description: 'This is the Cypress for testing domain creation',
  experts: 'Alex Pollard',
  owner: 'Alex Pollard',
  domainType: 'Source-aligned',
  dataProducts: [
    {
      name: 'Cypress DataProduct Assets',
      description:
        'This is the data product description for Cypress DataProduct Assets',
      experts: 'Aaron Johnson',
      owner: 'Aaron Johnson',
      assets: [
        {
          name: 'dim_customer',
          fullyQualifiedName: 'sample_data.ecommerce_db.shopify.dim_address',
        },
        {
          name: 'raw_order',
          fullyQualifiedName: 'sample_data.ecommerce_db.shopify.raw_order',
        },
        {
          name: 'presto_etl',
          fullyQualifiedName: 'sample_airflow.presto_etl',
        },
      ],
    },
  ],
  assets: [
    {
      name: 'dim_customer',
      fullyQualifiedName: 'sample_data.ecommerce_db.shopify.dim_address',
    },
    {
      name: 'raw_order',
      fullyQualifiedName: 'sample_data.ecommerce_db.shopify.raw_order',
    },
    {
      name: 'presto_etl',
      fullyQualifiedName: 'sample_airflow.presto_etl',
    },
  ],
};

export const DOMAIN_3 = {
  name: 'Cypress Space',
  updatedName: 'Cypress Space',
  updatedDisplayName: 'Cypress Space',
  fullyQualifiedName: 'Cypress Space',
  description: 'This is the Cypress for testing domain with space creation',
  experts: 'Alex Pollard',
  owner: 'Alex Pollard',
  domainType: 'Source-aligned',
  dataProducts: [
    {
      name: 'Cypress%PercentDP',
      description:
        'This is the data product description for Cypress DataProduct Assets',
      experts: 'Aaron Johnson',
      owner: 'Aaron Johnson',
      assets: [
        {
          name: 'forecast_sales_performance',
          fullyQualifiedName: 'sample_superset.forecast_sales_performance',
        },
        {
          name: 'fact_sale',
          fullyQualifiedName: 'sample_data.ecommerce_db.shopify.fact_sale',
        },
        {
          name: 'operations_view',
          fullyQualifiedName: 'sample_looker.model.operations_view',
        },
      ],
    },
  ],
  assets: [
    {
      name: 'forecast_sales_performance',
      fullyQualifiedName: 'sample_superset.forecast_sales_performance',
    },
    {
      name: 'fact_sale',
      fullyQualifiedName: 'sample_data.ecommerce_db.shopify.fact_sale',
    },
    {
      name: 'operations_view',
      fullyQualifiedName: 'sample_looker.model.operations_view',
    },
  ],
};
export const GLOBAL_SETTING_PERMISSIONS: Record<
  string,
  { testid: GlobalSettingOptions; isCustomProperty?: boolean }
> = {
  metadata: {
    testid: GlobalSettingOptions.METADATA,
  },
  customAttributesTable: {
    testid: GlobalSettingOptions.TABLES,
    isCustomProperty: true,
  },
  customAttributesTopics: {
    testid: GlobalSettingOptions.TOPICS,
    isCustomProperty: true,
  },
  customAttributesDashboards: {
    testid: GlobalSettingOptions.DASHBOARDS,
    isCustomProperty: true,
  },
  customAttributesPipelines: {
    testid: GlobalSettingOptions.PIPELINES,
    isCustomProperty: true,
  },
  customAttributesMlModels: {
    testid: GlobalSettingOptions.MLMODELS,
    isCustomProperty: true,
  },
  bots: {
    testid: GlobalSettingOptions.BOTS,
  },
};
export const ID: Record<
  string,
  { testid: GlobalSettingOptions; button: string; api?: string }
> = {
  teams: {
    testid: GlobalSettingOptions.TEAMS,
    button: 'add-team',
  },
  users: {
    testid: GlobalSettingOptions.USERS,
    button: 'add-user',
    api: '/api/v1/users?*',
  },
  admins: {
    testid: GlobalSettingOptions.ADMINS,
    button: 'add-user',
    api: '/api/v1/users?*',
  },
  databases: {
    testid: GlobalSettingOptions.DATABASES,
    button: 'add-service-button',
    api: '/api/v1/services/databaseServices?*',
  },
  messaging: {
    testid: GlobalSettingOptions.MESSAGING,
    button: 'add-service-button',
    api: '/api/v1/services/messagingServices?*',
  },
  dashboard: {
    testid: GlobalSettingOptions.DASHBOARDS,
    button: 'add-service-button',
    api: '/api/v1/services/dashboardServices?*',
  },
  pipelines: {
    testid: GlobalSettingOptions.PIPELINES,
    button: 'add-service-button',
    api: '/api/v1/services/pipelineServices?*',
  },
  mlmodels: {
    testid: GlobalSettingOptions.MLMODELS,
    button: 'add-service-button',
    api: '/api/v1/services/mlmodelServices?*',
  },
  storage: {
    testid: GlobalSettingOptions.STORAGES,
    button: 'add-service-button',
    api: '/api/v1/services/storageServices?*',
  },
};

export const JWT_EXPIRY_TIME_MAP = {
  '1 hour': 3600,
  '2 hours': 7200,
};
