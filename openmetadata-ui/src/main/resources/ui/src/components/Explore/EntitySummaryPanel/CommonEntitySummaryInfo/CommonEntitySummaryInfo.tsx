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
import { Col, Row, Typography } from 'antd';
import classNames from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ReactComponent as IconExternalLink } from '../../../../assets/svg/external-links.svg';
import { ICON_DIMENSION } from '../../../../constants/constants';
import { CommonEntitySummaryInfoProps } from './CommonEntitySummaryInfo.interface';

function CommonEntitySummaryInfo({
  entityInfo,
  componentType,
}: CommonEntitySummaryInfoProps) {
  const { t } = useTranslation();

  return (
    <Row gutter={[0, 4]}>
      {entityInfo.map((info) => {
        const isOwner = info.name === t('label.owner');

        return info.visible?.includes(componentType) ? (
          <Col key={info.name} span={24}>
            <Row
              className={classNames('', {
                'p-b-md': isOwner,
              })}
              gutter={[16, 32]}>
              {!isOwner ? (
                <Col span={8}>
                  <Typography.Text
                    className="summary-item-key text-grey-muted"
                    data-testid={`${info.name}-label`}>
                    {info.name}
                  </Typography.Text>
                </Col>
              ) : null}
              <Col span={16}>
                {info.isLink ? (
                  <Link
                    component={Typography.Link}
                    data-testid={`${info.name}-value`}
                    target={info.isExternal ? '_blank' : '_self'}
                    to={{ pathname: info.url }}>
                    {info.value}
                    {info.isExternal ? (
                      <Icon
                        className="m-l-xs"
                        component={IconExternalLink}
                        data-testid="external-link-icon"
                        style={ICON_DIMENSION}
                      />
                    ) : null}
                  </Link>
                ) : (
                  <Typography.Text
                    className={classNames(
                      'summary-item-value text-grey-muted',
                      {
                        'text-grey-body': !isOwner,
                      }
                    )}
                    data-testid={`${info.name}-value`}>
                    {info.value}
                  </Typography.Text>
                )}
              </Col>
            </Row>
          </Col>
        ) : null;
      })}
    </Row>
  );
}

export default CommonEntitySummaryInfo;
