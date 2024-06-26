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

import { AxiosError } from 'axios';
import _ from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import TitleBreadcrumb from '../../components/common/TitleBreadcrumb/TitleBreadcrumb.component';
import PageLayoutV1 from '../../components/PageLayoutV1/PageLayoutV1';
import CreateUserComponent from '../../components/Settings/Users/CreateUser/CreateUser.component';
import {
  ERROR_MESSAGE,
  getBotsPagePath,
  getUsersPagePath,
  PAGE_SIZE_LARGE,
} from '../../constants/constants';
import { GlobalSettingOptions } from '../../constants/GlobalSettings.constants';
import { CreateUser } from '../../generated/api/teams/createUser';
import { Role } from '../../generated/entity/teams/role';
import { createBot } from '../../rest/botsAPI';
import { getRoles } from '../../rest/rolesAPIV1';
import {
  createUser,
  createUserWithPut,
  getBotByName,
} from '../../rest/userAPI';
import { getIsErrorMatch } from '../../utils/CommonUtils';
import { getSettingPath } from '../../utils/RouterUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';

const CreateUserPage = () => {
  const history = useHistory();
  const { t } = useTranslation();

  const [roles, setRoles] = useState<Array<Role>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { bot } = useParams<{ bot: string }>();

  const goToUserListPage = () => {
    if (bot) {
      history.push(getSettingPath(GlobalSettingOptions.BOTS));
    } else {
      history.goBack();
    }
  };

  const handleCancel = () => {
    goToUserListPage();
  };

  /**
   * Handles error if any, while creating new user.
   * @param error AxiosError or error message
   * @param fallbackText fallback error message
   */
  const handleSaveFailure = (
    error: AxiosError | string,
    fallbackText?: string
  ) => {
    showErrorToast(error, fallbackText);
  };

  const checkBotInUse = async (name: string) => {
    try {
      const response = await getBotByName(name);

      return Boolean(response);
    } catch (_error) {
      return false;
    }
  };

  /**
   * Submit handler for new user form.
   * @param userData Data for creating new user
   */
  const handleAddUserSave = async (userData: CreateUser) => {
    setIsLoading(true);
    if (bot) {
      const isBotExists = await checkBotInUse(userData.name);
      if (isBotExists) {
        showErrorToast(
          t('server.email-already-exist', {
            entity: t('label.bot-lowercase'),
            name: userData.name,
          })
        );
      } else {
        try {
          // Create a user with isBot:true
          const userResponse = await createUserWithPut({
            ...userData,
            botName: userData.name,
          });

          // Create a bot entity with botUser data
          await createBot({
            botUser: _.toString(userResponse.fullyQualifiedName),
            name: userResponse.name,
            displayName: userResponse.displayName,
            description: userResponse.description,
          });
          showSuccessToast(
            t('server.create-entity-success', { entity: t('label.bot') })
          );
          goToUserListPage();
        } catch (error) {
          handleSaveFailure(
            error as AxiosError,
            t('server.create-entity-error', { entity: t('label.bot') })
          );
        }
      }
    } else {
      try {
        await createUser(userData);
        goToUserListPage();
      } catch (error) {
        handleSaveFailure(
          getIsErrorMatch(error as AxiosError, ERROR_MESSAGE.alreadyExist)
            ? t('server.email-already-exist', {
                entity: t('label.user-lowercase'),
                name: userData.name,
              })
            : (error as AxiosError),
          t('server.create-entity-error', { entity: t('label.user') })
        );
      }
    }
    setIsLoading(false);
  };

  const fetchRoles = async () => {
    try {
      const response = await getRoles(
        '',
        undefined,
        undefined,
        false,
        PAGE_SIZE_LARGE
      );
      setRoles(response.data);
    } catch (err) {
      setRoles([]);
      showErrorToast(
        err as AxiosError,
        t('server.entity-fetch-error', { entity: t('label.role-plural') })
      );
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const slashedBreadcrumbList = useMemo(
    () => [
      {
        name: bot ? t('label.bot-plural') : t('label.user-plural'),
        url: bot ? getBotsPagePath() : getUsersPagePath(),
      },
      {
        name: `${t('label.create')} ${bot ? t('label.bot') : t('label.user')}`,
        url: '',
        activeTitle: true,
      },
    ],
    [bot]
  );

  return (
    <PageLayoutV1
      pageTitle={t('label.create-entity', { entity: t('label.user') })}>
      <div className="max-width-md w-9/10 service-form-container">
        <TitleBreadcrumb titleLinks={slashedBreadcrumbList} />
        <div className="m-t-md">
          <CreateUserComponent
            forceBot={Boolean(bot)}
            isLoading={isLoading}
            roles={roles}
            onCancel={handleCancel}
            onSave={handleAddUserSave}
          />
        </div>
      </div>
    </PageLayoutV1>
  );
};

export default CreateUserPage;
