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
import { AxiosError } from 'axios';
import { isEmpty, isEqual, uniqWith } from 'lodash';

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissionProvider } from '../../../context/PermissionProvider/PermissionProvider';
import {
  Suggestion,
  SuggestionType,
} from '../../../generated/entity/feed/suggestion';
import { EntityReference } from '../../../generated/entity/type';
import { useFqn } from '../../../hooks/useFqn';
import { usePub } from '../../../hooks/usePubSub';
import {
  aproveRejectAllSuggestions,
  getSuggestionsList,
  updateSuggestionStatus,
} from '../../../rest/suggestionsAPI';
import { showErrorToast } from '../../../utils/ToastUtils';
import {
  SuggestionAction,
  SuggestionsContextType,
} from './SuggestionsProvider.interface';

export const SuggestionsContext = createContext({} as SuggestionsContextType);

const SuggestionsProvider = ({ children }: { children?: ReactNode }) => {
  const { t } = useTranslation();
  const { fqn: entityFqn } = useFqn();
  const [activeUser, setActiveUser] = useState<EntityReference>();
  const [loadingAccept, setLoadingAccept] = useState(false);
  const [loadingReject, setLoadingReject] = useState(false);

  const [allSuggestionsUsers, setAllSuggestionsUsers] = useState<
    EntityReference[]
  >([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsByUser, setSuggestionsByUser] = useState<
    Map<string, Suggestion[]>
  >(new Map());
  const publish = usePub();

  const [loading, setLoading] = useState(false);
  const refreshEntity = useRef<(suggestion: Suggestion) => void>();
  const { permissions } = usePermissionProvider();

  const fetchSuggestions = useCallback(async (entityFQN: string) => {
    setLoading(true);
    try {
      const { data } = await getSuggestionsList({
        entityFQN,
      });
      setSuggestions(data);

      const allUsersData = data.map(
        (suggestion) => suggestion.createdBy as EntityReference
      );
      const uniqueUsers = uniqWith(allUsersData, isEqual);
      setAllSuggestionsUsers(uniqueUsers);

      const groupedSuggestions = data.reduce((acc, suggestion) => {
        const createdBy = suggestion?.createdBy?.name ?? '';
        if (!acc.has(createdBy)) {
          acc.set(createdBy, []);
        }
        acc.get(createdBy)?.push(suggestion);

        return acc;
      }, new Map() as Map<string, Suggestion[]>);

      setSuggestionsByUser(groupedSuggestions);
    } catch (err) {
      showErrorToast(
        err as AxiosError,
        t('server.entity-fetch-error', {
          entity: t('label.lineage-data-lowercase'),
        })
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptRejectSuggestion = useCallback(
    async (suggestion: Suggestion, status: SuggestionAction) => {
      try {
        await updateSuggestionStatus(suggestion, status);
        await fetchSuggestions(entityFqn);
        if (status === SuggestionAction.Accept) {
          // call component refresh function
          publish('updateDetails', suggestion);
        }
      } catch (err) {
        showErrorToast(err as AxiosError);
      }
    },
    [entityFqn, refreshEntity]
  );

  const onUpdateActiveUser = useCallback(
    (user?: EntityReference) => {
      setActiveUser(user);
    },
    [suggestionsByUser]
  );

  const selectedUserSuggestions = useMemo(() => {
    return suggestionsByUser.get(activeUser?.name ?? '') ?? [];
  }, [activeUser, suggestionsByUser]);

  const acceptRejectAllSuggestions = useCallback(
    async (suggestionType: SuggestionType, status: SuggestionAction) => {
      if (status === SuggestionAction.Accept) {
        setLoadingAccept(true);
      } else {
        setLoadingReject(true);
      }
      try {
        await aproveRejectAllSuggestions(
          activeUser?.id ?? '',
          entityFqn,
          suggestionType,
          status
        );

        await fetchSuggestions(entityFqn);
        if (status === SuggestionAction.Accept) {
          selectedUserSuggestions.forEach((suggestion) => {
            publish('updateDetails', suggestion);
          });
        }
        setActiveUser(undefined);
      } catch (err) {
        showErrorToast(err as AxiosError);
      } finally {
        setLoadingAccept(false);
        setLoadingReject(false);
      }
    },
    [activeUser, entityFqn, selectedUserSuggestions]
  );

  useEffect(() => {
    if (!isEmpty(permissions) && !isEmpty(entityFqn)) {
      fetchSuggestions(entityFqn);
    }
  }, [entityFqn, permissions]);

  const suggestionsContextObj = useMemo(() => {
    return {
      suggestions,
      suggestionsByUser,
      selectedUserSuggestions,
      entityFqn,
      loading,
      loadingAccept,
      loadingReject,
      allSuggestionsUsers,
      onUpdateActiveUser,
      fetchSuggestions,
      acceptRejectSuggestion,
      acceptRejectAllSuggestions,
    };
  }, [
    suggestions,
    suggestionsByUser,
    selectedUserSuggestions,
    entityFqn,
    loading,
    loadingAccept,
    loadingReject,
    allSuggestionsUsers,
    onUpdateActiveUser,
    fetchSuggestions,
    acceptRejectSuggestion,
    acceptRejectAllSuggestions,
  ]);

  return (
    <SuggestionsContext.Provider value={suggestionsContextObj}>
      {children}
    </SuggestionsContext.Provider>
  );
};

export const useSuggestionsContext = () => useContext(SuggestionsContext);

export default SuggestionsProvider;
