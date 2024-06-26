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
import { Col, Row, Typography } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as IconExternalLink } from '../assets/svg/external-links.svg';
import {
  HELP_ITEMS,
  HELP_ITEMS_ENUM,
  SupportItem,
} from '../constants/Navbar.constants';

const getHelpDropdownLabelContentRenderer = (
  item: SupportItem,
  version?: string
) => {
  return (
    <Row className="cursor-pointer">
      <Col span={4}>
        <Icon
          className="align-middle"
          component={item.icon}
          style={{ fontSize: '18px' }}
        />
      </Col>
      <Col className="flex items-center" span={20}>
        <Typography.Text className="text-base-color">
          {item.label}{' '}
          {item.key === HELP_ITEMS_ENUM.VERSION &&
            (version ?? '?').split('-')[0]}
        </Typography.Text>

        {item.isExternal && (
          <Icon
            className="m-l-xss text-base-color"
            component={IconExternalLink}
            style={{ fontSize: '16px' }}
          />
        )}
      </Col>
    </Row>
  );
};

const getHelpDropdownLabel = (item: SupportItem, version?: string) => {
  if (item.isExternal) {
    return (
      <a
        className="no-underline"
        href={item.link}
        rel="noreferrer"
        target="_blank">
        {getHelpDropdownLabelContentRenderer(item, version)}
      </a>
    );
  } else if (item.link) {
    return (
      <Link className="no-underline" to={item.link}>
        {getHelpDropdownLabelContentRenderer(item)}
      </Link>
    );
  } else {
    return getHelpDropdownLabelContentRenderer(item);
  }
};

export const getHelpDropdownItems = (version?: string) =>
  HELP_ITEMS.map((item) => ({
    label: getHelpDropdownLabel(item, version),
    key: item.key,
  }));
