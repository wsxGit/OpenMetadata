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
import { Button, Popover, Space, Tabs, Tooltip, Typography } from 'antd';
import { isArray, isEmpty, noop, toString } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as IconTeamsGrey } from '../../../assets/svg/teams-grey.svg';
import {
  ADD_USER_CONTAINER_HEIGHT,
  DE_ACTIVE_COLOR,
  PAGE_SIZE_MEDIUM,
} from '../../../constants/constants';
import { EntityType } from '../../../enums/entity.enum';
import { SearchIndex } from '../../../enums/search.enum';
import { EntityReference } from '../../../generated/entity/data/table';
import { searchData } from '../../../rest/miscAPI';
import { getUsers } from '../../../rest/userAPI';
import {
  formatTeamsResponse,
  formatUsersResponse,
} from '../../../utils/APIUtils';
import { getCountBadge } from '../../../utils/CommonUtils';
import {
  getEntityName,
  getEntityReferenceListFromEntities,
} from '../../../utils/EntityUtils';
import { SelectableList } from '../SelectableList/SelectableList.component';
import { UserTag } from '../UserTag/UserTag.component';
import { UserTagSize } from '../UserTag/UserTag.interface';
import './user-team-selectable-list.less';
import { UserSelectDropdownProps } from './UserTeamSelectableList.interface';

export const TeamListItemRenderer = (props: EntityReference) => {
  return (
    <Space>
      <Icon component={IconTeamsGrey} style={{ fontSize: '16px' }} />
      <Typography.Text>{getEntityName(props)}</Typography.Text>
    </Space>
  );
};

export const UserTeamSelectableList = ({
  hasPermission,
  owner,
  onUpdate = noop,
  children,
  popoverProps,
  multiple = { user: false, team: false },
  label,
  previewSelected = false,
  listHeight = ADD_USER_CONTAINER_HEIGHT,
}: UserSelectDropdownProps) => {
  const { t } = useTranslation();
  const [popupVisible, setPopupVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'teams' | 'users'>('teams');
  const [count, setCount] = useState({ team: 0, user: 0 });
  const [selectedUsers, setSelectedUsers] = useState<EntityReference[]>([]);

  const ownerType = useMemo(() => {
    if (owner) {
      if (Array.isArray(owner)) {
        return owner?.[0]?.type ?? EntityType.TEAM;
      } else {
        return owner.type;
      }
    }

    return EntityType.TEAM;
  }, [owner]);

  const isMultiUser = multiple.user;
  const isMultiTeam = multiple.team;

  const { defaultUsers, defaultTeams } = useMemo(() => {
    return {
      defaultUsers:
        selectedUsers?.filter((item) => item.type === EntityType.USER) ?? [],
      defaultTeams:
        selectedUsers?.filter((item) => item.type === EntityType.TEAM) ?? [],
    };
  }, [selectedUsers]);

  const reset = () => {
    let selectedUsers: EntityReference[] = [];
    if (isArray(owner)) {
      selectedUsers = owner;
    } else if (owner) {
      selectedUsers = [owner];
    }
    setSelectedUsers(selectedUsers);
  };

  const fetchUserOptions = async (searchText: string, after?: string) => {
    if (searchText) {
      try {
        const res = await searchData(
          searchText,
          1,
          PAGE_SIZE_MEDIUM,
          'isBot:false',
          '',
          '',
          SearchIndex.USER
        );

        const data = getEntityReferenceListFromEntities(
          formatUsersResponse(res.data.hits.hits),
          EntityType.USER
        );
        setCount((pre) => ({ ...pre, user: res.data.hits.total.value }));

        return { data, paging: { total: res.data.hits.total.value } };
      } catch (error) {
        return { data: [], paging: { total: 0 } };
      }
    } else {
      try {
        const { data, paging } = await getUsers({
          limit: PAGE_SIZE_MEDIUM,
          after: after ?? undefined,
          isBot: false,
        });
        const filterData = getEntityReferenceListFromEntities(
          data,
          EntityType.USER
        );

        setCount((pre) => ({ ...pre, user: paging.total }));

        return { data: filterData, paging };
      } catch (error) {
        return { data: [], paging: { total: 0 } };
      }
    }
  };

  const fetchTeamOptions = async (searchText: string, after?: string) => {
    const afterPage = isNaN(Number(after)) ? 1 : Number(after);

    try {
      const res = await searchData(
        searchText || '',
        afterPage,
        PAGE_SIZE_MEDIUM,
        'teamType:Group',
        'displayName.keyword',
        'asc',
        SearchIndex.TEAM
      );

      const data = getEntityReferenceListFromEntities(
        formatTeamsResponse(res.data.hits.hits),
        EntityType.TEAM
      );

      setCount((pre) => ({ ...pre, team: res.data.hits.total.value }));

      return {
        data,
        paging: {
          total: res.data.hits.total.value,
          after: toString(afterPage + 1),
        },
      };
    } catch (error) {
      return { data: [], paging: { total: 0 } };
    }
  };

  const handleUpdate = async (updateItems: EntityReference[]) => {
    const isMulti =
      (activeTab === 'teams' && isMultiTeam) ||
      (activeTab === 'users' && isMultiUser);

    let updateData;
    if (isEmpty(updateItems)) {
      updateData = undefined;
    } else if (isMulti) {
      updateData = updateItems;
    } else {
      updateData = {
        id: updateItems[0].id,
        type: activeTab === 'teams' ? EntityType.TEAM : EntityType.USER,
        name: updateItems[0].name,
        fullyQualifiedName: updateItems[0].fullyQualifiedName,
        displayName: updateItems[0].displayName,
      };
    }

    await onUpdate(updateData);
    setPopupVisible(false);
  };

  // Fetch and store count for Users tab
  const getUserCount = async () => {
    const res = await searchData(
      '',
      1,
      0,
      'isBot:false',
      '',
      '',
      SearchIndex.USER
    );

    setCount((pre) => ({ ...pre, user: res.data.hits.total.value }));
  };
  const getTeamCount = async () => {
    const res = await searchData(
      '',
      1,
      0,
      'teamType:Group',
      '',
      '',
      SearchIndex.TEAM
    );

    setCount((pre) => ({ ...pre, team: res.data.hits.total.value }));
  };

  const init = async () => {
    if (popupVisible) {
      reset();
      if (ownerType === EntityType.USER) {
        await getTeamCount();
        setActiveTab('users');
      } else {
        await getUserCount();
        setActiveTab('teams');
      }
    }
  };

  const openPopover = useCallback(
    (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
      e.stopPropagation();
      setPopupVisible(true);
    },
    []
  );

  const onRemove = (id: string) => {
    setSelectedUsers((prevUsers) => {
      const removedUser = prevUsers.find((user) => user.id === id);
      const isTeamId = removedUser && removedUser.type === 'team';
      const isUserId = removedUser && removedUser.type === 'user';

      const updatedUsers = prevUsers.filter((user) => user.id !== id);

      // Check if multi flag is false, then we should call the update function
      if ((isTeamId && !isMultiTeam) || (isUserId && !isMultiUser)) {
        handleUpdate(updatedUsers);
      }

      return updatedUsers;
    });
  };

  const handleChange = (selectedItems: EntityReference[]) => {
    setSelectedUsers(selectedItems);
  };

  useEffect(() => {
    init();
  }, [popupVisible]);

  return (
    <Popover
      destroyTooltipOnHide
      content={
        <>
          {previewSelected && (
            <Space
              className="user-team-popover-header w-full p-x-sm p-y-md"
              direction="vertical"
              size={8}>
              <Typography.Text className="text-grey-muted">
                {t('label.selected-entity', {
                  entity: label ?? t('label.owner'),
                })}
              </Typography.Text>
              <div className="user-team-popover-header-content">
                {selectedUsers.map((user) => {
                  return (
                    <UserTag
                      closable
                      avatarType="outlined"
                      className="user-team-pills"
                      id={user.name ?? ''}
                      isTeam={user.type === EntityType.TEAM}
                      key={user.id}
                      name={getEntityName(user)}
                      size={UserTagSize.small}
                      onRemove={() => onRemove(user.id)}
                    />
                  );
                })}
              </div>
            </Space>
          )}

          <Tabs
            centered
            activeKey={activeTab}
            className="select-owner-tabs"
            data-testid="select-owner-tabs"
            destroyInactiveTabPane={false}
            items={[
              {
                label: (
                  <>
                    {t('label.team-plural')}{' '}
                    {getCountBadge(count.team, '', activeTab === 'teams')}
                  </>
                ),
                key: 'teams',
                children: (
                  <SelectableList
                    customTagRenderer={TeamListItemRenderer}
                    fetchOptions={fetchTeamOptions}
                    height={listHeight}
                    multiSelect={isMultiTeam}
                    searchBarDataTestId="owner-select-teams-search-bar"
                    searchPlaceholder={t('label.search-for-type', {
                      type: t('label.team'),
                    })}
                    selectedItems={defaultTeams}
                    onCancel={() => setPopupVisible(false)}
                    onChange={handleChange}
                    onUpdate={handleUpdate}
                  />
                ),
              },
              {
                label: (
                  <>
                    {t('label.user-plural')}
                    {getCountBadge(count.user, '', activeTab === 'users')}
                  </>
                ),
                key: 'users',
                children: (
                  <SelectableList
                    fetchOptions={fetchUserOptions}
                    height={listHeight}
                    multiSelect={isMultiUser}
                    searchBarDataTestId="owner-select-users-search-bar"
                    searchPlaceholder={t('label.search-for-type', {
                      type: t('label.user'),
                    })}
                    selectedItems={defaultUsers}
                    onCancel={() => setPopupVisible(false)}
                    onChange={handleChange}
                    onUpdate={handleUpdate}
                  />
                ),
              },
            ]}
            size="small"
            onChange={(key: string) => setActiveTab(key as 'teams' | 'users')}
            // Used div to stop click propagation event anywhere in the component to parent
            // Users.component collapsible panel
            onClick={(e) => e.stopPropagation()}
          />
        </>
      }
      open={popupVisible}
      overlayClassName="user-team-select-popover card-shadow"
      placement="bottomRight"
      showArrow={false}
      trigger="click"
      onOpenChange={setPopupVisible}
      {...popoverProps}>
      {children ??
        (hasPermission && (
          <Tooltip
            title={
              !popupVisible &&
              t('label.edit-entity', {
                entity: t('label.owner'),
              })
            }>
            <Button
              className="flex-center p-0"
              data-testid="edit-owner"
              icon={<EditIcon color={DE_ACTIVE_COLOR} width="14px" />}
              size="small"
              type="text"
              onClick={openPopover}
            />
          </Tooltip>
        ))}
    </Popover>
  );
};
