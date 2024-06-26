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

import { OperationPermission } from '../../../../context/PermissionProvider/PermissionProvider.interface';
import { ServiceCategory } from '../../../../enums/service.enum';
import { PipelineType } from '../../../../generated/api/services/ingestionPipelines/createIngestionPipeline';
import { IngestionPipeline } from '../../../../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { Paging } from '../../../../generated/type/paging';
import { ServicesType } from '../../../../interface/service.interface';

export interface ConnectorConfig {
  username: string;
  password: string;
  host: string;
  database: string;
  includeFilterPattern: Array<string>;
  excludeFilterPattern: Array<string>;
  includeViews: boolean;
  excludeDataProfiler?: boolean;
  enableDataProfiler?: boolean;
}

export interface IngestionProps {
  airflowEndpoint: string;
  serviceDetails: ServicesType;
  serviceName: string;
  serviceCategory: ServiceCategory;
  isRequiredDetailsAvailable: boolean;
  paging: Paging;
  ingestionList: Array<IngestionPipeline>;
  permissions: OperationPermission;
  pipelineNameColWidth?: number;
  pipelineType?: PipelineType;
  displayAddIngestionButton?: boolean;
  containerClassName?: string;
  isLoading?: boolean;
  isAirflowAvailable?: boolean;
  deleteIngestion: (id: string, displayName: string) => Promise<void>;
  deployIngestion: (id: string) => Promise<void>;
  handleEnableDisableIngestion: (id: string) => Promise<void>;
  triggerIngestion: (id: string, displayName: string) => Promise<void>;
  onIngestionWorkflowsUpdate: (
    paging?: Omit<Paging, 'total'>,
    limit?: number
  ) => void;
  handleIngestionDataChange?: (data: Array<IngestionPipeline>) => void;
}

export interface SelectedRowDetails {
  id: string;
  name: string;
  displayName?: string;
  state: string;
}
