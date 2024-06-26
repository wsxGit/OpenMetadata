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
import { CloseOutlined, DragOutlined } from '@ant-design/icons';
import { Button, Space, Tabs, Typography } from 'antd';
import { AxiosError } from 'axios';
import { isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import { ROUTES } from '../../../../constants/constants';
import { FEED_COUNT_INITIAL_DATA } from '../../../../constants/entity.constants';
import { mockFeedData } from '../../../../constants/mockTourData.constants';
import { useTourProvider } from '../../../../context/TourProvider/TourProvider';
import { EntityTabs, EntityType } from '../../../../enums/entity.enum';
import { FeedFilter } from '../../../../enums/mydata.enum';
import {
  ThreadTaskStatus,
  ThreadType,
} from '../../../../generated/entity/feed/thread';
import { useApplicationStore } from '../../../../hooks/useApplicationStore';
import { FeedCounts } from '../../../../interface/feed.interface';
import { WidgetCommonProps } from '../../../../pages/CustomizablePage/CustomizablePage.interface';
import { getFeedCount } from '../../../../rest/feedsAPI';
import { getCountBadge, Transi18next } from '../../../../utils/CommonUtils';
import entityUtilClassBase from '../../../../utils/EntityUtilClassBase';
import { getEntityUserLink } from '../../../../utils/EntityUtils';
import { showErrorToast } from '../../../../utils/ToastUtils';
import ActivityFeedListV1 from '../../../ActivityFeed/ActivityFeedList/ActivityFeedListV1.component';
import { useActivityFeedProvider } from '../../../ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTabs } from '../../../ActivityFeed/ActivityFeedTab/ActivityFeedTab.interface';
import FeedsFilterPopover from '../../../common/FeedsFilterPopover/FeedsFilterPopover.component';
import './feeds-widget.less';

const FeedsWidget = ({
  isEditView = false,
  handleRemoveWidget,
  widgetKey,
}: WidgetCommonProps) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { isTourOpen } = useTourProvider();
  const { currentUser } = useApplicationStore();
  const [activeTab, setActiveTab] = useState<ActivityFeedTabs>(
    ActivityFeedTabs.ALL
  );
  const { loading, entityThread, entityPaging, getFeedData } =
    useActivityFeedProvider();
  const [count, setCount] = useState<FeedCounts>(FEED_COUNT_INITIAL_DATA);

  const [defaultFilter, setDefaultFilter] = useState<FeedFilter>(
    currentUser?.isAdmin ? FeedFilter.ALL : FeedFilter.OWNER_OR_FOLLOWS
  );

  useEffect(() => {
    if (activeTab === ActivityFeedTabs.ALL) {
      getFeedData(defaultFilter, undefined, ThreadType.Conversation);
    } else if (activeTab === ActivityFeedTabs.MENTIONS) {
      getFeedData(FeedFilter.MENTIONS);
    } else if (activeTab === ActivityFeedTabs.TASKS) {
      getFeedData(
        FeedFilter.OWNER,
        undefined,
        ThreadType.Task,
        undefined,
        undefined,
        ThreadTaskStatus.Open
      );
    }
  }, [activeTab, defaultFilter]);

  const mentionCountBadge = useMemo(
    () =>
      getCountBadge(
        count.mentionCount,
        '',
        activeTab === ActivityFeedTabs.MENTIONS
      ),
    [count.mentionCount, activeTab]
  );

  const taskCountBadge = useMemo(
    () =>
      getCountBadge(
        count.openTaskCount,
        '',
        activeTab === ActivityFeedTabs.TASKS
      ),
    [count.openTaskCount, activeTab]
  );

  const onTabChange = (key: string) => setActiveTab(key as ActivityFeedTabs);

  const redirectToUserPage = useCallback(() => {
    history.push(
      entityUtilClassBase.getEntityLink(
        EntityType.USER,
        currentUser?.name as string,
        EntityTabs.ACTIVITY_FEED,
        activeTab
      )
    );
  }, [activeTab, currentUser]);

  const moreButton = useMemo(() => {
    if (!loading && entityPaging.after) {
      return (
        <div className="p-x-md p-b-md">
          <Button className="w-full" onClick={redirectToUserPage}>
            <Typography.Text className="text-primary">
              {t('label.more')}
            </Typography.Text>
          </Button>
        </div>
      );
    }

    return null;
  }, [loading, entityPaging, redirectToUserPage]);
  const onFilterUpdate = (filter: FeedFilter) => {
    setDefaultFilter(filter);
  };

  const fetchFeedsCount = async () => {
    try {
      const res = await getFeedCount(
        getEntityUserLink(currentUser?.name ?? '')
      );
      setCount((prev) => ({
        ...prev,
        openTaskCount: res?.[0]?.openTaskCount ?? 0,

        mentionCount: res?.[0]?.mentionCount ?? 0,
      }));
    } catch (err) {
      showErrorToast(err as AxiosError, t('server.entity-feed-fetch-error'));
    }
  };

  useEffect(() => {
    setDefaultFilter(
      currentUser?.isAdmin ? FeedFilter.ALL : FeedFilter.OWNER_OR_FOLLOWS
    );
    fetchFeedsCount();
  }, [currentUser]);

  const threads = useMemo(() => {
    if (activeTab === 'tasks') {
      return entityThread.filter(
        (thread) => thread.task?.status === ThreadTaskStatus.Open
      );
    }

    return entityThread;
  }, [activeTab, entityThread]);

  const handleCloseClick = useCallback(() => {
    !isUndefined(handleRemoveWidget) && handleRemoveWidget(widgetKey);
  }, [widgetKey]);

  return (
    <div
      className="feeds-widget-container h-full"
      data-testid="activity-feed-widget">
      <Tabs
        destroyInactiveTabPane
        className="h-full"
        items={[
          {
            label: t('label.all'),
            key: ActivityFeedTabs.ALL,
            children: (
              <>
                <ActivityFeedListV1
                  emptyPlaceholderText={
                    <Transi18next
                      i18nKey="message.no-activity-feed"
                      renderElement={
                        <Link
                          rel="noreferrer"
                          to={{ pathname: ROUTES.EXPLORE }}
                        />
                      }
                      values={{
                        explored: t('message.have-not-explored-yet'),
                      }}
                    />
                  }
                  feedList={isTourOpen ? mockFeedData : threads}
                  hidePopover={isEditView}
                  isLoading={loading && !isTourOpen}
                  showThread={false}
                />
                {moreButton}
              </>
            ),
          },
          {
            label: (
              <>
                {`@${t('label.mention-plural')}`}
                {mentionCountBadge}
              </>
            ),
            key: ActivityFeedTabs.MENTIONS,
            children: (
              <>
                <ActivityFeedListV1
                  emptyPlaceholderText={t('message.no-mentions')}
                  feedList={threads}
                  hidePopover={isEditView}
                  isLoading={loading}
                  showThread={false}
                />
                {moreButton}
              </>
            ),
          },
          {
            label: (
              <>
                {`${t('label.task-plural')} `}
                {taskCountBadge}
              </>
            ),
            key: ActivityFeedTabs.TASKS,
            children: (
              <>
                <ActivityFeedListV1
                  emptyPlaceholderText={t('message.no-open-tasks')}
                  feedList={threads}
                  hidePopover={isEditView}
                  isLoading={loading}
                  showThread={false}
                />
                {moreButton}
              </>
            ),
          },
        ]}
        tabBarExtraContent={
          <Space>
            {activeTab === ActivityFeedTabs.ALL && (
              <FeedsFilterPopover
                defaultFilter={
                  currentUser?.isAdmin
                    ? FeedFilter.ALL
                    : FeedFilter.OWNER_OR_FOLLOWS
                }
                onUpdate={onFilterUpdate}
              />
            )}
            {isEditView && (
              <>
                <DragOutlined
                  className="drag-widget-icon cursor-pointer"
                  data-testid="drag-widget-button"
                  size={14}
                />
                <CloseOutlined
                  data-testid="remove-widget-button"
                  size={14}
                  onClick={handleCloseClick}
                />
              </>
            )}
          </Space>
        }
        onChange={onTabChange}
      />
    </div>
  );
};

export default FeedsWidget;
