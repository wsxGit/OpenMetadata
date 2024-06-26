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

import i18next from 'i18next';
import { StepperStepType } from 'Models';
import {
  FilterPattern,
  PipelineType,
} from '../generated/entity/services/ingestionPipelines/ingestionPipeline';

export const STEPS_FOR_ADD_INGESTION: Array<StepperStepType> = [
  {
    name: i18next.t('label.configure-entity', {
      entity: i18next.t('label.ingestion'),
    }),
    step: 1,
  },
  { name: i18next.t('label.schedule-interval'), step: 2 },
];

export const INITIAL_FILTER_PATTERN: FilterPattern = {
  includes: [],
  excludes: [],
};

export const INGESTION_ACTION_TYPE = {
  ADD: 'add',
  EDIT: 'edit',
};

export const PIPELINE_TYPE_LOCALIZATION = {
  [PipelineType.DataInsight]: 'data-insight',
  [PipelineType.Dbt]: 'dbt-lowercase',
  [PipelineType.ElasticSearchReindex]: 'elastic-search-re-index',
  [PipelineType.Lineage]: 'lineage',
  [PipelineType.Metadata]: 'metadata',
  [PipelineType.Profiler]: 'profiler',
  [PipelineType.TestSuite]: 'test-suite',
  [PipelineType.Usage]: 'usage',
  [PipelineType.Application]: 'application',
};

export const DBT_CLASSIFICATION_DEFAULT_VALUE = 'dbtTags';

export const DEFAULT_PARSING_TIMEOUT_LIMIT = 300;
