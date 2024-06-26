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

import Icon from '@ant-design/icons/lib/components/Icon';
import { Badge, Button, Col, Row, Select } from 'antd';
import classNames from 'classnames';
import { startCase } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconCheckboxPrimary } from '../../../../../assets/svg/checkbox-primary.svg';
import {
  BETA_SERVICES,
  excludedService,
  SERVICE_CATEGORY_OPTIONS,
} from '../../../../../constants/Services.constant';
import { ServiceCategory } from '../../../../../enums/service.enum';
import { DatabaseServiceType } from '../../../../../generated/entity/data/database';
import { MetadataServiceType } from '../../../../../generated/entity/services/metadataService';
import { MlModelServiceType } from '../../../../../generated/entity/services/mlmodelService';
import { PipelineServiceType } from '../../../../../generated/entity/services/pipelineService';
import { useApplicationStore } from '../../../../../hooks/useApplicationStore';
import { errorMsg, getServiceLogo } from '../../../../../utils/CommonUtils';
import ServiceUtilClassBase from '../../../../../utils/ServiceUtilClassBase';
import Searchbar from '../../../../common/SearchBarComponent/SearchBar.component';
import './select-service-type.less';
import { SelectServiceTypeProps } from './Steps.interface';

const SelectServiceType = ({
  serviceCategory,
  selectServiceType,
  showError,
  serviceCategoryHandler,
  handleServiceTypeClick,
  onCancel,
  onNext,
}: SelectServiceTypeProps) => {
  const { theme } = useApplicationStore();
  const { t } = useTranslation();
  const [category, setCategory] = useState('');
  const [connectorSearchTerm, setConnectorSearchTerm] = useState('');
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([]);
  const serviceTypes = ServiceUtilClassBase.getSupportedServiceFromList();

  const handleConnectorSearchTerm = (value: string) => {
    setConnectorSearchTerm(value);
    setSelectedConnectors(
      serviceTypes[serviceCategory].filter((c) =>
        c.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  useEffect(() => {
    const allCategory = Object.values(ServiceCategory);
    const selectedCategory = allCategory.includes(serviceCategory)
      ? serviceCategory
      : allCategory[0];
    setCategory(selectedCategory);
    setSelectedConnectors(
      serviceTypes[selectedCategory].filter(
        (service) => !excludedService.find((e) => e === service)
      )
    );
  }, [serviceCategory]);

  const filteredConnectors = useMemo(
    () =>
      selectedConnectors.filter(
        (connectorType) =>
          !excludedService.includes(
            connectorType as MlModelServiceType | MetadataServiceType
          )
      ),
    [selectedConnectors]
  );

  const getServiceName = (type: string) => {
    if (type.includes('Custom')) {
      return startCase(type);
    } else if (type === PipelineServiceType.GluePipeline) {
      return 'Glue Pipeline';
    }

    return type;
  };

  return (
    <Row>
      <Col span={24}>
        <Select
          className="w-full"
          data-testid="service-category"
          id="serviceCategory"
          options={SERVICE_CATEGORY_OPTIONS}
          value={category}
          onChange={(value) => {
            setConnectorSearchTerm('');
            serviceCategoryHandler(value as ServiceCategory);
          }}
        />
      </Col>
      <Col className="m-t-lg" span={24}>
        <Searchbar
          removeMargin
          placeholder={t('label.search-for-type', {
            type: t('label.connector'),
          })}
          searchValue={connectorSearchTerm}
          typingInterval={500}
          onSearch={handleConnectorSearchTerm}
        />

        <Row className="service-list-container" data-testid="select-service">
          {filteredConnectors.map((type) => (
            <Button
              className={classNames('service-box p-xs d-block border', {
                'border-primary': type === selectServiceType,
              })}
              data-testid={type}
              key={type}
              onClick={() => handleServiceTypeClick(type)}>
              <div data-testid="service-icon">
                {getServiceLogo(type || '', 'h-9')}
              </div>
              <div className="absolute" style={{ right: '4px', top: '0px' }}>
                {type === selectServiceType && (
                  <Icon
                    className="align-middle"
                    component={IconCheckboxPrimary}
                    style={{ fontSize: '14px' }}
                  />
                )}
              </div>
              <p className="w-full text-center m-t-md">
                {getServiceName(type)}
                {BETA_SERVICES.includes(
                  type as DatabaseServiceType | PipelineServiceType
                ) ? (
                  <Badge
                    className="service-beta-tag"
                    color={theme.primaryColor}
                    count={t('label.beta')}
                  />
                ) : null}
              </p>
            </Button>
          ))}
        </Row>

        {showError &&
          errorMsg(
            t('message.field-text-is-required', {
              fieldText: t('label.service'),
            })
          )}
      </Col>

      <Col className="d-flex justify-end mt-12" span={24}>
        <Button
          className="m-r-xs"
          data-testid="previous-button"
          type="link"
          onClick={onCancel}>
          {t('label.cancel')}
        </Button>

        <Button
          className="font-medium p-x-md p-y-xxs h-auto rounded-6"
          data-testid="next-button"
          type="primary"
          onClick={onNext}>
          {t('label.next')}
        </Button>
      </Col>
    </Row>
  );
};

export default SelectServiceType;
