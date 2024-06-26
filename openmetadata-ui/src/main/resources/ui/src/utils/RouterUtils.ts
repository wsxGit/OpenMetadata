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

import { isUndefined } from 'lodash';
import { ServiceTypes } from 'Models';
import {
  getServiceDetailsPath,
  IN_PAGE_SEARCH_ROUTES,
  LOG_ENTITY_NAME,
  LOG_ENTITY_TYPE,
  PLACEHOLDER_ACTION,
  PLACEHOLDER_DASHBOARD_TYPE,
  PLACEHOLDER_ROUTE_FQN,
  PLACEHOLDER_ROUTE_ID,
  PLACEHOLDER_ROUTE_INGESTION_FQN,
  PLACEHOLDER_ROUTE_INGESTION_TYPE,
  PLACEHOLDER_ROUTE_QUERY_ID,
  PLACEHOLDER_ROUTE_SERVICE_CAT,
  PLACEHOLDER_ROUTE_TAB,
  PLACEHOLDER_ROUTE_VERSION,
  PLACEHOLDER_RULE_NAME,
  PLACEHOLDER_SETTING_CATEGORY,
  ROUTES,
} from '../constants/constants';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../constants/GlobalSettings.constants';
import { arrServiceTypes } from '../constants/Services.constant';
import { EntityAction } from '../enums/entity.enum';
import { ProfilerDashboardType } from '../enums/table.enum';
import { PipelineType } from '../generated/api/services/ingestionPipelines/createIngestionPipeline';
import { DataQualityPageTabs } from '../pages/DataQuality/DataQualityPage.interface';
import { IncidentManagerTabs } from '../pages/IncidentManager/IncidentManager.interface';
import { getServiceRouteFromServiceType } from './ServiceUtils';
import { getEncodedFqn } from './StringsUtils';

export const isInPageSearchAllowed = (pathname: string): boolean => {
  return Boolean(
    Object.keys(IN_PAGE_SEARCH_ROUTES).find((route) => pathname.includes(route))
  );
};

export const inPageSearchOptions = (pathname: string): Array<string> => {
  let strOptions: Array<string> = [];
  for (const route in IN_PAGE_SEARCH_ROUTES) {
    if (pathname.includes(route)) {
      strOptions = IN_PAGE_SEARCH_ROUTES[route];

      break;
    }
  }

  return strOptions;
};

export const getAddServicePath = (serviceCategory: string) => {
  let path = ROUTES.ADD_SERVICE;
  path = path.replace(PLACEHOLDER_ROUTE_SERVICE_CAT, serviceCategory);

  return path;
};

export const getEditConnectionPath = (
  serviceCategory: string,
  serviceFQN: string
) => {
  let path = ROUTES.EDIT_SERVICE_CONNECTION;
  path = path
    .replace(PLACEHOLDER_ROUTE_SERVICE_CAT, serviceCategory)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(serviceFQN))
    .replace(PLACEHOLDER_ROUTE_TAB, 'connection');

  return path;
};

export const getPathByServiceFQN = (
  serviceCategory: string,
  serviceFQN: string
) => {
  let path = ROUTES.SERVICE_WITH_TAB;
  path = path
    .replace(PLACEHOLDER_ROUTE_SERVICE_CAT, serviceCategory)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(serviceFQN))
    .replace(PLACEHOLDER_ROUTE_TAB, 'connection');

  return path;
};

export const getAddIngestionPath = (
  serviceCategory: string,
  serviceFQN: string,
  ingestionType: string
) => {
  let path = ROUTES.ADD_INGESTION;
  path = path
    .replace(PLACEHOLDER_ROUTE_SERVICE_CAT, serviceCategory)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(serviceFQN))
    .replace(PLACEHOLDER_ROUTE_INGESTION_TYPE, ingestionType);

  return path;
};

export const getEditIngestionPath = (
  serviceCategory: string,
  serviceFQN: string,
  ingestionFQN: string,
  ingestionType: string
) => {
  let path = ROUTES.EDIT_INGESTION;
  path = path
    .replace(PLACEHOLDER_ROUTE_SERVICE_CAT, serviceCategory)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(serviceFQN))
    .replace(PLACEHOLDER_ROUTE_INGESTION_FQN, ingestionFQN)
    .replace(PLACEHOLDER_ROUTE_INGESTION_TYPE, ingestionType);

  return path;
};

export const getDomainPath = (fqn?: string) => {
  let path = ROUTES.DOMAIN;
  if (fqn) {
    path = ROUTES.DOMAIN_DETAILS;
    path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));
  }

  return path;
};

export const getDomainDetailsPath = (fqn: string, tab?: string) => {
  let path = tab ? ROUTES.DOMAIN_DETAILS_WITH_TAB : ROUTES.DOMAIN_DETAILS;
  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  if (tab) {
    path = path.replace(PLACEHOLDER_ROUTE_TAB, tab);
  }

  return path;
};

export const getGlossaryPath = (fqn?: string) => {
  let path = ROUTES.GLOSSARY;
  if (fqn) {
    path = ROUTES.GLOSSARY_DETAILS;
    path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));
  }

  return path;
};

export const getApplicationDetailsPath = (fqn: string) => {
  let path = ROUTES.SETTINGS_WITH_CATEGORY_FQN;

  path = path
    .replace(
      PLACEHOLDER_SETTING_CATEGORY,
      GlobalSettingsMenuCategory.APPLICATIONS
    )
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getMarketPlaceAppDetailsPath = (fqn: string) => {
  return ROUTES.MARKETPLACE_APP_DETAILS.replace(
    PLACEHOLDER_ROUTE_FQN,
    getEncodedFqn(fqn)
  );
};

export const getAppInstallPath = (fqn: string) => {
  return ROUTES.MARKETPLACE_APP_INSTALL.replace(
    PLACEHOLDER_ROUTE_FQN,
    getEncodedFqn(fqn)
  );
};

export const getSettingPath = (
  category?: string,
  tab?: string,
  withFqn = false,
  withAction = false
) => {
  let path = ROUTES.SETTINGS;

  if (tab && category) {
    if (withFqn) {
      path = withAction
        ? ROUTES.SETTINGS_WITH_TAB_FQN_ACTION
        : ROUTES.SETTINGS_WITH_TAB_FQN;
    } else {
      path = ROUTES.SETTINGS_WITH_TAB;
    }

    path = path.replace(PLACEHOLDER_ROUTE_TAB, tab);
    path = path.replace(PLACEHOLDER_SETTING_CATEGORY, category);
  } else if (category) {
    path = withFqn
      ? ROUTES.SETTINGS_WITH_CATEGORY_FQN
      : ROUTES.SETTINGS_WITH_CATEGORY;

    path = path.replace(PLACEHOLDER_SETTING_CATEGORY, category);
  }

  return path;
};

export const getSettingsPathWithFqn = (
  category: string,
  tab: string,
  fqn: string,
  action?: string
) => {
  let path = action
    ? ROUTES.SETTINGS_WITH_TAB_FQN_ACTION
    : ROUTES.SETTINGS_WITH_TAB_FQN;

  if (action) {
    path = path.replace(PLACEHOLDER_ACTION, action);
  }

  path = path.replace(PLACEHOLDER_ROUTE_TAB, tab);
  path = path.replace(PLACEHOLDER_SETTING_CATEGORY, category);
  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getSettingCategoryPath = (category: string) => {
  let path = ROUTES.SETTINGS_WITH_TAB;

  if (category) {
    path = path.replace(PLACEHOLDER_SETTING_CATEGORY, category);
  }

  return path;
};

export const getTeamsWithFqnPath = (fqn: string) => {
  let path = ROUTES.SETTINGS_WITH_TAB_FQN;

  path = path
    .replace(PLACEHOLDER_SETTING_CATEGORY, GlobalSettingsMenuCategory.MEMBERS)
    .replace(PLACEHOLDER_ROUTE_TAB, GlobalSettingOptions.TEAMS)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getRoleWithFqnPath = (fqn: string) => {
  let path = ROUTES.SETTINGS_WITH_TAB_FQN;

  path = path
    .replace(PLACEHOLDER_SETTING_CATEGORY, GlobalSettingsMenuCategory.ACCESS)
    .replace(PLACEHOLDER_ROUTE_TAB, GlobalSettingOptions.ROLES)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getPolicyWithFqnPath = (fqn: string) => {
  let path = ROUTES.SETTINGS_WITH_TAB_FQN;

  path = path
    .replace(PLACEHOLDER_SETTING_CATEGORY, GlobalSettingsMenuCategory.ACCESS)
    .replace(PLACEHOLDER_ROUTE_TAB, GlobalSettingOptions.POLICIES)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getPath = (pathName: string) => {
  switch (pathName) {
    case GlobalSettingOptions.TEAMS:
      return getSettingPath(
        GlobalSettingsMenuCategory.ACCESS,
        GlobalSettingOptions.TEAMS
      );

    case GlobalSettingOptions.USERS:
      return getSettingPath(
        GlobalSettingsMenuCategory.ACCESS,
        GlobalSettingOptions.USERS
      );

    case GlobalSettingOptions.ROLES:
      return getSettingPath(
        GlobalSettingsMenuCategory.ACCESS,
        GlobalSettingOptions.ROLES
      );

    case GlobalSettingOptions.POLICIES:
      return getSettingPath(
        GlobalSettingsMenuCategory.ACCESS,
        GlobalSettingOptions.POLICIES
      );

    default:
      return getSettingPath();
  }
};

export const getAddPolicyRulePath = (fqn: string) => {
  let path = ROUTES.ADD_POLICY_RULE;

  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getEditPolicyRulePath = (fqn: string, ruleName: string) => {
  let path = ROUTES.EDIT_POLICY_RULE;

  path = path
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn))
    .replace(PLACEHOLDER_RULE_NAME, ruleName);

  return path;
};

export const getTagPath = (fqn?: string) => {
  let path = ROUTES.TAGS;
  if (fqn) {
    path = ROUTES.TAG_DETAILS;
    path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));
  }

  return path;
};

export const getAddDataQualityTableTestPath = (
  dashboardType: string,
  fqn: string
) => {
  let path = ROUTES.ADD_DATA_QUALITY_TEST_CASE;

  path = path
    .replace(PLACEHOLDER_DASHBOARD_TYPE, dashboardType)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};
export const getAddCustomMetricPath = (
  dashboardType: ProfilerDashboardType,
  fqn: string
) => {
  let path = ROUTES.ADD_CUSTOM_METRIC;

  path = path
    .replace(PLACEHOLDER_DASHBOARD_TYPE, dashboardType)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getTestSuitePath = (testSuiteFqn: string) => {
  let path = ROUTES.TEST_SUITES_WITH_FQN;
  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(testSuiteFqn));

  return path;
};

export const getTestSuiteIngestionPath = (
  testSuiteFqn: string,
  ingestionFqn?: string
) => {
  let path = ingestionFqn
    ? ROUTES.TEST_SUITES_EDIT_INGESTION
    : ROUTES.TEST_SUITES_ADD_INGESTION;
  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(testSuiteFqn));

  if (ingestionFqn) {
    path = path.replace(
      PLACEHOLDER_ROUTE_INGESTION_FQN,
      getEncodedFqn(ingestionFqn)
    );
  }

  return path;
};

/**
 * It takes in a log entity type, log entity name, and ingestion name, and returns a path to the logs
 * viewer
 * @param {string} logEntityType - The type of entity that the logs are associated with.
 * @param {string} logEntityName - The name of the log entity.
 * @param {string} ingestionName - The name of the ingestion.
 * @returns A string
 */
export const getLogsViewerPath = (
  logEntityType: string,
  logEntityName: string,
  ingestionName: string
) => {
  let path = ROUTES.LOGS;

  path = path.replace(LOG_ENTITY_TYPE, logEntityType);
  path = path.replace(LOG_ENTITY_NAME, logEntityName);
  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(ingestionName));

  return path;
};

/**
 * It returns a path
 * @param {string} path - The path of the current page.
 * @param {string | undefined} logEntityType - The type of the log entity.
 * @returns a string.
 */
export const getLogEntityPath = (
  path: string,
  logEntityType: string | undefined
): string => {
  if (isUndefined(logEntityType)) {
    return '';
  }

  if (logEntityType === PipelineType.TestSuite) {
    return getTestSuitePath(path);
  }

  if (
    !arrServiceTypes.includes(path as ServiceTypes) &&
    path !== PipelineType.TestSuite
  ) {
    return getServiceDetailsPath(path, logEntityType, 'ingestions');
  }

  return getSettingPath(
    GlobalSettingsMenuCategory.SERVICES,
    getServiceRouteFromServiceType(logEntityType as ServiceTypes)
  );
};

export const getGlossaryPathWithAction = (
  fqn: string,
  action: EntityAction
) => {
  let path = ROUTES.GLOSSARY_DETAILS_WITH_ACTION;

  path = path
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn))
    .replace(PLACEHOLDER_ACTION, action);

  return path;
};

export const getQueryPath = (entityFqn: string, queryId: string) => {
  let path = ROUTES.QUERY_FULL_SCREEN_VIEW;

  path = path
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(entityFqn))
    .replace(PLACEHOLDER_ROUTE_QUERY_ID, queryId);

  return path;
};
export const getAddQueryPath = (entityFqn: string) => {
  let path = ROUTES.ADD_QUERY;

  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(entityFqn));

  return path;
};

export const getDomainVersionsPath = (domainFqn: string, version: string) => {
  let path = ROUTES.DOMAIN_VERSION;
  path = path
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(domainFqn))
    .replace(PLACEHOLDER_ROUTE_VERSION, version);

  return path;
};

export const getGlossaryVersionsPath = (id: string, version: string) => {
  let path = ROUTES.GLOSSARY_VERSION;
  path = path
    .replace(PLACEHOLDER_ROUTE_ID, id)
    .replace(PLACEHOLDER_ROUTE_VERSION, version);

  return path;
};

export const getGlossaryTermsVersionsPath = (
  id: string,
  version: string,
  tab?: string
) => {
  let path = tab
    ? ROUTES.GLOSSARY_TERMS_VERSION_TAB
    : ROUTES.GLOSSARY_TERMS_VERSION;
  path = path
    .replace(PLACEHOLDER_ROUTE_ID, id)
    .replace(PLACEHOLDER_ROUTE_VERSION, version);

  if (tab) {
    path = path.replace(PLACEHOLDER_ROUTE_TAB, tab);
  }

  return path;
};

export const getDataQualityPagePath = (tab?: DataQualityPageTabs) => {
  let path = tab ? ROUTES.DATA_QUALITY_WITH_TAB : ROUTES.DATA_QUALITY;

  if (tab) {
    path = path.replace(PLACEHOLDER_ROUTE_TAB, tab);
  }

  return path;
};

export const getIncidentManagerDetailPagePath = (
  fqn: string,
  tab = IncidentManagerTabs.TEST_CASE_RESULTS
) => {
  let path = ROUTES.INCIDENT_MANAGER_DETAILS_WITH_TAB;

  path = path
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn))
    .replace(PLACEHOLDER_ROUTE_TAB, tab);

  return path;
};

export const getServiceVersionPath = (
  serviceCategory: string,
  serviceFqn: string,
  version: string
) => {
  let path = ROUTES.SERVICE_VERSION;

  path = path
    .replace(PLACEHOLDER_ROUTE_SERVICE_CAT, serviceCategory)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(serviceFqn))
    .replace(PLACEHOLDER_ROUTE_VERSION, version);

  return path;
};

export const getClassificationDetailsPath = (classificationFqn: string) => {
  let path = ROUTES.TAG_DETAILS;
  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(classificationFqn));

  return path;
};

export const getClassificationVersionsPath = (
  classificationFqn: string,
  version: string
) => {
  let path = ROUTES.TAG_VERSION;
  path = path
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(classificationFqn))
    .replace(PLACEHOLDER_ROUTE_VERSION, version);

  return path;
};

export const getPersonaDetailsPath = (fqn: string) => {
  let path = ROUTES.SETTINGS_WITH_TAB_FQN;

  path = path
    .replace(PLACEHOLDER_SETTING_CATEGORY, GlobalSettingsMenuCategory.MEMBERS)
    .replace(PLACEHOLDER_ROUTE_TAB, GlobalSettingOptions.PERSONA)
    .replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getObservabilityAlertsEditPath = (fqn: string) => {
  let path = ROUTES.EDIT_OBSERVABILITY_ALERTS;

  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getNotificationAlertsEditPath = (fqn: string) => {
  let path = ROUTES.EDIT_NOTIFICATION_ALERTS;

  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getObservabilityAlertDetailsPath = (fqn: string) => {
  let path = ROUTES.OBSERVABILITY_ALERT_DETAILS;

  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};

export const getNotificationAlertDetailsPath = (fqn: string) => {
  let path = ROUTES.NOTIFICATION_ALERT_DETAILS;

  path = path.replace(PLACEHOLDER_ROUTE_FQN, getEncodedFqn(fqn));

  return path;
};
