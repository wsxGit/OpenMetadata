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

import { Col, Row, Space, Tabs, TabsProps } from 'antd';
import classNames from 'classnames';
import { cloneDeep } from 'lodash';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { FQN_SEPARATOR_CHAR } from '../../../../constants/char.constants';
import { getVersionPath } from '../../../../constants/constants';
import { EntityField } from '../../../../constants/Feeds.constants';
import { EntityTabs, EntityType, FqnPart } from '../../../../enums/entity.enum';
import {
  ChangeDescription,
  Column,
  DashboardDataModel,
} from '../../../../generated/entity/data/dashboardDataModel';
import { TagSource } from '../../../../generated/type/schema';
import { getPartialNameFromTableFQN } from '../../../../utils/CommonUtils';
import {
  getColumnsDataWithVersionChanges,
  getCommonExtraInfoForVersionDetails,
  getEntityVersionByField,
  getEntityVersionTags,
} from '../../../../utils/EntityVersionUtils';
import { CustomPropertyTable } from '../../../common/CustomPropertyTable/CustomPropertyTable';
import DescriptionV1 from '../../../common/EntityDescription/DescriptionV1';
import Loader from '../../../common/Loader/Loader';
import TabsLabel from '../../../common/TabsLabel/TabsLabel.component';
import DataAssetsVersionHeader from '../../../DataAssets/DataAssetsVersionHeader/DataAssetsVersionHeader';
import DataProductsContainer from '../../../DataProducts/DataProductsContainer/DataProductsContainer.component';
import EntityVersionTimeLine from '../../../Entity/EntityVersionTimeLine/EntityVersionTimeLine';
import VersionTable from '../../../Entity/VersionTable/VersionTable.component';
import TagsContainerV2 from '../../../Tag/TagsContainerV2/TagsContainerV2';
import { DataModelVersionProp } from './DataModelVersion.interface';

const DataModelVersion: FC<DataModelVersionProp> = ({
  version,
  currentVersionData,
  isVersionLoading,
  owner,
  domain,
  dataProducts,
  tier,
  slashedDataModelName,
  versionList,
  deleted = false,
  backHandler,
  versionHandler,
  entityPermissions,
}: DataModelVersionProp) => {
  const history = useHistory();
  const { t } = useTranslation();
  const { tab } = useParams<{ tab: EntityTabs }>();
  const [changeDescription, setChangeDescription] = useState<ChangeDescription>(
    currentVersionData.changeDescription as ChangeDescription
  );

  const entityFqn = useMemo(
    () => currentVersionData.fullyQualifiedName ?? '',
    [currentVersionData.fullyQualifiedName]
  );

  const { ownerDisplayName, ownerRef, tierDisplayName, domainDisplayName } =
    useMemo(
      () =>
        getCommonExtraInfoForVersionDetails(
          changeDescription,
          owner,
          tier,
          domain
        ),
      [changeDescription, owner, tier, domain]
    );

  const columns: DashboardDataModel['columns'] = useMemo(() => {
    const colList = cloneDeep(
      (currentVersionData as DashboardDataModel).columns || []
    );

    return getColumnsDataWithVersionChanges<Column>(changeDescription, colList);
  }, [currentVersionData, changeDescription]);

  useEffect(() => {
    setChangeDescription(
      currentVersionData.changeDescription as ChangeDescription
    );
  }, [currentVersionData]);

  const tags = useMemo(() => {
    return getEntityVersionTags(currentVersionData, changeDescription);
  }, [currentVersionData, changeDescription]);

  const description = useMemo(() => {
    return getEntityVersionByField(
      changeDescription,
      EntityField.DESCRIPTION,
      currentVersionData.description
    );
  }, [currentVersionData, changeDescription]);

  const displayName = useMemo(() => {
    return getEntityVersionByField(
      changeDescription,
      EntityField.DISPLAYNAME,
      currentVersionData.displayName
    );
  }, [currentVersionData, changeDescription]);

  const handleTabChange = (activeKey: string) => {
    history.push(
      getVersionPath(
        EntityType.DASHBOARD_DATA_MODEL,
        entityFqn,
        String(version),
        activeKey
      )
    );
  };

  const tabItems: TabsProps['items'] = useMemo(
    () => [
      {
        key: EntityTabs.MODEL,
        label: <TabsLabel id={EntityTabs.MODEL} name={t('label.model')} />,
        children: (
          <Row gutter={[0, 16]} wrap={false}>
            <Col className="p-t-sm m-x-lg" flex="auto">
              <Row gutter={[0, 16]}>
                <Col span={24}>
                  <DescriptionV1
                    description={description}
                    entityType={EntityType.DASHBOARD_DATA_MODEL}
                    showActions={false}
                  />
                </Col>
                <Col span={24}>
                  <VersionTable
                    columnName={getPartialNameFromTableFQN(
                      currentVersionData.fullyQualifiedName ?? '',
                      [FqnPart.Column],
                      FQN_SEPARATOR_CHAR
                    )}
                    columns={columns}
                    joins={[]}
                  />
                </Col>
              </Row>
            </Col>
            <Col
              className="entity-tag-right-panel-container"
              data-testid="entity-right-panel"
              flex="220px">
              <Space className="w-full" direction="vertical" size="large">
                <DataProductsContainer
                  activeDomain={domain}
                  dataProducts={dataProducts ?? []}
                  hasPermission={false}
                />
                {Object.keys(TagSource).map((tagType) => (
                  <TagsContainerV2
                    entityType={EntityType.DASHBOARD_DATA_MODEL}
                    key={tagType}
                    permission={false}
                    selectedTags={tags}
                    tagType={TagSource[tagType as TagSource]}
                  />
                ))}
              </Space>
            </Col>
          </Row>
        ),
      },
      {
        key: EntityTabs.CUSTOM_PROPERTIES,
        label: (
          <TabsLabel
            id={EntityTabs.CUSTOM_PROPERTIES}
            name={t('label.custom-property-plural')}
          />
        ),
        children: (
          <div className="p-md">
            <CustomPropertyTable
              isVersionView
              entityDetails={currentVersionData as DashboardDataModel}
              entityType={EntityType.DASHBOARD_DATA_MODEL}
              hasEditAccess={false}
              hasPermission={entityPermissions.ViewAll}
            />
          </div>
        ),
      },
    ],
    [description, columns, currentVersionData, entityPermissions]
  );

  return (
    <>
      <div data-testid="data-model-version-container">
        {isVersionLoading ? (
          <Loader />
        ) : (
          <div
            className={classNames('version-data')}
            data-testid="version-data">
            <Row gutter={[0, 12]}>
              <Col span={24}>
                <DataAssetsVersionHeader
                  breadcrumbLinks={slashedDataModelName}
                  currentVersionData={currentVersionData}
                  deleted={deleted}
                  displayName={displayName}
                  domainDisplayName={domainDisplayName}
                  entityType={EntityType.DASHBOARD_DATA_MODEL}
                  ownerDisplayName={ownerDisplayName}
                  ownerRef={ownerRef}
                  serviceName={currentVersionData.service?.name}
                  tierDisplayName={tierDisplayName}
                  version={version}
                  onVersionClick={backHandler}
                />
              </Col>
              <Col span={24}>
                <Tabs
                  activeKey={tab ?? EntityTabs.MODEL}
                  items={tabItems}
                  onChange={handleTabChange}
                />
              </Col>
            </Row>
          </div>
        )}

        <EntityVersionTimeLine
          currentVersion={version}
          versionHandler={versionHandler}
          versionList={versionList}
          onBack={backHandler}
        />
      </div>
    </>
  );
};

export default DataModelVersion;
