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

import Icon from '@ant-design/icons/lib/components/Icon';
import { Space, Tooltip, Typography } from 'antd';
import classNames from 'classnames';
import React, { useCallback, useMemo, useState } from 'react';
import { ReactComponent as EditIcon } from '../../../../assets/svg/edit-new.svg';
import {
  DE_ACTIVE_COLOR,
  ICON_DIMENSION,
  NO_DATA_PLACEHOLDER,
} from '../../../../constants/constants';
import { usePermissionProvider } from '../../../../context/PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../../../../context/PermissionProvider/PermissionProvider.interface';
import { Operation } from '../../../../generated/entity/policies/policy';
import { formatDate } from '../../../../utils/date-time/DateTimeUtils';
import { getEntityName } from '../../../../utils/EntityUtils';
import { checkPermission } from '../../../../utils/PermissionsUtils';
import AppBadge from '../../../common/Badge/Badge.component';
import { TestCaseStatusModal } from '../../TestCaseStatusModal/TestCaseStatusModal.component';
import '../incident-manager.style.less';
import { TestCaseStatusIncidentManagerProps } from './TestCaseIncidentManagerStatus.interface';
const TestCaseIncidentManagerStatus = ({
  data,
  onSubmit,
  usersList,
}: TestCaseStatusIncidentManagerProps) => {
  const [isEditStatus, setIsEditStatus] = useState<boolean>(false);

  const statusType = useMemo(() => data.testCaseResolutionStatusType, [data]);
  const { permissions } = usePermissionProvider();
  const hasEditPermission = useMemo(() => {
    return checkPermission(
      Operation.EditAll,
      ResourceEntity.TEST_CASE,
      permissions
    );
  }, [permissions]);

  const onEditStatus = useCallback(() => setIsEditStatus(true), []);
  const onCancel = useCallback(() => setIsEditStatus(false), []);

  if (!statusType) {
    return <Typography.Text>{NO_DATA_PLACEHOLDER}</Typography.Text>;
  }

  return (
    <>
      <Tooltip
        placement="bottom"
        title={
          data?.updatedAt &&
          `${formatDate(data.updatedAt)}
                ${data.updatedBy ? 'by ' + getEntityName(data.updatedBy) : ''}`
        }>
        <Space
          align="center"
          data-testid={`${data.testCaseReference?.name}-status`}>
          <AppBadge
            className={classNames('resolution', statusType.toLocaleLowerCase())}
            label={statusType}
          />
          {hasEditPermission && (
            <Icon
              {...ICON_DIMENSION}
              component={EditIcon}
              data-testid="edit-resolution-icon"
              style={{ color: DE_ACTIVE_COLOR }}
              onClick={onEditStatus}
            />
          )}
        </Space>
      </Tooltip>

      {isEditStatus && (
        <TestCaseStatusModal
          data={data}
          open={isEditStatus}
          testCaseFqn={data.testCaseReference?.fullyQualifiedName ?? ''}
          usersList={usersList}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />
      )}
    </>
  );
};

export default TestCaseIncidentManagerStatus;
