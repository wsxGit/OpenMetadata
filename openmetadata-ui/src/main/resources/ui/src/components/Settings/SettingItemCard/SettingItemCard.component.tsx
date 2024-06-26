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
import Icon from '@ant-design/icons/lib/components/Icon';
import { Card, Typography } from 'antd';
import React, { useCallback } from 'react';
import { SettingMenuItem } from '../../../utils/GlobalSettingsUtils';
import './setting-item-card.style.less';

interface SettingMenuItemProps {
  data: SettingMenuItem;
  onClick: (key: string) => void;
}

const SettingItemCard = ({ data, onClick }: SettingMenuItemProps) => {
  const handleOnClick = useCallback(() => onClick(data.key), []);

  return (
    <Card
      className="setting-card-item"
      data-testid={data.key}
      onClick={handleOnClick}>
      <div className="setting-card-icon-container">
        <Icon className="setting-card-icon" component={data.icon} />
      </div>

      <div className="setting-card-item-content">
        <Typography.Text className="setting-card-title">
          {data.category ?? data.label}
        </Typography.Text>
        <Typography.Paragraph
          className="setting-card-description"
          ellipsis={{ rows: 2 }}>
          {data.description}
        </Typography.Paragraph>
      </div>
    </Card>
  );
};

export default SettingItemCard;
