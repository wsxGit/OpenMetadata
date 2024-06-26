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

/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { InfoCircleOutlined } from '@ant-design/icons';
import { Card, Col, Row, Space, Tooltip } from 'antd';
import Input from 'antd/lib/input/Input';
import { get, isEmpty, isNull, isObject } from 'lodash';
import React, { ReactNode, useEffect, useState } from 'react';
import {
  DEF_UI_SCHEMA,
  JWT_CONFIG,
} from '../../../../constants/Services.constant';
import { EntityType } from '../../../../enums/entity.enum';
import { DashboardServiceType } from '../../../../generated/entity/services/dashboardService';
import { DatabaseServiceType } from '../../../../generated/entity/services/databaseService';
import { MessagingServiceType } from '../../../../generated/entity/services/messagingService';
import { MetadataServiceType } from '../../../../generated/entity/services/metadataService';
import { MlModelServiceType } from '../../../../generated/entity/services/mlmodelService';
import { PipelineServiceType } from '../../../../generated/entity/services/pipelineService';
import { SearchServiceType } from '../../../../generated/entity/services/searchService';
import { StorageServiceType } from '../../../../generated/entity/services/storageService';
import { ConfigData } from '../../../../interface/service.interface';
import serviceUtilClassBase from '../../../../utils/ServiceUtilClassBase';

type ServiceConnectionDetailsProps = {
  connectionDetails: ConfigData;
  serviceCategory: string;
  serviceFQN: string;
};

const ServiceConnectionDetails = ({
  connectionDetails,
  serviceCategory,
  serviceFQN,
}: ServiceConnectionDetailsProps) => {
  const [schema, setSchema] = useState({});
  const [data, setData] = useState<ReactNode>();

  const getKeyValues = (
    obj: object,
    schemaPropertyObject: object
  ): ReactNode => {
    const internalRef = '$ref';
    const oneOf = 'oneOf';

    return Object.keys(obj).map((key) => {
      const value = obj[key];

      if (isObject(value)) {
        if (
          serviceCategory.slice(0, -1) === EntityType.PIPELINE_SERVICE &&
          key === 'connection'
        ) {
          const newSchemaPropertyObject = schemaPropertyObject[
            key
          ].oneOf.filter((item) => item.title === `${value.type}Connection`)[0]
            .properties;

          return getKeyValues(value, newSchemaPropertyObject);
        } else if (
          serviceCategory.slice(0, -1) === EntityType.DATABASE_SERVICE &&
          key === 'credentials'
        ) {
          // Condition for GCP Credentials path
          const newSchemaPropertyObject =
            schemaPropertyObject[key].definitions.gcpCredentialsPath;

          return getKeyValues(value, newSchemaPropertyObject);
        } else if (
          serviceCategory.slice(0, -1) === EntityType.DATABASE_SERVICE &&
          key === 'configSource'
        ) {
          if (isObject(value.securityConfig)) {
            if (!value.securityConfig.gcpConfig) {
              if (Object.keys(schemaPropertyObject[key]).includes(oneOf)) {
                if (
                  value.securityConfig?.awsAccessKeyId ||
                  value.securityConfig?.awsSecretAccessKey
                ) {
                  return getKeyValues(
                    value.securityConfig,
                    get(
                      schema,
                      'definitions.S3Config.properties.securityConfig.properties',
                      {}
                    )
                  );
                }
              } else if (
                Object.keys(schemaPropertyObject[key]).includes(internalRef)
              ) {
                const definition = schemaPropertyObject[key][internalRef]
                  .split('/')
                  .splice(2);

                const newSchemaPropertyObject = schema.definitions[definition];

                return getKeyValues(value, newSchemaPropertyObject);
              }
            } else {
              if (isObject(value.securityConfig.gcpConfig)) {
                // Condition for GCP Credentials value
                return getKeyValues(
                  value.securityConfig.gcpConfig,
                  get(
                    schema,
                    'definitions.GCPConfig.properties.securityConfig.definitions.GCPValues.properties',
                    {}
                  )
                );
              } else {
                // Condition for GCP Credentials path

                return getKeyValues(
                  value,
                  get(
                    schema,
                    'definitions.GCPConfig.properties.securityConfig.definitions.gcpCredentialsPath',
                    {}
                  )
                );
              }
            }
          }
        } else if (
          serviceCategory.slice(0, -1) === EntityType.METADATA_SERVICE &&
          key === 'securityConfig'
        ) {
          const newSchemaPropertyObject = schemaPropertyObject[
            key
          ].oneOf.filter((item) => item.title === JWT_CONFIG)[0].properties;

          return getKeyValues(value, newSchemaPropertyObject);
        } else if (
          serviceCategory.slice(0, -1) === EntityType.DASHBOARD_SERVICE &&
          key === 'githubCredentials'
        ) {
          const newSchemaPropertyObject = schemaPropertyObject[key].oneOf.find(
            (item) => item.title === 'GitHubCredentials'
          )?.properties;

          return getKeyValues(value, newSchemaPropertyObject);
        } else {
          return getKeyValues(
            value,
            schemaPropertyObject[key] && schemaPropertyObject[key].properties
              ? schemaPropertyObject[key].properties
              : {}
          );
        }
      } else if (!(key in DEF_UI_SCHEMA) && !isNull(value)) {
        const { description, format, title } = schemaPropertyObject[key]
          ? schemaPropertyObject[key]
          : {};

        return (
          <Col key={key} span={12}>
            <Row>
              <Col className="d-flex items-center" span={8}>
                <Space size={0}>
                  <p className="text-grey-muted m-0">{key || title}:</p>
                  <Tooltip
                    position="bottom"
                    title={description}
                    trigger="hover">
                    <InfoCircleOutlined
                      className="m-x-xss"
                      style={{ color: '#C4C4C4' }}
                    />
                  </Tooltip>
                </Space>
              </Col>
              <Col span={16}>
                <Input
                  readOnly
                  className="w-full border-none"
                  data-testid="input-field"
                  type={format !== 'password' ? 'text' : 'password'}
                  value={value}
                />
              </Col>
            </Row>
          </Col>
        );
      } else {
        return null;
      }
    });
  };

  useEffect(() => {
    switch (serviceCategory.slice(0, -1)) {
      case EntityType.DATABASE_SERVICE:
        setSchema(
          serviceUtilClassBase.getDatabaseServiceConfig(
            serviceFQN as DatabaseServiceType
          ).schema
        );

        break;
      case EntityType.DASHBOARD_SERVICE:
        setSchema(
          serviceUtilClassBase.getDashboardServiceConfig(
            serviceFQN as DashboardServiceType
          ).schema
        );

        break;
      case EntityType.MESSAGING_SERVICE:
        setSchema(
          serviceUtilClassBase.getMessagingServiceConfig(
            serviceFQN as MessagingServiceType
          ).schema
        );

        break;
      case EntityType.PIPELINE_SERVICE:
        setSchema(
          serviceUtilClassBase.getPipelineServiceConfig(
            serviceFQN as PipelineServiceType
          ).schema
        );

        break;
      case EntityType.MLMODEL_SERVICE:
        setSchema(
          serviceUtilClassBase.getMlModelServiceConfig(
            serviceFQN as MlModelServiceType
          ).schema
        );

        break;
      case EntityType.METADATA_SERVICE:
        setSchema(
          serviceUtilClassBase.getMetadataServiceConfig(
            serviceFQN as MetadataServiceType
          ).schema
        );

        break;
      case EntityType.STORAGE_SERVICE:
        setSchema(
          serviceUtilClassBase.getStorageServiceConfig(
            serviceFQN as StorageServiceType
          ).schema
        );

        break;
      case EntityType.SEARCH_SERVICE:
        setSchema(
          serviceUtilClassBase.getSearchServiceConfig(
            serviceFQN as SearchServiceType
          ).schema
        );
    }
  }, [serviceCategory, serviceFQN]);

  useEffect(() => {
    if (!isEmpty(schema)) {
      setData(getKeyValues(connectionDetails, schema.properties));
    }
  }, [schema]);

  return (
    <Card>
      <div
        className="d-flex flex-wrap p-xss"
        data-testid="service-connection-details">
        <Row className="w-full" gutter={[8, 8]}>
          {data}
        </Row>
      </div>
    </Card>
  );
};

export default ServiceConnectionDetails;
