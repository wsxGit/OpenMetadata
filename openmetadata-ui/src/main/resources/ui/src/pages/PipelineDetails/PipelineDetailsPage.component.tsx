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
import { compare, Operation } from 'fast-json-patch';
import { isUndefined, omitBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../components/common/Loader/Loader';
import { QueryVote } from '../../components/Database/TableQueries/TableQueries.interface';
import PipelineDetails from '../../components/Pipeline/PipelineDetails/PipelineDetails.component';
import { getVersionPath } from '../../constants/constants';
import { usePermissionProvider } from '../../context/PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../../context/PermissionProvider/PermissionProvider.interface';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import { EntityType } from '../../enums/entity.enum';
import { Pipeline } from '../../generated/entity/data/pipeline';
import { Paging } from '../../generated/type/paging';
import { useApplicationStore } from '../../hooks/useApplicationStore';
import { useFqn } from '../../hooks/useFqn';
import {
  addFollower,
  getPipelineByFqn,
  patchPipelineDetails,
  removeFollower,
  updatePipelinesVotes,
} from '../../rest/pipelineAPI';
import {
  addToRecentViewed,
  getEntityMissingError,
  sortTagsCaseInsensitive,
} from '../../utils/CommonUtils';
import { getEntityName } from '../../utils/EntityUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import {
  defaultFields,
  getFormattedPipelineDetails,
} from '../../utils/PipelineDetailsUtils';
import { showErrorToast } from '../../utils/ToastUtils';

const PipelineDetailsPage = () => {
  const { t } = useTranslation();
  const { currentUser } = useApplicationStore();
  const USERId = currentUser?.id ?? '';
  const history = useHistory();

  const { fqn: decodedPipelineFQN } = useFqn();
  const [pipelineDetails, setPipelineDetails] = useState<Pipeline>(
    {} as Pipeline
  );

  const [isLoading, setLoading] = useState<boolean>(true);

  const [isError, setIsError] = useState(false);

  const [paging] = useState<Paging>({} as Paging);

  const [pipelinePermissions, setPipelinePermissions] = useState(
    DEFAULT_ENTITY_PERMISSION
  );

  const { getEntityPermissionByFqn } = usePermissionProvider();

  const { followers = [] } = pipelineDetails;

  const fetchResourcePermission = async (entityFqn: string) => {
    setLoading(true);
    try {
      const entityPermission = await getEntityPermissionByFqn(
        ResourceEntity.PIPELINE,
        entityFqn
      );
      setPipelinePermissions(entityPermission);
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

  const { pipelineId, currentVersion } = useMemo(() => {
    return {
      pipelineId: pipelineDetails.id,
      currentVersion: pipelineDetails.version + '',
    };
  }, [pipelineDetails]);

  const saveUpdatedPipelineData = useCallback(
    (updatedData: Pipeline) => {
      const jsonPatch = compare(
        omitBy(pipelineDetails, isUndefined),
        updatedData
      );

      return patchPipelineDetails(pipelineId, jsonPatch);
    },
    [pipelineDetails]
  );

  const fetchPipelineDetail = async (pipelineFQN: string) => {
    setLoading(true);

    try {
      const res = await getPipelineByFqn(pipelineFQN, {
        fields: defaultFields,
      });
      const { id, fullyQualifiedName, serviceType } = res;

      setPipelineDetails(res);

      addToRecentViewed({
        displayName: getEntityName(res),
        entityType: EntityType.PIPELINE,
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
            entityName: decodedPipelineFQN,
          })
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const followPipeline = useCallback(async () => {
    try {
      const res = await addFollower(pipelineId, USERId);
      const { newValue } = res.changeDescription.fieldsAdded[0];
      const newFollowers = [...(followers ?? []), ...newValue];
      setPipelineDetails((prev) => {
        return { ...prev, followers: newFollowers };
      });
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-follow-error', {
          entity: getEntityName(pipelineDetails),
        })
      );
    }
  }, [followers, USERId]);

  const unFollowPipeline = useCallback(async () => {
    try {
      const res = await removeFollower(pipelineId, USERId);
      const { oldValue } = res.changeDescription.fieldsDeleted[0];
      setPipelineDetails((prev) => ({
        ...prev,
        followers: followers.filter(
          (follower) => follower.id !== oldValue[0].id
        ),
      }));
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-unfollow-error', {
          entity: getEntityName(pipelineDetails),
        })
      );
    }
  }, [followers, USERId]);

  const descriptionUpdateHandler = async (updatedPipeline: Pipeline) => {
    try {
      const response = await saveUpdatedPipelineData(updatedPipeline);
      setPipelineDetails(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const settingsUpdateHandler = async (updatedPipeline: Pipeline) => {
    try {
      const res = await saveUpdatedPipelineData(updatedPipeline);
      setPipelineDetails({
        ...res,
        tags: sortTagsCaseInsensitive(res.tags ?? []),
      });
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-updating-error', {
          entity: getEntityName(pipelineDetails),
        })
      );
    }
  };

  const onTaskUpdate = async (jsonPatch: Array<Operation>) => {
    try {
      const response = await patchPipelineDetails(pipelineId, jsonPatch);
      const formattedPipelineDetails = getFormattedPipelineDetails(response);
      setPipelineDetails(formattedPipelineDetails);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const versionHandler = () => {
    history.push(
      getVersionPath(
        EntityType.PIPELINE,
        decodedPipelineFQN,
        currentVersion as string
      )
    );
  };

  const handleExtensionUpdate = async (updatedPipeline: Pipeline) => {
    try {
      const data = await saveUpdatedPipelineData({
        ...pipelineDetails,
        extension: updatedPipeline.extension,
      });
      setPipelineDetails(data);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-updating-error', {
          entity: getEntityName(pipelineDetails),
        })
      );
    }
  };

  const handleToggleDelete = (version?: number) => {
    setPipelineDetails((prev) => {
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
      await updatePipelinesVotes(id, data);
      const details = await getPipelineByFqn(decodedPipelineFQN, {
        fields: defaultFields,
      });
      setPipelineDetails(details);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const updatePipelineDetailsState = useCallback((data) => {
    const updatedData = data as Pipeline;

    setPipelineDetails((data) => ({
      ...(data ?? updatedData),
      version: updatedData.version,
    }));
  }, []);

  useEffect(() => {
    if (pipelinePermissions.ViewAll || pipelinePermissions.ViewBasic) {
      fetchPipelineDetail(decodedPipelineFQN);
    }
  }, [pipelinePermissions, decodedPipelineFQN]);

  useEffect(() => {
    fetchResourcePermission(decodedPipelineFQN);
  }, [decodedPipelineFQN]);

  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return (
      <ErrorPlaceHolder>
        {getEntityMissingError('pipeline', decodedPipelineFQN)}
      </ErrorPlaceHolder>
    );
  }

  if (!pipelinePermissions.ViewAll && !pipelinePermissions.ViewBasic) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  return (
    <PipelineDetails
      descriptionUpdateHandler={descriptionUpdateHandler}
      fetchPipeline={() => fetchPipelineDetail(decodedPipelineFQN)}
      followPipelineHandler={followPipeline}
      handleToggleDelete={handleToggleDelete}
      paging={paging}
      pipelineDetails={pipelineDetails}
      pipelineFQN={decodedPipelineFQN}
      settingsUpdateHandler={settingsUpdateHandler}
      taskUpdateHandler={onTaskUpdate}
      unFollowPipelineHandler={unFollowPipeline}
      updatePipelineDetailsState={updatePipelineDetailsState}
      versionHandler={versionHandler}
      onExtensionUpdate={handleExtensionUpdate}
      onUpdateVote={updateVote}
    />
  );
};

export default PipelineDetailsPage;
