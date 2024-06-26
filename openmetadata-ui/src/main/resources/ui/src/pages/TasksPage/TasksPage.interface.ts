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

import { Container } from '../../generated/entity/data/container';
import { Dashboard } from '../../generated/entity/data/dashboard';
import { DashboardDataModel } from '../../generated/entity/data/dashboardDataModel';
import { Database } from '../../generated/entity/data/database';
import { DatabaseSchema } from '../../generated/entity/data/databaseSchema';
import { Glossary } from '../../generated/entity/data/glossary';
import { GlossaryTerm } from '../../generated/entity/data/glossaryTerm';
import { Mlmodel } from '../../generated/entity/data/mlmodel';
import { Pipeline } from '../../generated/entity/data/pipeline';
import { SearchIndex } from '../../generated/entity/data/searchIndex';
import { StoredProcedure } from '../../generated/entity/data/storedProcedure';
import { Table } from '../../generated/entity/data/table';
import { Topic } from '../../generated/entity/data/topic';

export type EntityData =
  | Table
  | Topic
  | Dashboard
  | Pipeline
  | Mlmodel
  | Container
  | StoredProcedure
  | Database
  | DatabaseSchema
  | DashboardDataModel
  | SearchIndex
  | Glossary
  | GlossaryTerm;

export interface Option {
  label: string;
  value: string;
  type: string;
  name?: string;
  displayName?: string;
  children?: string;
  'data-label'?: string;
  'data-testid'?: string;
  'data-usertype'?: string;
}

export interface TaskAction {
  label: string;
  key: string;
}

export enum TaskActionMode {
  VIEW = 'view',
  EDIT = 'edit',
  RE_ASSIGN = 're-assign',
  RESOLVE = 'resolve',
}

export enum TaskTabs {
  CURRENT = 'current',
  DIFF = 'diff',
  NEW = 'new',
}
