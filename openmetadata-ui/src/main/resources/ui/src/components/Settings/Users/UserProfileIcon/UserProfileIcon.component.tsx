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
import { CheckOutlined } from '@ant-design/icons';
import { Dropdown, Space, Tooltip, Typography } from 'antd';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import { isEmpty } from 'lodash';
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ReactComponent as DropDownIcon } from '../../../../assets/svg/drop-down.svg';
import {
  getTeamAndUserDetailsPath,
  getUserPath,
  LIGHT_GREEN_COLOR,
  NO_DATA_PLACEHOLDER,
  TERM_ADMIN,
  TERM_USER,
} from '../../../../constants/constants';
import { EntityReference } from '../../../../generated/entity/type';
import { useApplicationStore } from '../../../../hooks/useApplicationStore';
import { getEntityName } from '../../../../utils/EntityUtils';
import i18n from '../../../../utils/i18next/LocalUtil';
import {
  getImageWithResolutionAndFallback,
  ImageQuality,
} from '../../../../utils/ProfilerUtils';
import ProfilePicture from '../../../common/ProfilePicture/ProfilePicture';
import './user-profile-icon.less';

type ListMenuItemProps = {
  listItems: EntityReference[];
  labelRenderer: (item: EntityReference) => ReactNode;
  readMoreLabelRenderer: (count: number) => ReactNode;
  readMoreKey?: string;
  sizeLimit?: number;
};

const renderLimitedListMenuItem = ({
  listItems,
  labelRenderer,
  readMoreLabelRenderer,
  sizeLimit = 2,
  readMoreKey,
}: ListMenuItemProps) => {
  const remainingCount =
    listItems.length ?? 0 > sizeLimit
      ? (listItems.length ?? sizeLimit) - sizeLimit
      : 0;

  const items = listItems.slice(0, sizeLimit);

  return isEmpty(items)
    ? [{ label: NO_DATA_PLACEHOLDER, key: 'no-teams' }]
    : [
        ...(items?.map((item) => ({
          label: labelRenderer(item),
          key: item.id,
        })) ?? []),
        ...[
          remainingCount > 0
            ? {
                label: readMoreLabelRenderer(remainingCount),
                key: readMoreKey ?? 'more-item',
              }
            : null,
        ],
      ];
};

export const UserProfileIcon = () => {
  const {
    currentUser,
    onLogoutHandler,
    selectedPersona,
    setSelectedPersona: updateSelectedPersona,
  } = useApplicationStore();

  const [isImgUrlValid, setIsImgUrlValid] = useState<boolean>(true);
  const { t } = useTranslation();
  const profilePicture = getImageWithResolutionAndFallback(
    ImageQuality['6x'],
    currentUser?.profile?.images
  );
  const [showAllPersona, setShowAllPersona] = useState<boolean>(false);

  const handleOnImageError = useCallback(() => {
    setIsImgUrlValid(false);

    return false;
  }, []);

  const handleSelectedPersonaChange = async (persona: EntityReference) => {
    if (!currentUser) {
      return;
    }
    updateSelectedPersona(persona);
  };

  useEffect(() => {
    if (profilePicture) {
      setIsImgUrlValid(true);
    } else {
      setIsImgUrlValid(false);
    }
  }, [profilePicture]);

  const { userName, teams, roles, inheritedRoles, personas } = useMemo(() => {
    const userName = getEntityName(currentUser) || TERM_USER;

    return {
      userName,
      roles: currentUser?.isAdmin
        ? [
            ...(currentUser?.roles ?? []),
            { name: TERM_ADMIN, type: 'role' } as EntityReference,
          ]
        : currentUser?.roles,
      teams: currentUser?.teams,
      inheritedRoles: currentUser?.inheritedRoles,
      personas: currentUser?.personas,
    };
  }, [currentUser]);

  const personaLabelRenderer = useCallback(
    (item: EntityReference) => (
      <Space
        className="w-full"
        data-testid="persona-label"
        onClick={() => handleSelectedPersonaChange(item)}>
        {getEntityName(item)}{' '}
        {selectedPersona?.id === item.id && (
          <CheckOutlined
            className="m-l-xs"
            data-testid="check-outlined"
            style={{ color: LIGHT_GREEN_COLOR }}
          />
        )}
      </Space>
    ),
    [handleSelectedPersonaChange, selectedPersona]
  );

  const teamLabelRenderer = useCallback(
    (item) => (
      <Link
        className="ant-typography-ellipsis-custom text-sm m-b-0 p-0"
        component={Typography.Link}
        to={getTeamAndUserDetailsPath(item.name as string)}>
        {getEntityName(item)}
      </Link>
    ),
    []
  );

  const readMoreTeamRenderer = useCallback(
    (count: number, isPersona?: boolean) =>
      isPersona ? (
        <Typography.Text
          className="more-teams-pill"
          onClick={(e) => {
            e.stopPropagation();
            setShowAllPersona(true);
          }}>
          {count} {t('label.more')}
        </Typography.Text>
      ) : (
        <Link
          className="more-teams-pill"
          to={getUserPath(currentUser?.name as string)}>
          {count} {t('label.more')}
        </Link>
      ),
    [currentUser]
  );

  const items: ItemType[] = useMemo(
    () => [
      {
        key: 'user',
        icon: '',
        label: (
          <Link
            data-testid="user-name"
            to={getUserPath(currentUser?.name as string)}>
            <Typography.Paragraph
              className="ant-typography-ellipsis-custom font-medium cursor-pointer text-link-color m-b-0"
              ellipsis={{ rows: 1, tooltip: true }}>
              {userName}
            </Typography.Paragraph>
          </Link>
        ),
        type: 'group',
      },
      {
        type: 'divider', // Must have
      },
      {
        key: 'roles',
        icon: '',
        children: renderLimitedListMenuItem({
          listItems: roles ?? [],
          labelRenderer: getEntityName,
          readMoreLabelRenderer: readMoreTeamRenderer,
          readMoreKey: 'more-roles',
        }),
        label: (
          <span className="text-grey-muted text-xs">
            {i18n.t('label.role-plural')}
          </span>
        ),
        type: 'group',
      },
      {
        type: 'divider',
      },
      {
        key: 'inheritedRoles',
        icon: '',
        children: renderLimitedListMenuItem({
          listItems: inheritedRoles ?? [],
          labelRenderer: getEntityName,
          readMoreLabelRenderer: readMoreTeamRenderer,
          readMoreKey: 'more-inherited-roles',
        }),
        label: (
          <span className="text-grey-muted text-xs">
            {i18n.t('label.inherited-role-plural')}
          </span>
        ),
        type: 'group',
      },
      {
        type: 'divider',
      },
      {
        key: 'personas',
        icon: '',
        children: renderLimitedListMenuItem({
          listItems: personas ?? [],
          readMoreKey: 'more-persona',
          sizeLimit: showAllPersona ? personas?.length : 2,
          labelRenderer: personaLabelRenderer,
          readMoreLabelRenderer: (count) => readMoreTeamRenderer(count, true),
        }),
        label: (
          <span className="text-grey-muted text-xs">
            {i18n.t('label.persona-plural')}
          </span>
        ),
        type: 'group',
      },
      {
        type: 'divider',
      },
      {
        key: 'teams',
        icon: '',
        children: renderLimitedListMenuItem({
          listItems: teams ?? [],
          readMoreKey: 'more-teams',
          labelRenderer: teamLabelRenderer,
          readMoreLabelRenderer: readMoreTeamRenderer,
        }),
        label: (
          <span className="text-grey-muted text-xs">
            {i18n.t('label.team-plural')}
          </span>
        ),
        type: 'group',
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: '',
        label: (
          <Typography.Paragraph
            className="font-medium cursor-pointer text-link-color m-b-0"
            onClick={onLogoutHandler}>
            {i18n.t('label.logout')}
          </Typography.Paragraph>
        ),
        type: 'group',
      },
    ],
    [
      currentUser,
      userName,
      selectedPersona,
      teams,
      roles,
      personas,
      showAllPersona,
    ]
  );

  useEffect(() => {
    updateSelectedPersona(
      currentUser?.defaultPersona ?? ({} as EntityReference)
    );
  }, [currentUser?.defaultPersona]);

  return (
    <Dropdown
      menu={{
        items,
        defaultOpenKeys: ['personas', 'roles', 'inheritedRoles', 'teams'],
        rootClassName: 'profile-dropdown',
      }}
      trigger={['click']}>
      <div className="app-user-icon" data-testid="dropdown-profile">
        <div className="d-flex gap-2 w-40 items-center">
          {isImgUrlValid ? (
            <img
              alt="user"
              className="app-bar-user-profile-pic"
              data-testid="app-bar-user-profile-pic"
              referrerPolicy="no-referrer"
              src={profilePicture ?? ''}
              onError={handleOnImageError}
            />
          ) : (
            <ProfilePicture name={currentUser?.name ?? ''} width="36" />
          )}
          <div className="d-flex flex-col">
            <Tooltip title={getEntityName(currentUser)}>
              <Typography.Text className="username truncate w-max-112">
                {getEntityName(currentUser)}
              </Typography.Text>
            </Tooltip>
            <Typography.Text
              className="text-grey-muted text-xs w-28"
              data-testid="default-persona"
              ellipsis={{ tooltip: true }}>
              {isEmpty(selectedPersona)
                ? t('label.default')
                : getEntityName(selectedPersona)}
            </Typography.Text>
          </div>
        </div>
        <DropDownIcon width={16} />
      </div>
    </Dropdown>
  );
};
