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
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { isEmpty, isUndefined } from 'lodash';
import Qs from 'qs';
import {
  default as React,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import Loader from '../../components/common/Loader/Loader';
import Users from '../../components/Settings/Users/Users.component';
import { User } from '../../generated/entity/teams/user';
import { useApplicationStore } from '../../hooks/useApplicationStore';
import { useFqn } from '../../hooks/useFqn';
import { getUserByName, updateUserDetail } from '../../rest/userAPI';
import { Transi18next } from '../../utils/CommonUtils';
import { showErrorToast } from '../../utils/ToastUtils';

const UserPage = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const { fqn: username } = useFqn();
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<User>({} as User);
  const [isError, setIsError] = useState(false);
  const { currentUser, updateCurrentUser } = useApplicationStore();

  const fetchUserData = async () => {
    try {
      const res = await getUserByName(username, {
        fields: 'profile,roles,teams,personas,defaultPersona,domain',
      });
      setUserData(res);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-fetch-error', {
          entity: t('label.entity-detail-plural', {
            entity: t('label.user'),
          }),
        })
      );
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const myDataQueryFilter = useMemo(() => {
    const teamsIds = (userData.teams ?? []).map((team) => team.id);
    const mergedIds = [
      ...teamsIds.map((id) => `owner.id:${id}`),
      `owner.id:${userData.id}`,
    ].join(' OR ');

    return `(${mergedIds})`;
  }, [userData]);

  const followingQueryFilter = useMemo(
    () => `followers:${userData.id}`,
    [userData.id]
  );

  const handleEntityPaginate = (page: string | number) => {
    history.push({
      search: Qs.stringify({ page }),
    });
  };

  const ErrorPlaceholder = () => {
    return (
      <div
        className="d-flex items-center justify-center h-full"
        data-testid="error">
        <Typography.Paragraph className="text-base" data-testid="error-message">
          <Transi18next
            i18nKey="message.no-username-available"
            renderElement={<strong data-testid="username" />}
            values={{
              user: username,
            }}
          />
        </Typography.Paragraph>
      </div>
    );
  };

  const updateUserDetails = useCallback(
    async (data: Partial<User>, key: keyof User) => {
      const updatedDetails = { ...userData, ...data };
      const jsonPatch = compare(userData, updatedDetails);

      try {
        const response = await updateUserDetail(userData.id, jsonPatch);
        if (response) {
          let updatedKeyData;

          if (key === 'roles') {
            updatedKeyData = {
              roles: response.roles,
              isAdmin: response.isAdmin,
            };
          } else {
            updatedKeyData = { [key]: response[key] };
          }
          const newCurrentUserData = {
            ...currentUser,
            ...updatedKeyData,
          };
          const newUserData = { ...userData, ...updatedKeyData };

          if (key === 'defaultPersona') {
            if (isUndefined(response.defaultPersona)) {
              // remove key from object if value is undefined
              delete newCurrentUserData[key];
              delete newUserData[key];
            }
          }
          if (userData.id === currentUser?.id) {
            updateCurrentUser(newCurrentUserData as User);
          }
          setUserData(newUserData);
        } else {
          throw t('message.unexpected-error');
        }
      } catch (error) {
        showErrorToast(error as AxiosError);
      }
    },
    [userData, currentUser, updateCurrentUser]
  );

  useEffect(() => {
    fetchUserData();
  }, [username]);

  if (isLoading) {
    return <Loader />;
  }

  if (isError && isEmpty(userData)) {
    return <ErrorPlaceholder />;
  }

  return (
    <Users
      handlePaginate={handleEntityPaginate}
      queryFilters={{
        myData: myDataQueryFilter,
        following: followingQueryFilter,
      }}
      updateUserDetails={updateUserDetails}
      userData={userData}
    />
  );
};

export default UserPage;
