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
export enum EntityTypeEndpoint {
  Table = 'tables',
  StoreProcedure = 'storedProcedures',
  Topic = 'topics',
  Dashboard = 'dashboards',
  Pipeline = 'pipelines',
  Container = 'containers',
  MlModel = 'mlmodels',
  Domain = 'domains',
  Glossary = 'glossaries',
  GlossaryTerm = 'glossaryTerms',
  SearchIndex = 'searchIndexes',
  DatabaseService = 'services/databaseServices',
  DashboardService = 'services/dashboardServices',
  StorageService = 'services/storageServices',
  MlModelService = 'services/mlmodelServices',
  PipelineService = 'services/pipelineServices',
  MessagingService = 'services/messagingServices',
  SearchService = 'services/searchServices',
  MetadataService = 'services/metadataServices',
  Database = 'databases',
  DatabaseSchema = 'databaseSchemas',
  DataModel = 'dashboard/datamodels',
  User = 'users',
}

export type EntityDataType = {
  entityName: string;
  entityDetails: unknown;
  endPoint: EntityTypeEndpoint;
};

export enum ENTITY_PATH {
  tables = 'table',
  topics = 'topic',
  dashboards = 'dashboard',
  pipelines = 'pipeline',
  mlmodels = 'mlmodel',
  containers = 'container',
  tags = 'tag',
  glossaries = 'glossary',
  searchIndexes = 'searchIndex',
  storedProcedures = 'storedProcedure',
  glossaryTerm = 'glossaryTerm',
  databases = 'database',
  databaseSchemas = 'databaseSchema',
  'dashboard/datamodels' = 'dashboardDataModel',
}
