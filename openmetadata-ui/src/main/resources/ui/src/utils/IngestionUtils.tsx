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

import { Typography } from 'antd';
import { ExpandableConfig } from 'antd/lib/table/interface';
import { t } from 'i18next';
import { isUndefined, startCase } from 'lodash';
import { ServiceTypes } from 'Models';
import React from 'react';
import ErrorPlaceHolder from '../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import ConnectionStepCard from '../components/common/TestConnection/ConnectionStepCard/ConnectionStepCard';
import { getServiceDetailsPath } from '../constants/constants';
import {
  DATA_INSIGHTS_PIPELINE_DOCS,
  ELASTIC_SEARCH_RE_INDEX_PIPELINE_DOCS,
  INGESTION_FRAMEWORK_DEPLOYMENT_DOCS,
  WORKFLOWS_METADATA_DOCS,
} from '../constants/docs.constants';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../constants/GlobalSettings.constants';
import {
  INGESTION_ACTION_TYPE,
  PIPELINE_TYPE_LOCALIZATION,
} from '../constants/Ingestions.constant';
import { ERROR_PLACEHOLDER_TYPE } from '../enums/common.enum';
import { ELASTIC_SEARCH_RE_INDEX_PAGE_TABS } from '../enums/ElasticSearch.enum';
import { FormSubmitType } from '../enums/form.enum';
import { PipelineType } from '../generated/api/services/ingestionPipelines/createIngestionPipeline';
import { UIThemePreference } from '../generated/configuration/uiThemePreference';
import { HiveMetastoreConnection as Connection } from '../generated/entity/services/databaseService';
import {
  IngestionPipeline,
  StepSummary,
} from '../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { Connection as MetadataConnection } from '../generated/entity/services/metadataService';
import { SearchSourceAlias } from '../interface/search.interface';
import { DataObj, ServicesType } from '../interface/service.interface';
import { Transi18next } from './CommonUtils';
import { getSettingPath, getSettingsPathWithFqn } from './RouterUtils';
import serviceUtilClassBase from './ServiceUtilClassBase';
import { getServiceRouteFromServiceType } from './ServiceUtils';

export const getIngestionHeadingName = (
  ingestionType: string,
  type: string
) => {
  const ingestionName = t(
    `label.${
      PIPELINE_TYPE_LOCALIZATION[
        ingestionType as keyof typeof PIPELINE_TYPE_LOCALIZATION
      ]
    }`
  );

  return type === INGESTION_ACTION_TYPE.ADD
    ? t('label.add-workflow-ingestion', {
        workflow: ingestionName,
      })
    : t('label.edit-workflow-ingestion', {
        workflow: ingestionName,
      });
};

export const getSettingsPathFromPipelineType = (pipelineType: string) => {
  switch (pipelineType) {
    case PipelineType.DataInsight: {
      return getSettingPath(
        GlobalSettingsMenuCategory.PREFERENCES,
        GlobalSettingOptions.DATA_INSIGHT
      );
    }
    case PipelineType.ElasticSearchReindex:
    default: {
      return getSettingsPathWithFqn(
        GlobalSettingsMenuCategory.PREFERENCES,
        GlobalSettingOptions.SEARCH,
        ELASTIC_SEARCH_RE_INDEX_PAGE_TABS.SCHEDULE
      );
    }
  }
};

export const getBreadCrumbsArray = (
  isSettingsPipeline: boolean,
  ingestionType: string,
  serviceCategory: string,
  serviceFQN: string,
  type: string,
  serviceData?: DataObj
) => {
  const breadCrumbsArray = [];

  if (isSettingsPipeline) {
    breadCrumbsArray.push({
      name: startCase(ingestionType),
      url: getSettingsPathFromPipelineType(ingestionType),
      activeTitle: true,
    });
  } else {
    breadCrumbsArray.push(
      ...[
        {
          name: startCase(serviceCategory),
          url: getSettingPath(
            GlobalSettingsMenuCategory.SERVICES,
            getServiceRouteFromServiceType(serviceCategory as ServiceTypes)
          ),
        },
        {
          name: serviceData?.name || '',
          url: getServiceDetailsPath(serviceFQN, serviceCategory, 'ingestions'),
          imgSrc: serviceUtilClassBase.getServiceTypeLogo(
            serviceData as SearchSourceAlias
          ),
          activeTitle: true,
        },
      ]
    );
  }

  breadCrumbsArray.push({
    name: getIngestionHeadingName(ingestionType, type),
    url: '',
    activeTitle: true,
  });

  return breadCrumbsArray;
};

export const getSupportedPipelineTypes = (serviceDetails: ServicesType) => {
  let pipelineType = [];
  const config = serviceDetails?.connection?.config as Connection;
  if (config) {
    config?.supportsMetadataExtraction &&
      pipelineType.push(PipelineType.Metadata);
    config?.supportsUsageExtraction && pipelineType.push(PipelineType.Usage);
    config?.supportsLineageExtraction &&
      pipelineType.push(PipelineType.Lineage);
    config?.supportsProfiler && pipelineType.push(PipelineType.Profiler);
    config?.supportsDBTExtraction && pipelineType.push(PipelineType.Dbt);
    (config as MetadataConnection)?.supportsDataInsightExtraction &&
      pipelineType.push(PipelineType.DataInsight);
    (config as MetadataConnection)?.supportsElasticSearchReindexingExtraction &&
      pipelineType.push(PipelineType.ElasticSearchReindex);
  } else {
    pipelineType = [
      PipelineType.Metadata,
      PipelineType.Usage,
      PipelineType.Lineage,
      PipelineType.Profiler,
      PipelineType.Dbt,
    ];
  }

  return pipelineType;
};

export const getIngestionTypes = (
  supportedPipelineTypes: PipelineType[],
  isOpenMetadataService: boolean,
  ingestionList: IngestionPipeline[],
  pipelineType?: PipelineType
) => {
  const pipelineTypeArray = isUndefined(pipelineType)
    ? supportedPipelineTypes
    : [pipelineType];

  if (isOpenMetadataService || ingestionList.length > 0) {
    return pipelineTypeArray.reduce((prev, curr) => {
      if (
        // Prevent adding multiple usage pipeline
        curr === PipelineType.Usage &&
        ingestionList.find((d) => d.pipelineType === curr)
      ) {
        return prev;
      } else {
        return [...prev, curr];
      }
    }, [] as PipelineType[]);
  }

  return [
    PipelineType.Metadata,
    PipelineType.Usage,
    PipelineType.Lineage,
    PipelineType.Profiler,
    PipelineType.Dbt,
  ];
};

const getPipelineExtraInfo = (
  isPlatFormDisabled: boolean,
  theme: UIThemePreference['customTheme'],
  pipelineType?: PipelineType
) => {
  switch (pipelineType) {
    case PipelineType.DataInsight:
      return (
        <>
          <Typography.Paragraph className="w-max-500">
            <Transi18next
              i18nKey="message.data-insight-pipeline-description"
              renderElement={
                <a
                  href={DATA_INSIGHTS_PIPELINE_DOCS}
                  rel="noreferrer"
                  style={{ color: theme.primaryColor }}
                  target="_blank"
                />
              }
              values={{
                link: t('label.data-insight-ingestion'),
              }}
            />
          </Typography.Paragraph>
        </>
      );
    case PipelineType.ElasticSearchReindex:
      return (
        <>
          <Typography.Paragraph className="w-max-500">
            <Transi18next
              i18nKey="message.elastic-search-re-index-pipeline-description"
              renderElement={
                <a
                  href={ELASTIC_SEARCH_RE_INDEX_PIPELINE_DOCS}
                  rel="noreferrer"
                  style={{ color: theme.primaryColor }}
                  target="_blank"
                />
              }
              values={{
                link: t('label.search-index-ingestion'),
              }}
            />
          </Typography.Paragraph>
        </>
      );
    default:
      return (
        <Typography.Paragraph className="w-max-500">
          <Transi18next
            i18nKey={
              isPlatFormDisabled
                ? 'message.pipeline-disabled-ingestion-deployment'
                : 'message.no-ingestion-description'
            }
            renderElement={
              <a
                href={
                  isPlatFormDisabled
                    ? INGESTION_FRAMEWORK_DEPLOYMENT_DOCS
                    : WORKFLOWS_METADATA_DOCS
                }
                rel="noreferrer"
                style={{ color: theme.primaryColor }}
                target="_blank"
              />
            }
            values={{
              link: t(
                `label.${
                  isPlatFormDisabled
                    ? 'documentation-lowercase'
                    : 'metadata-ingestion'
                }`
              ),
            }}
          />
        </Typography.Paragraph>
      );
  }
};

export const getErrorPlaceHolder = (
  isRequiredDetailsAvailable: boolean,
  ingestionDataLength: number,
  isPlatFormDisabled: boolean,
  theme: UIThemePreference['customTheme'],
  pipelineType?: PipelineType
) => {
  if (isRequiredDetailsAvailable && ingestionDataLength === 0) {
    return (
      <ErrorPlaceHolder className="p-y-lg" type={ERROR_PLACEHOLDER_TYPE.CUSTOM}>
        {getPipelineExtraInfo(isPlatFormDisabled, theme, pipelineType)}
      </ErrorPlaceHolder>
    );
  }

  return null;
};

export const getMenuItems = (
  types: PipelineType[],
  isDataSightIngestionExists: boolean
) => {
  return types.map((type) => ({
    label: t('label.add-workflow-ingestion', {
      workflow: t(`label.${PIPELINE_TYPE_LOCALIZATION[type]}`),
    }),
    key: type,
    disabled:
      type === PipelineType.DataInsight ? isDataSightIngestionExists : false,
    ['data-testid']: 'list-item',
  }));
};

export const getIngestionButtonText = (
  hasMetadata?: IngestionPipeline,
  pipelineType?: PipelineType
) => {
  if (hasMetadata) {
    return t('label.add-entity', {
      entity: t('label.ingestion-lowercase'),
    });
  } else {
    return pipelineType === PipelineType.ElasticSearchReindex
      ? t('label.deploy')
      : t('label.add-workflow-ingestion', {
          workflow: startCase(
            pipelineType ? pipelineType : t(`label.${PipelineType.Metadata}`)
          ),
        });
  }
};

export const getSuccessMessage = (
  ingestionName: string,
  status: FormSubmitType,
  showDeployButton?: boolean
) => {
  const updateMessage = showDeployButton
    ? t('message.action-has-been-done-but-failed-to-deploy', {
        action: t('label.updated-lowercase'),
      })
    : t('message.action-has-been-done-but-deploy-successfully', {
        action: t('label.updated-lowercase'),
      });
  const createMessage = showDeployButton
    ? t('message.action-has-been-done-but-failed-to-deploy', {
        action: t('label.created-lowercase'),
      })
    : t('message.action-has-been-done-but-deploy-successfully', {
        action: t('label.created-lowercase'),
      });

  return (
    <Typography.Text>
      <Typography.Text className="font-medium">{`"${ingestionName}"`}</Typography.Text>
      <Typography.Text>
        {status === FormSubmitType.ADD ? createMessage : updateMessage}
      </Typography.Text>
    </Typography.Text>
  );
};

export const getExpandableStatusRow = (
  expandedKeys: Array<string>
): ExpandableConfig<StepSummary> => ({
  expandedRowRender: (record) => {
    return (
      record.failures?.map((failure) => (
        <ConnectionStepCard
          isTestingConnection={false}
          key={failure.name}
          testConnectionStep={{
            name: failure.name,
            mandatory: false,
            description: failure.error,
          }}
          testConnectionStepResult={{
            name: failure.name,
            passed: false,
            mandatory: false,
            message: failure.error,
            errorLog: failure.stackTrace,
          }}
        />
      )) ?? []
    );
  },
  indentSize: 0,
  expandIcon: () => null,
  expandedRowKeys: expandedKeys,
  rowExpandable: (record) => (record.failures?.length ?? 0) > 0,
});
