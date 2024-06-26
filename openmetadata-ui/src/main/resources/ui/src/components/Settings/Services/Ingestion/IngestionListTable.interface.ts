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

import {
  IngestionServicePermission,
  OperationPermission,
} from '../../../../context/PermissionProvider/PermissionProvider.interface';
import { ServiceCategory } from '../../../../enums/service.enum';
import { PipelineType } from '../../../../generated/api/services/ingestionPipelines/createIngestionPipeline';
import { IngestionPipeline } from '../../../../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { Paging } from '../../../../generated/type/paging';
import { SelectedRowDetails } from './ingestion.interface';

export interface IngestionListTableProps {
  airflowEndpoint: string;
  deleteSelection: SelectedRowDetails;
  ingestionData: Array<IngestionPipeline>;
  isRequiredDetailsAvailable: boolean;
  isLoading?: boolean;
  paging: Paging;
  permissions: OperationPermission;
  pipelineType?: PipelineType;
  pipelineNameColWidth?: number;
  serviceCategory: ServiceCategory;
  serviceName: string;
  ingestionPipelinesPermission?: IngestionServicePermission;
  deployIngestion: (id: string) => Promise<void>;
  handleDeleteSelection: (row: SelectedRowDetails) => void;
  handleEnableDisableIngestion: (id: string) => Promise<void>;
  handleIsConfirmationModalOpen: (value: boolean) => void;
  onIngestionWorkflowsUpdate: (
    paging?: Omit<Paging, 'total'>,
    limit?: number
  ) => void;
  triggerIngestion: (id: string, displayName: string) => Promise<void>;
}
