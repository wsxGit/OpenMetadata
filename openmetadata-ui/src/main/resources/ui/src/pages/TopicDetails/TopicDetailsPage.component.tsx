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
import { compare } from 'fast-json-patch';
import { isUndefined, omitBy, toString } from 'lodash';
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../components/common/Loader/Loader';
import { QueryVote } from '../../components/Database/TableQueries/TableQueries.interface';
import TopicDetails from '../../components/Topic/TopicDetails/TopicDetails.component';
import { getVersionPath } from '../../constants/constants';
import { usePermissionProvider } from '../../context/PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../../context/PermissionProvider/PermissionProvider.interface';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import { EntityType, TabSpecificField } from '../../enums/entity.enum';
import { CreateThread } from '../../generated/api/feed/createThread';
import { Topic } from '../../generated/entity/data/topic';
import { useApplicationStore } from '../../hooks/useApplicationStore';
import { useFqn } from '../../hooks/useFqn';
import { postThread } from '../../rest/feedsAPI';
import {
  addFollower,
  getTopicByFqn,
  patchTopicDetails,
  removeFollower,
  updateTopicVotes,
} from '../../rest/topicsAPI';
import {
  addToRecentViewed,
  getEntityMissingError,
  sortTagsCaseInsensitive,
} from '../../utils/CommonUtils';
import { getEntityName } from '../../utils/EntityUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { showErrorToast } from '../../utils/ToastUtils';

const TopicDetailsPage: FunctionComponent = () => {
  const { t } = useTranslation();
  const { currentUser } = useApplicationStore();
  const USERId = currentUser?.id ?? '';
  const history = useHistory();
  const { getEntityPermissionByFqn } = usePermissionProvider();

  const { fqn: topicFQN } = useFqn();
  const [topicDetails, setTopicDetails] = useState<Topic>({} as Topic);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState(false);

  const [topicPermissions, setTopicPermissions] = useState<OperationPermission>(
    DEFAULT_ENTITY_PERMISSION
  );

  const { id: topicId, version: currentVersion } = topicDetails;

  const saveUpdatedTopicData = (updatedData: Topic) => {
    const jsonPatch = compare(omitBy(topicDetails, isUndefined), updatedData);

    return patchTopicDetails(topicId, jsonPatch);
  };

  const onTopicUpdate = async (updatedData: Topic, key: keyof Topic) => {
    try {
      const res = await saveUpdatedTopicData(updatedData);

      setTopicDetails((previous) => {
        if (key === 'tags') {
          return {
            ...previous,
            version: res.version,
            [key]: sortTagsCaseInsensitive(res.tags ?? []),
          };
        }

        return {
          ...previous,
          version: res.version,
          [key]: res[key],
        };
      });
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const fetchResourcePermission = async (entityFqn: string) => {
    setLoading(true);
    try {
      const permissions = await getEntityPermissionByFqn(
        ResourceEntity.TOPIC,
        entityFqn
      );
      setTopicPermissions(permissions);
    } catch (error) {
      showErrorToast(
        t('server.fetch-entity-permissions-error', {
          entity: entityFqn,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTopicDetail = async (topicFQN: string) => {
    setLoading(true);
    try {
      const res = await getTopicByFqn(topicFQN, {
        fields: [
          TabSpecificField.OWNER,
          TabSpecificField.FOLLOWERS,
          TabSpecificField.TAGS,
          TabSpecificField.DOMAIN,
          TabSpecificField.DATA_PRODUCTS,
          TabSpecificField.VOTES,
          TabSpecificField.EXTENSION,
        ].join(','),
      });
      const { id, fullyQualifiedName, serviceType } = res;

      setTopicDetails(res);

      addToRecentViewed({
        displayName: getEntityName(res),
        entityType: EntityType.TOPIC,
        fqn: fullyQualifiedName ?? '',
        serviceType: serviceType,
        timestamp: 0,
        id: id,
      });
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        setIsError(true);
      } else {
        showErrorToast(
          error as AxiosError,
          t('server.entity-details-fetch-error', {
            entityType: t('label.pipeline'),
            entityName: topicFQN,
          })
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const followTopic = async () => {
    try {
      const res = await addFollower(topicId, USERId);
      const { newValue } = res.changeDescription.fieldsAdded[0];
      setTopicDetails((prev) => ({
        ...prev,
        followers: [...(prev?.followers ?? []), ...newValue],
      }));
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-follow-error', {
          entity: getEntityName(topicDetails),
        })
      );
    }
  };

  const unFollowTopic = async () => {
    try {
      const res = await removeFollower(topicId, USERId);
      const { oldValue } = res.changeDescription.fieldsDeleted[0];
      setTopicDetails((prev) => ({
        ...prev,
        followers: (prev?.followers ?? []).filter(
          (follower) => follower.id !== oldValue[0].id
        ),
      }));
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-unfollow-error', {
          entity: getEntityName(topicDetails),
        })
      );
    }
  };

  const versionHandler = () => {
    currentVersion &&
      history.push(
        getVersionPath(EntityType.TOPIC, topicFQN, toString(currentVersion))
      );
  };

  const createThread = async (data: CreateThread) => {
    try {
      await postThread(data);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.create-entity-error', {
          entity: t('label.conversation'),
        })
      );
    }
  };

  const handleToggleDelete = (version?: number) => {
    setTopicDetails((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        deleted: !prev?.deleted,
        ...(version ? { version } : {}),
      };
    });
  };

  const updateVote = async (data: QueryVote, id: string) => {
    try {
      await updateTopicVotes(id, data);
      const details = await getTopicByFqn(topicFQN, {
        fields: [
          TabSpecificField.OWNER,
          TabSpecificField.FOLLOWERS,
          TabSpecificField.TAGS,
          TabSpecificField.VOTES,
        ].join(','),
      });
      setTopicDetails(details);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const updateTopicDetailsState = useCallback((data) => {
    const updatedData = data as Topic;

    setTopicDetails((data) => ({
      ...(data ?? updatedData),
      version: updatedData.version,
    }));
  }, []);

  useEffect(() => {
    fetchResourcePermission(topicFQN);
  }, [topicFQN]);

  useEffect(() => {
    if (topicPermissions.ViewAll || topicPermissions.ViewBasic) {
      fetchTopicDetail(topicFQN);
    }
  }, [topicPermissions, topicFQN]);

  if (isLoading) {
    return <Loader />;
  }
  if (isError) {
    return (
      <ErrorPlaceHolder>
        {getEntityMissingError('topic', topicFQN)}
      </ErrorPlaceHolder>
    );
  }
  if (!topicPermissions.ViewAll && !topicPermissions.ViewBasic) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  return (
    <TopicDetails
      createThread={createThread}
      fetchTopic={() => fetchTopicDetail(topicFQN)}
      followTopicHandler={followTopic}
      handleToggleDelete={handleToggleDelete}
      topicDetails={topicDetails}
      topicPermissions={topicPermissions}
      unFollowTopicHandler={unFollowTopic}
      updateTopicDetailsState={updateTopicDetailsState}
      versionHandler={versionHandler}
      onTopicUpdate={onTopicUpdate}
      onUpdateVote={updateVote}
    />
  );
};

export default TopicDetailsPage;
