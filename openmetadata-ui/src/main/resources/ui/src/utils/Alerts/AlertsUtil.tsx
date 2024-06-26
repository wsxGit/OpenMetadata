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

import { Checkbox, Col, Input, Select, Switch, Tooltip } from 'antd';
import Form, { RuleObject } from 'antd/lib/form';
import { AxiosError } from 'axios';
import i18next, { t } from 'i18next';
import { isEqual, isUndefined, map, startCase, uniqBy } from 'lodash';
import React from 'react';
import { ReactComponent as AllActivityIcon } from '../../assets/svg/all-activity.svg';
import { ReactComponent as MailIcon } from '../../assets/svg/ic-mail.svg';
import { ReactComponent as MSTeamsIcon } from '../../assets/svg/ms-teams.svg';
import { ReactComponent as SlackIcon } from '../../assets/svg/slack.svg';
import { ReactComponent as WebhookIcon } from '../../assets/svg/webhook.svg';
import { AsyncSelect } from '../../components/common/AsyncSelect/AsyncSelect';
import {
  DESTINATION_DROPDOWN_TABS,
  DESTINATION_SOURCE_ITEMS,
  DESTINATION_TYPE_BASED_PLACEHOLDERS,
  EXTERNAL_CATEGORY_OPTIONS,
} from '../../constants/Alerts.constants';
import { HTTP_STATUS_CODE } from '../../constants/Auth.constants';
import { PAGE_SIZE_LARGE } from '../../constants/constants';
import { SearchIndex } from '../../enums/search.enum';
import { StatusType } from '../../generated/entity/data/pipeline';
import { PipelineState } from '../../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { CreateEventSubscription } from '../../generated/events/api/createEventSubscription';
import {
  EventFilterRule,
  EventSubscription,
  InputType,
  SubscriptionCategory,
  SubscriptionType,
} from '../../generated/events/eventSubscription';
import { TestCaseStatus } from '../../generated/tests/testCase';
import { EventType } from '../../generated/type/changeEvent';
import TeamAndUserSelectItem from '../../pages/AddObservabilityPage/DestinationFormItem/TeamAndUserSelectItem/TeamAndUserSelectItem';
import { searchData } from '../../rest/miscAPI';
import { getEntityName, getEntityNameLabel } from '../EntityUtils';
import { getConfigFieldFromDestinationType } from '../ObservabilityUtils';
import searchClassBase from '../SearchClassBase';
import { getEntityIcon } from '../TableUtils';
import { showErrorToast, showSuccessToast } from '../ToastUtils';

export const getAlertsActionTypeIcon = (type?: SubscriptionType) => {
  switch (type) {
    case SubscriptionType.Slack:
      return <SlackIcon height={16} width={16} />;
    case SubscriptionType.MSTeams:
      return <MSTeamsIcon height={16} width={16} />;
    case SubscriptionType.Email:
      return <MailIcon height={16} width={16} />;
    case SubscriptionType.ActivityFeed:
      return <AllActivityIcon height={16} width={16} />;
    case SubscriptionType.Webhook:
    default:
      return <WebhookIcon height={16} width={16} />;
  }
};

export const getFunctionDisplayName = (func: string): string => {
  switch (func) {
    case 'matchAnyEntityFqn':
      return i18next.t('label.fqn-uppercase');
    case 'matchAnyOwnerName':
      return i18next.t('label.owner');
    case 'matchAnyEventType':
      return i18next.t('label.event-type');
    case 'matchTestResult':
      return i18next.t('label.test-entity', {
        entity: i18next.t('label.result-plural'),
      });
    case 'matchUpdatedBy':
      return i18next.t('label.updated-by');
    case 'matchAnyFieldChange':
      return i18next.t('label.field-change');
    case 'matchPipelineState':
      return i18next.t('label.pipeline-state');
    case 'matchIngestionPipelineState':
      return i18next.t('label.pipeline-state');
    case 'matchAnySource':
      return i18next.t('label.source-match');
    case 'matchAnyEntityId':
      return i18next.t('label.entity-id-match');
    default:
      return '';
  }
};

/**
 *
 * @param name Field name used to identify which field has error
 * @param minLengthRequired how many item should be there in the list
 * @returns If validation failed throws an error else resolve
 */
export const listLengthValidator =
  <T,>(name: string, minLengthRequired = 1) =>
  async (_: RuleObject, list: T[]) => {
    if (!list || list.length < minLengthRequired) {
      return Promise.reject(
        new Error(
          i18next.t('message.length-validator-error', {
            length: minLengthRequired,
            field: name,
          })
        )
      );
    }

    return Promise.resolve();
  };

export const getAlertActionTypeDisplayName = (
  alertActionType: SubscriptionType
) => {
  switch (alertActionType) {
    case SubscriptionType.ActivityFeed:
      return i18next.t('label.activity-feed-plural');
    case SubscriptionType.Email:
      return i18next.t('label.email');
    case SubscriptionType.Webhook:
      return i18next.t('label.webhook');
    case SubscriptionType.Slack:
      return i18next.t('label.slack');
    case SubscriptionType.MSTeams:
      return i18next.t('label.ms-team-plural');
    case SubscriptionType.GChat:
      return i18next.t('label.g-chat');
    default:
      return '';
  }
};

export const getDisplayNameForEntities = (entity: string) => {
  switch (entity) {
    case 'kpi':
      return i18next.t('label.kpi-uppercase');
    case 'mlmodel':
      return i18next.t('label.ml-model');
    default:
      return startCase(entity);
  }
};

export const EDIT_LINK_PATH = `/settings/notifications/edit-alert`;
export const EDIT_DATA_INSIGHT_REPORT_PATH = `/settings/notifications/edit-data-insight-report`;

export const searchEntity = async ({
  searchText,
  searchIndex,
  filters,
  showDisplayNameAsLabel = true,
  setSourceAsValue = false,
}: {
  searchText: string;
  searchIndex: SearchIndex | SearchIndex[];
  filters?: string;
  showDisplayNameAsLabel?: boolean;
  setSourceAsValue?: boolean;
}) => {
  try {
    const response = await searchData(
      searchText,
      1,
      PAGE_SIZE_LARGE,
      filters ?? '',
      '',
      '',
      searchIndex
    );
    const searchIndexEntityTypeMapping =
      searchClassBase.getSearchIndexEntityTypeMapping();

    return uniqBy(
      response.data.hits.hits.map((d) => {
        // Providing an option to hide display names, for inputs like 'fqnList',
        // where users can input text alongside selection options.
        // This helps avoid displaying the same option twice
        // when using regular expressions as inputs in the same field.
        const displayName = showDisplayNameAsLabel
          ? getEntityName(d._source)
          : d._source.fullyQualifiedName ?? '';

        const value = setSourceAsValue
          ? JSON.stringify({
              ...d._source,
              type: searchIndexEntityTypeMapping[d._index],
            })
          : d._source.fullyQualifiedName ?? '';

        return {
          label: displayName,
          value,
        };
      }),
      'label'
    );
  } catch (error) {
    return [];
  }
};

const getTableSuggestions = async (searchText: string) => {
  return searchEntity({
    searchText,
    searchIndex: SearchIndex.TABLE,
    showDisplayNameAsLabel: false,
  });
};

const getTestSuiteSuggestions = async (searchText: string) => {
  return searchEntity({ searchText, searchIndex: SearchIndex.TEST_SUITE });
};

const getDomainOptions = async (searchText: string) => {
  return searchEntity({ searchText, searchIndex: SearchIndex.DOMAIN });
};

const getOwnerOptions = async (searchText: string) => {
  return searchEntity({
    searchText,
    searchIndex: [SearchIndex.TEAM, SearchIndex.USER],
    filters: 'isBot:false',
  });
};

const getUserOptions = async (searchText: string) => {
  return searchEntity({
    searchText,
    searchIndex: SearchIndex.USER,
    filters: 'isBot:false',
  });
};

const getUserBotOptions = async (searchText: string) => {
  return searchEntity({
    searchText,
    searchIndex: SearchIndex.USER,
  });
};

const getTeamOptions = async (searchText: string) => {
  return searchEntity({ searchText, searchIndex: SearchIndex.TEAM });
};

const getSelectOptionsFromEnum = (type: { [s: number]: string }) =>
  map(type, (value) => ({
    label: startCase(value),
    value,
  }));

// Disabling all options except Email for SubscriptionCategory Users, Followers and Admins
// Since there is no provision for webhook subscription for users
export const getSubscriptionTypeOptions = (destinationType: string) => {
  return EXTERNAL_CATEGORY_OPTIONS.map((item) => {
    const isEmailType = isEqual(item.value, SubscriptionType.Email);
    const shouldDisable =
      isEqual(destinationType, SubscriptionCategory.Users) ||
      isEqual(destinationType, SubscriptionCategory.Followers) ||
      isEqual(destinationType, SubscriptionCategory.Admins);

    return {
      ...item,
      disabled: !isEmailType && shouldDisable,
    };
  });
};

export const getSupportedFilterOptions = (
  selectedFilters: EventFilterRule[],
  supportedFilters?: EventFilterRule[]
) =>
  supportedFilters?.map((func) => ({
    label: (
      <Tooltip mouseEnterDelay={0.8} title={getEntityName(func)}>
        <span data-testid={`${getEntityName(func)}-filter-option`}>
          {getEntityName(func)}
        </span>
      </Tooltip>
    ),
    value: func.name,
    disabled: selectedFilters?.some((d) => d.name === func.name),
  }));

export const getDestinationConfigField = (
  type: SubscriptionType | SubscriptionCategory,
  fieldName: number
) => {
  switch (type) {
    case SubscriptionType.Slack:
    case SubscriptionType.MSTeams:
    case SubscriptionType.GChat:
    case SubscriptionType.Webhook:
      return (
        <Col span={12}>
          <Form.Item
            name={[fieldName, 'config', 'endpoint']}
            rules={[
              {
                required: true,
                message: t('message.field-text-is-required', {
                  fieldText: t('label.endpoint-url'),
                }),
              },
            ]}>
            <Input
              data-testid={`endpoint-input-${fieldName}`}
              placeholder={DESTINATION_TYPE_BASED_PLACEHOLDERS[type] ?? ''}
            />
          </Form.Item>
        </Col>
      );
    case SubscriptionType.Email:
      return (
        <Col span={12}>
          <Form.Item
            name={[fieldName, 'config', 'receivers']}
            rules={[
              {
                required: true,
                message: t('message.field-text-is-required', {
                  fieldText: t('label.email'),
                }),
              },
            ]}>
            <Select
              className="w-full"
              data-testid={`email-input-${fieldName}`}
              mode="tags"
              open={false}
              placeholder={DESTINATION_TYPE_BASED_PLACEHOLDERS[type] ?? ''}
            />
          </Form.Item>
        </Col>
      );
    case SubscriptionCategory.Teams:
    case SubscriptionCategory.Users:
      return (
        <Col span={12}>
          <Form.Item
            name={[fieldName, 'config', 'receivers']}
            rules={[
              {
                required: true,
                message: t('message.field-text-is-required', {
                  fieldText: t('label.entity-list', {
                    entity: t('label.entity-name', {
                      entity:
                        type === SubscriptionCategory.Teams
                          ? t('label.team')
                          : t('label.user'),
                    }),
                  }),
                }),
              },
            ]}>
            <TeamAndUserSelectItem
              destinationNumber={fieldName}
              entityType={
                type === SubscriptionCategory.Teams
                  ? t('label.team-lowercase')
                  : t('label.user-lowercase')
              }
              fieldName={[fieldName, 'config', 'receivers']}
              onSearch={
                type === SubscriptionCategory.Teams
                  ? getTeamOptions
                  : getUserOptions
              }
            />
          </Form.Item>
        </Col>
      );
    case SubscriptionCategory.Admins:
    case SubscriptionCategory.Owners:
    case SubscriptionCategory.Followers:
      return (
        <Form.Item
          hidden
          initialValue
          name={[fieldName, 'config', getConfigFieldFromDestinationType(type)]}>
          <Switch />
        </Form.Item>
      );
    default:
      return null;
  }
};

export const getMessageFromArgumentName = (argumentName: string) => {
  switch (argumentName) {
    case 'fqnList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.fqn-uppercase'),
        }),
      });
    case 'domainList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.domain'),
        }),
      });
    case 'tableNameList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.entity-name', {
            entity: t('label.table'),
          }),
        }),
      });
    case 'ownerNameList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.entity-name', {
            entity: t('label.owner'),
          }),
        }),
      });
    case 'updateByUserList':
    case 'userList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.entity-name', {
            entity: t('label.user'),
          }),
        }),
      });
    case 'eventTypeList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.entity-name', {
            entity: t('label.event'),
          }),
        }),
      });
    case 'entityIdList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.entity-id', {
            entity: t('label.data-asset'),
          }),
        }),
      });
    case 'pipelineStateList':
    case 'ingestionPipelineStateList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.pipeline-state'),
        }),
      });
    case 'testStatusList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.test-suite-status'),
        }),
      });
    case 'testResultList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.test-case-result'),
        }),
      });
    case 'testSuiteList':
      return t('message.field-text-is-required', {
        fieldText: t('label.entity-list', {
          entity: t('label.test-suite'),
        }),
      });
    default:
      return '';
  }
};

export const getFieldByArgumentType = (
  fieldName: number,
  argument: string,
  index: number,
  selectedTrigger: string
) => {
  let field: JSX.Element;

  const getEntityByFQN = async (searchText: string) => {
    const searchIndexMapping =
      searchClassBase.getEntityTypeSearchIndexMapping();

    return searchEntity({
      searchText,
      searchIndex: searchIndexMapping[selectedTrigger],
      showDisplayNameAsLabel: false,
    });
  };

  switch (argument) {
    case 'fqnList':
      field = (
        <AsyncSelect
          api={getEntityByFQN}
          className="w-full"
          data-testid="fqn-list-select"
          maxTagTextLength={45}
          mode="tags"
          optionFilterProp="label"
          placeholder={t('label.search-by-type', {
            type: t('label.fqn-uppercase'),
          })}
          showArrow={false}
        />
      );

      break;

    case 'domainList':
      field = (
        <AsyncSelect
          api={getDomainOptions}
          className="w-full"
          data-testid="domain-select"
          mode="multiple"
          placeholder={t('label.search-by-type', {
            type: t('label.domain-lowercase'),
          })}
        />
      );

      break;

    case 'tableNameList':
      field = (
        <AsyncSelect
          api={getTableSuggestions}
          className="w-full"
          data-testid="table-name-select"
          maxTagTextLength={45}
          mode="tags"
          optionFilterProp="label"
          placeholder={t('label.search-by-type', {
            type: t('label.table-lowercase'),
          })}
        />
      );

      break;

    case 'ownerNameList':
      field = (
        <AsyncSelect
          api={getOwnerOptions}
          className="w-full"
          data-testid="owner-name-select"
          mode="multiple"
          placeholder={t('label.search-by-type', {
            type: t('label.owner-lowercase'),
          })}
        />
      );

      break;

    case 'updateByUserList':
    case 'userList':
      field = (
        <AsyncSelect
          api={
            argument === 'updateByUserList'
              ? getUserBotOptions // For updateByUserList, we need to show bot users as well
              : getUserOptions // For userList, which is an argument for `conversation` filters we need to show only non-bot users
          }
          className="w-full"
          data-testid="user-name-select"
          mode="multiple"
          placeholder={t('label.search-by-type', {
            type: t('label.user'),
          })}
        />
      );

      break;

    case 'eventTypeList':
      field = (
        <Select
          className="w-full"
          data-testid="event-type-select"
          mode="multiple"
          options={getSelectOptionsFromEnum(EventType)}
          placeholder={t('label.search-by-type', {
            type: t('label.event-type-lowercase'),
          })}
        />
      );

      break;

    case 'entityIdList':
      field = (
        <Select
          className="w-full"
          data-testid="entity-id-select"
          mode="tags"
          open={false}
          placeholder={t('label.search-by-type', {
            type: t('label.entity-id', {
              entity: t('label.data-asset'),
            }),
          })}
        />
      );

      break;

    case 'pipelineStateList':
      field = (
        <Select
          className="w-full"
          data-testid="pipeline-status-select"
          mode="multiple"
          options={getSelectOptionsFromEnum(StatusType)}
          placeholder={t('label.select-field', {
            field: t('label.pipeline-state'),
          })}
        />
      );

      break;

    case 'ingestionPipelineStateList':
      field = (
        <Select
          className="w-full"
          data-testid="pipeline-status-select"
          mode="multiple"
          options={getSelectOptionsFromEnum(PipelineState)}
          placeholder={t('label.select-field', {
            field: t('label.pipeline-state'),
          })}
        />
      );

      break;

    case 'testStatusList':
      field = (
        <Select
          className="w-full"
          data-testid="test-status-select"
          mode="multiple"
          options={getSelectOptionsFromEnum(TestCaseStatus)}
          placeholder={t('label.select-field', {
            field: t('label.test-suite-status'),
          })}
        />
      );

      break;

    case 'testResultList':
      field = (
        <Select
          className="w-full"
          data-testid="test-result-select"
          mode="multiple"
          options={getSelectOptionsFromEnum(TestCaseStatus)}
          placeholder={t('label.select-field', {
            field: t('label.test-case-result'),
          })}
        />
      );

      break;

    case 'testSuiteList':
      field = (
        <AsyncSelect
          api={getTestSuiteSuggestions}
          className="w-full"
          data-testid="test-suite-select"
          mode="multiple"
          placeholder={t('label.search-by-type', {
            type: t('label.test-suite'),
          })}
        />
      );

      break;
    default:
      field = <></>;
  }

  return (
    <>
      <Col key={argument} span={12}>
        <Form.Item
          name={[fieldName, 'arguments', index, 'input']}
          rules={[
            {
              required: true,
              message: getMessageFromArgumentName(argument),
            },
          ]}>
          {field}
        </Form.Item>
      </Col>
      <Form.Item
        hidden
        dependencies={[fieldName, 'arguments', index, 'input']}
        initialValue={argument}
        key={`${argument}-name`}
        name={[fieldName, 'arguments', index, 'name']}
      />
    </>
  );
};

export const getConditionalField = (
  condition: string,
  name: number,
  selectedTrigger: string,
  supportedActions?: EventFilterRule[]
) => {
  const selectedAction = supportedActions?.find(
    (action) => action.name === condition
  );
  const requireInput = selectedAction?.inputType === InputType.Runtime;
  const requiredArguments = selectedAction?.arguments;

  if (!requireInput) {
    return <></>;
  }

  return (
    <>
      {requiredArguments?.map((argument, index) => {
        return getFieldByArgumentType(name, argument, index, selectedTrigger);
      })}
    </>
  );
};

export const handleAlertSave = async ({
  data,
  fqn,
  createAlertAPI,
  updateAlertAPI,
  afterSaveAction,
}: {
  data: CreateEventSubscription;
  createAlertAPI: (
    alert: CreateEventSubscription
  ) => Promise<EventSubscription>;
  updateAlertAPI: (
    alert: CreateEventSubscription
  ) => Promise<EventSubscription>;
  afterSaveAction: () => void;
  fqn?: string;
}) => {
  try {
    const destinations = data.destinations?.map((d) => ({
      type: d.type,
      config: d.config,
      category: d.category,
    }));

    if (fqn && !isUndefined(alert)) {
      const {
        alertType,
        description,
        displayName,
        enabled,
        input,
        name,
        owner,
        provider,
        resources,
        trigger,
      } = data;

      const newData = {
        alertType,
        description,
        destinations,
        displayName,
        enabled,
        input,
        name,
        owner,
        provider,
        resources,
        trigger,
      };

      await updateAlertAPI(newData);
    } else {
      await createAlertAPI({
        ...data,
        destinations,
      });
    }

    showSuccessToast(
      t(`server.${'create'}-entity-success`, {
        entity: t('label.alert-plural'),
      })
    );
    afterSaveAction();
  } catch (error) {
    if ((error as AxiosError).response?.status === HTTP_STATUS_CODE.CONFLICT) {
      showErrorToast(
        t('server.entity-already-exist', {
          entity: t('label.alert'),
          entityPlural: t('label.alert-lowercase-plural'),
          name: data.name,
        })
      );
    } else {
      showErrorToast(
        error as AxiosError,
        t(`server.${'entity-creation-error'}`, {
          entity: t('label.alert-lowercase'),
        })
      );
    }
  }
};

export const getFilteredDestinationOptions = (
  key: keyof typeof DESTINATION_SOURCE_ITEMS,
  selectedSource: string
) => {
  // Get options based on destination type key ("Internal" OR "External").
  const newOptions = DESTINATION_SOURCE_ITEMS[key];

  const isInternalOptions = isEqual(key, DESTINATION_DROPDOWN_TABS.internal);

  // Logic to filter the options based on destination type and selected source.
  const filteredOptions = newOptions.filter((option) => {
    // If the destination type is external, always show all options.
    if (!isInternalOptions) {
      return true;
    }

    // Logic to filter options for destination type "Internal"

    // Show all options except "Assignees" and "Mentions" for all sources.
    let shouldShowOption =
      option.value !== SubscriptionCategory.Assignees &&
      option.value !== SubscriptionCategory.Mentions;

    // Only show "Owners" and "Assignees" options for "Task" source.
    if (selectedSource === 'task') {
      shouldShowOption = [
        SubscriptionCategory.Owners,
        SubscriptionCategory.Assignees,
      ].includes(option.value as SubscriptionCategory);
    }

    // Only show "Owners" and "Mentions" options for "Conversation" source.
    if (selectedSource === 'conversation') {
      shouldShowOption = [
        SubscriptionCategory.Owners,
        SubscriptionCategory.Mentions,
      ].includes(option.value as SubscriptionCategory);
    }

    return shouldShowOption;
  });

  return filteredOptions;
};

export const getSourceOptionsFromResourceList = (
  resources: Array<string>,
  showCheckbox?: boolean,
  selectedResource?: string[]
) =>
  resources.map((resource) => ({
    label: (
      <div
        className="d-flex items-center gap-2"
        data-testid={`${resource}-option`}>
        {showCheckbox && (
          <Checkbox checked={selectedResource?.includes(resource)} />
        )}
        <div className="d-flex h-4 w-4">{getEntityIcon(resource ?? '')}</div>
        <span>{getEntityNameLabel(resource ?? '')}</span>
      </div>
    ),
    value: resource ?? '',
  }));
