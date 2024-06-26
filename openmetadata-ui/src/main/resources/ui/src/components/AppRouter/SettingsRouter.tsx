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
import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { ROUTES } from '../../constants/constants';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../../constants/GlobalSettings.constants';
import { usePermissionProvider } from '../../context/PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../../context/PermissionProvider/PermissionProvider.interface';
import { Operation } from '../../generated/entity/policies/accessControl/resourcePermission';
import { TeamType } from '../../generated/entity/teams/team';
import AddNotificationPage from '../../pages/AddNotificationPage/AddNotificationPage';
import AlertDetailsPage from '../../pages/AlertDetailsPage/AlertDetailsPage';
import AlertsActivityFeedPage from '../../pages/AlertsActivityFeedPage/AlertsActivityFeedPage';
import AppearanceConfigSettingsPage from '../../pages/AppearanceConfigSettingsPage/AppearanceConfigSettingsPage';
import ApplicationPage from '../../pages/Application/ApplicationPage';
import BotsPageV1 from '../../pages/BotsPageV1/BotsPageV1.component';
import EditLoginConfiguration from '../../pages/Configuration/EditLoginConfiguration/EditLoginConfigurationPage';
import LoginConfigurationPage from '../../pages/Configuration/LoginConfigurationDetails/LoginConfigurationPage';
import { CustomPageSettings } from '../../pages/CustomPageSettings/CustomPageSettings';
import CustomPropertiesPageV1 from '../../pages/CustomPropertiesPageV1/CustomPropertiesPageV1';
import EditEmailConfigPage from '../../pages/EditEmailConfigPage/EditEmailConfigPage.component';
import EmailConfigSettingsPage from '../../pages/EmailConfigSettingsPage/EmailConfigSettingsPage.component';
import GlobalSettingCategoryPage from '../../pages/GlobalSettingPage/GlobalSettingCategory/GlobalSettingCategoryPage';
import GlobalSettingPage from '../../pages/GlobalSettingPage/GlobalSettingPage';
import NotificationListPage from '../../pages/NotificationListPage/NotificationListPage';
import OmHealthPage from '../../pages/OmHealth/OmHealthPage';
import { PersonaDetailsPage } from '../../pages/Persona/PersonaDetailsPage/PersonaDetailsPage';
import { PersonaPage } from '../../pages/Persona/PersonaListPage/PersonaPage';
import AddPolicyPage from '../../pages/PoliciesPage/AddPolicyPage/AddPolicyPage';
import AddRulePage from '../../pages/PoliciesPage/PoliciesDetailPage/AddRulePage';
import EditRulePage from '../../pages/PoliciesPage/PoliciesDetailPage/EditRulePage';
import PoliciesDetailPage from '../../pages/PoliciesPage/PoliciesDetailPage/PoliciesDetailPage';
import PoliciesListPage from '../../pages/PoliciesPage/PoliciesListPage/PoliciesListPage';
import ProfilerConfigurationPage from '../../pages/ProfilerConfigurationPage/ProfilerConfigurationPage';
import AddRolePage from '../../pages/RolesPage/AddRolePage/AddRolePage';
import RolesDetailPage from '../../pages/RolesPage/RolesDetailPage/RolesDetailPage';
import RolesListPage from '../../pages/RolesPage/RolesListPage/RolesListPage';
import ServicesPage from '../../pages/ServicesPage/ServicesPage';
import ImportTeamsPage from '../../pages/TeamsPage/ImportTeamsPage/ImportTeamsPage';
import TeamsPage from '../../pages/TeamsPage/TeamsPage';
import UserListPageV1 from '../../pages/UserListPage/UserListPageV1';
import { checkPermission, userPermissions } from '../../utils/PermissionsUtils';
import {
  getSettingCategoryPath,
  getSettingPath,
  getTeamsWithFqnPath,
} from '../../utils/RouterUtils';
import AppDetails from '../Settings/Applications/AppDetails/AppDetails.component';
import AdminProtectedRoute from './AdminProtectedRoute';

const SettingsRouter = () => {
  const { permissions } = usePermissionProvider();

  return (
    <Switch>
      <Route exact component={GlobalSettingPage} path={ROUTES.SETTINGS} />

      {/* keep these route above the setting route always */}
      <AdminProtectedRoute
        exact
        component={AddRolePage}
        hasPermission={checkPermission(
          Operation.Create,
          ResourceEntity.ROLE,
          permissions
        )}
        path={ROUTES.ADD_ROLE}
      />
      <AdminProtectedRoute
        exact
        component={AddPolicyPage}
        hasPermission={checkPermission(
          Operation.Create,
          ResourceEntity.POLICY,
          permissions
        )}
        path={ROUTES.ADD_POLICY}
      />
      <Route exact component={AddRulePage} path={ROUTES.ADD_POLICY_RULE} />
      <AdminProtectedRoute
        exact
        component={EditEmailConfigPage}
        hasPermission={false}
        path={ROUTES.SETTINGS_EDIT_EMAIL_CONFIG}
      />

      <AdminProtectedRoute
        exact
        component={EditLoginConfiguration}
        hasPermission={false}
        path={ROUTES.SETTINGS_EDIT_CUSTOM_LOGIN_CONFIG}
      />
      <Route exact component={EditRulePage} path={ROUTES.EDIT_POLICY_RULE} />

      {/*  Setting routes without any category will be places here */}
      <AdminProtectedRoute
        exact
        component={NotificationListPage}
        hasPermission={false}
        path={getSettingPath(GlobalSettingsMenuCategory.NOTIFICATIONS)}
      />

      <AdminProtectedRoute
        exact
        component={() => <AlertDetailsPage isNotificationAlert />}
        path={ROUTES.NOTIFICATION_ALERT_DETAILS}
      />
      <AdminProtectedRoute
        exact
        component={AddNotificationPage}
        hasPermission={false}
        path={[
          getSettingPath(
            GlobalSettingsMenuCategory.NOTIFICATIONS,
            GlobalSettingOptions.EDIT_NOTIFICATION,
            true
          ),
          getSettingPath(
            GlobalSettingsMenuCategory.NOTIFICATIONS,
            GlobalSettingOptions.ADD_NOTIFICATION
          ),
        ]}
      />

      <AdminProtectedRoute
        exact
        component={BotsPageV1}
        hasPermission={false}
        path={getSettingPath(GlobalSettingOptions.BOTS)}
      />
      <AdminProtectedRoute
        exact
        component={ApplicationPage}
        hasPermission={false}
        path={getSettingPath(GlobalSettingOptions.APPLICATIONS)}
      />
      <AdminProtectedRoute
        exact
        component={AppDetails}
        hasPermission={false}
        path={getSettingPath(
          GlobalSettingOptions.APPLICATIONS,
          undefined,
          true
        )}
      />

      {/* Setting Page Routes with categories */}

      <Route
        exact
        component={GlobalSettingCategoryPage}
        path={ROUTES.SETTINGS_WITH_CATEGORY}
      />

      <Route exact path={getSettingPath()}>
        <Redirect to={getTeamsWithFqnPath(TeamType.Organization)} />
      </Route>
      <AdminProtectedRoute
        exact
        component={TeamsPage}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.TEAM,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.TEAMS,
          true
        )}
      />
      <AdminProtectedRoute
        exact
        component={ImportTeamsPage}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.TEAM,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.TEAMS,
          true,
          true
        )}
      />
      <Route
        path={getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.TEAMS
        )}>
        <Redirect to={getTeamsWithFqnPath(TeamType.Organization)} />
      </Route>
      <AdminProtectedRoute
        exact
        component={PersonaPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.PERSONA
        )}
      />
      <AdminProtectedRoute
        exact
        component={PersonaDetailsPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.PERSONA,
          true
        )}
      />
      {/* Roles route start
       * Do not change the order of these route
       */}
      <AdminProtectedRoute
        exact
        component={RolesListPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.ROLES
        )}
      />

      <AdminProtectedRoute
        exact
        component={RolesDetailPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.ROLES,
          true
        )}
      />
      {/* Roles route end
       * Do not change the order of these route
       */}

      <AdminProtectedRoute
        exact
        component={PoliciesListPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.POLICIES
        )}
      />
      <AdminProtectedRoute
        exact
        component={PoliciesDetailPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.POLICIES,
          true
        )}
      />
      <AdminProtectedRoute
        exact
        component={UserListPageV1}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.USER,
          permissions
        )}
        path={getSettingCategoryPath(GlobalSettingsMenuCategory.MEMBERS)}
      />
      <AdminProtectedRoute
        exact
        component={EmailConfigSettingsPage}
        hasPermission={false}
        path={getSettingPath(
          GlobalSettingsMenuCategory.PREFERENCES,
          GlobalSettingOptions.EMAIL
        )}
      />
      <AdminProtectedRoute
        exact
        component={AppearanceConfigSettingsPage}
        hasPermission={false}
        path={getSettingPath(
          GlobalSettingsMenuCategory.PREFERENCES,
          GlobalSettingOptions.APPEARANCE
        )}
      />
      <AdminProtectedRoute
        exact
        component={ProfilerConfigurationPage}
        hasPermission={false}
        path={getSettingPath(
          GlobalSettingsMenuCategory.PREFERENCES,
          GlobalSettingOptions.PROFILER_CONFIGURATION
        )}
      />
      <AdminProtectedRoute
        exact
        component={LoginConfigurationPage}
        hasPermission={false}
        path={getSettingPath(
          GlobalSettingsMenuCategory.PREFERENCES,
          GlobalSettingOptions.LOGIN_CONFIGURATION
        )}
      />
      <AdminProtectedRoute
        exact
        component={CustomPageSettings}
        path={getSettingPath(
          GlobalSettingsMenuCategory.PREFERENCES,
          GlobalSettingOptions.CUSTOMIZE_LANDING_PAGE
        )}
      />

      <Route
        exact
        component={ServicesPage}
        path={getSettingCategoryPath(GlobalSettingsMenuCategory.SERVICES)}
      />

      <AdminProtectedRoute
        exact
        component={AlertsActivityFeedPage}
        hasPermission={false}
        path={getSettingPath(
          GlobalSettingsMenuCategory.NOTIFICATIONS,
          GlobalSettingOptions.ACTIVITY_FEED
        )}
      />

      <AdminProtectedRoute
        exact
        component={CustomPropertiesPageV1}
        hasPermission={false}
        path={getSettingCategoryPath(
          GlobalSettingsMenuCategory.CUSTOM_PROPERTIES
        )}
      />
      <AdminProtectedRoute
        exact
        component={OmHealthPage}
        hasPermission={false}
        path={getSettingPath(
          GlobalSettingsMenuCategory.PREFERENCES,
          GlobalSettingOptions.OM_HEALTH
        )}
      />
    </Switch>
  );
};

export default SettingsRouter;
