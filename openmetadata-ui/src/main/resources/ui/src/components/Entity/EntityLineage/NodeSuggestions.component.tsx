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

import { Button, Select, Space } from 'antd';
import { AxiosError } from 'axios';
import { capitalize, debounce } from 'lodash';
import React, {
  FC,
  HTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { FQN_SEPARATOR_CHAR } from '../../../constants/char.constants';
import { PAGE_SIZE } from '../../../constants/constants';
import { EntityType, FqnPart } from '../../../enums/entity.enum';
import { SearchIndex } from '../../../enums/search.enum';
import { EntityReference } from '../../../generated/entity/type';
import { searchData } from '../../../rest/miscAPI';
import { getPartialNameFromTableFQN } from '../../../utils/CommonUtils';
import { getEntityNodeIcon } from '../../../utils/EntityLineageUtils';
import { getEntityName } from '../../../utils/EntityUtils';
import serviceUtilClassBase from '../../../utils/ServiceUtilClassBase';
import { showErrorToast } from '../../../utils/ToastUtils';
import { ExploreSearchIndex } from '../../Explore/ExplorePage.interface';
import { SourceType } from '../../SearchedData/SearchedData.interface';
import './node-suggestion.less';

interface EntitySuggestionProps extends HTMLAttributes<HTMLDivElement> {
  onSelectHandler: (value: EntityReference) => void;
  entityType: string;
}

const NodeSuggestions: FC<EntitySuggestionProps> = ({
  entityType,
  onSelectHandler,
}) => {
  const { t } = useTranslation();

  const [data, setData] = useState<Array<SourceType>>([]);

  const [searchValue, setSearchValue] = useState<string>('');

  const getSuggestionLabelHeading = (fqn: string, type: string) => {
    if (type === EntityType.TABLE) {
      const database = getPartialNameFromTableFQN(fqn, [FqnPart.Database]);
      const schema = getPartialNameFromTableFQN(fqn, [FqnPart.Schema]);

      return database && schema
        ? `${database}${FQN_SEPARATOR_CHAR}${schema}`
        : '';
    } else {
      return '';
    }
  };

  const getSearchResults = async (value: string) => {
    try {
      const data = await searchData<ExploreSearchIndex>(
        value,
        1,
        PAGE_SIZE,
        '',
        '',
        '',
        (entityType as ExploreSearchIndex) ?? SearchIndex.TABLE
      );
      const sources = data.data.hits.hits.map((hit) => hit._source);
      setData(sources);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-fetch-error', {
          entity: t('label.suggestion-lowercase-plural'),
        })
      );
    }
  };

  const debounceOnSearch = useCallback(debounce(getSearchResults, 300), []);

  const handleChange = (value: string): void => {
    setSearchValue(value);
    debounceOnSearch(value);
  };

  useEffect(() => {
    getSearchResults(searchValue);
  }, []);

  const Icon = getEntityNodeIcon(entityType);

  return (
    <div className="p-x-xs items-center d-flex" data-testid="suggestion-node">
      <Icon className="m-r-xs" height={16} name="entity-icon" width={16} />
      <Select
        autoFocus
        open
        showSearch
        className="w-76 lineage-node-searchbox"
        data-testid="node-search-box"
        options={(data || []).map((entity) => ({
          value: entity.fullyQualifiedName,
          label: (
            <Button
              block
              className="d-flex items-center node-suggestion-option-btn"
              data-testid={`node-suggestion-${entity.fullyQualifiedName}`}
              key={entity.fullyQualifiedName}
              type="text"
              onClick={(e) => {
                e.stopPropagation(); // Prevent select from closing
                onSelectHandler?.(entity as EntityReference);
              }}>
              <Space size={0}>
                <img
                  alt={entity.serviceType}
                  className="m-r-xs"
                  height="16px"
                  src={serviceUtilClassBase.getServiceTypeLogo(entity)}
                  width="16px"
                />
                <div className="d-flex align-start flex-column flex-1">
                  {entity.entityType === EntityType.TABLE && (
                    <p className="d-block text-xs text-grey-muted w-max-400 truncate p-b-xss">
                      {getSuggestionLabelHeading(
                        entity.fullyQualifiedName ?? '',
                        entity.entityType as string
                      )}
                    </p>
                  )}
                  <p className="text-xs text-grey-muted w-max-400 truncate line-height-normal">
                    {entity.name}
                  </p>
                  <p className="w-max-400 text-sm font-medium truncate">
                    {getEntityName(entity)}
                  </p>
                </div>
              </Space>
            </Button>
          ),
        }))}
        placeholder={`${t('label.search-for-type', {
          type: capitalize(entityType),
        })}s...`}
        popupClassName="lineage-suggestion-select-menu"
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        onSearch={handleChange}
      />
    </div>
  );
};

export default NodeSuggestions;
