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
import { Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import React, { FC, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getEntityDetailsPath } from '../../../constants/constants';
import { EntityType } from '../../../enums/entity.enum';
import { Container } from '../../../generated/entity/data/container';
import { EntityReference } from '../../../generated/type/entityReference';
import { getEntityName } from '../../../utils/EntityUtils';
import ErrorPlaceHolder from '../../common/ErrorWithPlaceholder/ErrorPlaceHolder';
import RichTextEditorPreviewer from '../../common/RichTextEditor/RichTextEditorPreviewer';
import Table from '../../common/Table/Table';

interface ContainerChildrenProps {
  childrenList: Container['children'];
  isLoading?: boolean;
  fetchChildren: () => void;
}

const ContainerChildren: FC<ContainerChildrenProps> = ({
  childrenList,
  isLoading,
  fetchChildren,
}) => {
  const { t } = useTranslation();

  const columns: ColumnsType<EntityReference> = useMemo(
    () => [
      {
        title: t('label.name'),
        dataIndex: 'name',
        width: 400,
        key: 'name',
        render: (_, record) => (
          <div className="d-inline-flex w-max-90">
            <Link
              className="break-word"
              data-testid="container-name"
              to={getEntityDetailsPath(
                EntityType.CONTAINER,
                record.fullyQualifiedName ?? ''
              )}>
              {getEntityName(record)}
            </Link>
          </div>
        ),
      },
      {
        title: t('label.description'),
        dataIndex: 'description',
        key: 'description',
        render: (description: EntityReference['description']) => (
          <>
            {description ? (
              <RichTextEditorPreviewer markdown={description} />
            ) : (
              <Typography.Text className="text-grey-muted">
                {t('label.no-entity', {
                  entity: t('label.description'),
                })}
              </Typography.Text>
            )}
          </>
        ),
      },
    ],
    []
  );

  useEffect(() => {
    fetchChildren();
  }, []);

  return (
    <Table
      bordered
      columns={columns}
      data-testid="container-list-table"
      dataSource={childrenList}
      loading={isLoading}
      locale={{
        emptyText: <ErrorPlaceHolder className="p-y-md" />,
      }}
      pagination={false}
      rowKey="id"
      size="small"
    />
  );
};

export default ContainerChildren;
