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

import { Col, Row, Space, Switch, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { isEmpty, isNil } from 'lodash';
import { EntityTags, ServiceTypes } from 'Models';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import DescriptionV1 from '../../components/common/EntityDescription/DescriptionV1';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../components/common/Loader/Loader';
import NextPrevious from '../../components/common/NextPrevious/NextPrevious';
import { NextPreviousProps } from '../../components/common/NextPrevious/NextPrevious.interface';
import ResizablePanels from '../../components/common/ResizablePanels/ResizablePanels';
import EntityRightPanel from '../../components/Entity/EntityRightPanel/EntityRightPanel';
import { PAGE_SIZE } from '../../constants/constants';
import { OperationPermission } from '../../context/PermissionProvider/PermissionProvider.interface';
import { EntityType } from '../../enums/entity.enum';
import { DatabaseService } from '../../generated/entity/services/databaseService';
import { Paging } from '../../generated/type/paging';
import { useFqn } from '../../hooks/useFqn';
import { ServicesType } from '../../interface/service.interface';
import { getServiceMainTabColumns } from '../../utils/ServiceMainTabContentUtils';
import { getEntityTypeFromServiceCategory } from '../../utils/ServiceUtils';
import { getTagsWithoutTier, getTierTags } from '../../utils/TableUtils';
import { createTagObject } from '../../utils/TagsUtils';
import { ServicePageData } from './ServiceDetailsPage';

interface ServiceMainTabContentProps {
  serviceName: string;
  servicePermission: OperationPermission;
  serviceDetails: ServicesType;
  onDescriptionUpdate: (updatedHTML: string) => Promise<void>;
  showDeleted: boolean;
  onShowDeletedChange: (value: boolean) => void;
  data: ServicePageData[];
  isServiceLoading: boolean;
  paging: Paging;
  currentPage: number;
  pagingHandler: NextPreviousProps['pagingHandler'];
  saveUpdatedServiceData: (updatedData: ServicesType) => Promise<void>;
}

function ServiceMainTabContent({
  serviceName,
  servicePermission,
  onDescriptionUpdate,
  showDeleted,
  onShowDeletedChange,
  data,
  isServiceLoading,
  paging,
  pagingHandler,
  currentPage,
  serviceDetails,
  saveUpdatedServiceData,
}: Readonly<ServiceMainTabContentProps>) {
  const { t } = useTranslation();
  const { serviceCategory } = useParams<{
    serviceCategory: ServiceTypes;
  }>();

  const { fqn: serviceFQN } = useFqn();
  const [isEdit, setIsEdit] = useState(false);

  const tier = getTierTags(serviceDetails?.tags ?? []);
  const tags = getTagsWithoutTier(serviceDetails?.tags ?? []);

  /**
   * Formulates updated tags and updates table entity data for API call
   * @param selectedTags
   */
  const onTagUpdate = async (selectedTags?: Array<EntityTags>) => {
    if (selectedTags) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedTable = { ...serviceDetails, tags: updatedTags };
      await saveUpdatedServiceData(updatedTable);
    }
  };

  const handleTagSelection = async (selectedTags: EntityTags[]) => {
    if (selectedTags) {
      const prevTags =
        tags?.filter((tag) =>
          selectedTags
            .map((selTag) => selTag.tagFQN)
            .includes(tag?.tagFQN as string)
        ) || [];
      const newTags = createTagObject(
        selectedTags.filter((tag) => {
          return !prevTags
            ?.map((prevTag) => prevTag.tagFQN)
            .includes(tag.tagFQN);
        })
      );

      await onTagUpdate([...prevTags, ...newTags]);
    }
  };

  const handleDescriptionUpdate = useCallback(async (updatedHTML: string) => {
    try {
      await onDescriptionUpdate(updatedHTML);
    } catch (e) {
      // Error
    } finally {
      setIsEdit(false);
    }
  }, []);

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };

  const onCancel = () => {
    setIsEdit(false);
  };

  const tableColumn: ColumnsType<ServicePageData> = useMemo(
    () => getServiceMainTabColumns(serviceCategory),
    [serviceCategory]
  );

  const entityType = useMemo(
    () => getEntityTypeFromServiceCategory(serviceCategory),
    [serviceCategory]
  );

  const { editTagsPermission, editDescriptionPermission } = useMemo(
    () => ({
      editTagsPermission:
        (servicePermission.EditTags || servicePermission.EditAll) &&
        !serviceDetails.deleted,
      editDescriptionPermission:
        (servicePermission.EditDescription || servicePermission.EditAll) &&
        !serviceDetails.deleted,
    }),
    [servicePermission, serviceDetails]
  );

  return (
    <Row gutter={[0, 16]} wrap={false}>
      <Col className="tab-content-height" span={24}>
        <ResizablePanels
          applyDefaultStyle={false}
          firstPanel={{
            children: (
              <div className="p-t-sm m-x-lg">
                <Row gutter={[16, 16]}>
                  <Col data-testid="description-container" span={24}>
                    <DescriptionV1
                      description={serviceDetails.description}
                      entityFqn={serviceFQN}
                      entityName={serviceName}
                      entityType={entityType}
                      hasEditAccess={editDescriptionPermission}
                      isEdit={isEdit}
                      showActions={!serviceDetails.deleted}
                      showCommentsIcon={false}
                      onCancel={onCancel}
                      onDescriptionEdit={onDescriptionEdit}
                      onDescriptionUpdate={handleDescriptionUpdate}
                    />
                  </Col>
                  <Col span={24}>
                    <Row justify="end">
                      <Col>
                        <Switch
                          checked={showDeleted}
                          data-testid="show-deleted"
                          onClick={onShowDeletedChange}
                        />
                        <Typography.Text className="m-l-xs">
                          {t('label.deleted')}
                        </Typography.Text>{' '}
                      </Col>
                    </Row>
                  </Col>
                  <Col data-testid="table-container" span={24}>
                    <Space
                      className="w-full m-b-md"
                      direction="vertical"
                      size="large">
                      {isServiceLoading ? (
                        <Loader />
                      ) : (
                        <Table
                          bordered
                          columns={tableColumn}
                          data-testid="service-children-table"
                          dataSource={data}
                          locale={{
                            emptyText: <ErrorPlaceHolder className="m-y-md" />,
                          }}
                          pagination={false}
                          rowKey="id"
                          size="small"
                        />
                      )}
                      {Boolean(!isNil(paging.after) || !isNil(paging.before)) &&
                        !isEmpty(data) && (
                          <NextPrevious
                            currentPage={currentPage}
                            pageSize={PAGE_SIZE}
                            paging={paging}
                            pagingHandler={pagingHandler}
                          />
                        )}
                    </Space>
                  </Col>
                </Row>
              </div>
            ),
            minWidth: 800,
            flex: 0.87,
          }}
          secondPanel={{
            children: (
              <div data-testid="entity-right-panel">
                <EntityRightPanel
                  dataProducts={
                    (serviceDetails as DatabaseService)?.dataProducts ?? []
                  }
                  domain={(serviceDetails as DatabaseService)?.domain}
                  editTagPermission={editTagsPermission}
                  entityFQN={serviceFQN}
                  entityId={serviceDetails.id}
                  entityType={entityType}
                  selectedTags={tags}
                  showDataProductContainer={
                    entityType !== EntityType.METADATA_SERVICE
                  }
                  showTaskHandler={false}
                  onTagSelectionChange={handleTagSelection}
                />
              </div>
            ),
            minWidth: 320,
            flex: 0.13,
            className: 'entity-resizable-right-panel-container',
          }}
        />
      </Col>
    </Row>
  );
}

export default ServiceMainTabContent;
