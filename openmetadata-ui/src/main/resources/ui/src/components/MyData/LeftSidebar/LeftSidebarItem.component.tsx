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
import { Badge, Button, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

interface LeftSidebarItemProps {
  data: {
    key: string;
    label: string;
    dataTestId: string;
    redirect_url?: string;
    icon: SvgComponent;
    isBeta?: boolean;
    onClick?: () => void;
  };
}

const LeftSidebarItem = ({
  data: { label, redirect_url, dataTestId, icon, isBeta, onClick },
}: LeftSidebarItemProps) => {
  const { t } = useTranslation();

  return redirect_url ? (
    <NavLink
      className="left-panel-item no-underline"
      data-testid={dataTestId}
      to={{
        pathname: redirect_url,
      }}>
      <div className="d-flex items-center">
        <Icon component={icon} />
        <Typography.Text className="left-panel-label">{label}</Typography.Text>

        {isBeta && (
          <Badge
            className="service-beta-tag"
            count={t('label.beta')}
            offset={[10, 0]}
            size="small"
          />
        )}
      </div>
    </NavLink>
  ) : (
    <Button
      className="left-panel-item d-flex items-center p-0"
      data-testid={dataTestId}
      type="text"
      onClick={onClick}>
      <Icon component={icon} />
      <Typography.Text className="left-panel-label">{label}</Typography.Text>
    </Button>
  );
};

export default LeftSidebarItem;
