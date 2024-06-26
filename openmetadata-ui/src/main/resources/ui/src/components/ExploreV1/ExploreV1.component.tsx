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

import {
  ExclamationCircleOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Col,
  Layout,
  Menu,
  Row,
  Space,
  Switch,
  Typography,
} from 'antd';
import { Content } from 'antd/lib/layout/layout';
import Sider from 'antd/lib/layout/Sider';
import { isEmpty, isString, isUndefined, noop, omit } from 'lodash';
import Qs from 'qs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import { useAdvanceSearch } from '../../components/Explore/AdvanceSearchProvider/AdvanceSearchProvider.component';
import AppliedFilterText from '../../components/Explore/AppliedFilterText/AppliedFilterText';
import EntitySummaryPanel from '../../components/Explore/EntitySummaryPanel/EntitySummaryPanel.component';
import ExploreQuickFilters from '../../components/Explore/ExploreQuickFilters';
import SortingDropDown from '../../components/Explore/SortingDropDown';
import { NULL_OPTION_KEY } from '../../constants/AdvancedSearch.constants';
import {
  SEARCH_INDEXING_APPLICATION,
  SUPPORTED_EMPTY_FILTER_FIELDS,
  TAG_FQN_KEY,
} from '../../constants/explore.constants';
import { ERROR_PLACEHOLDER_TYPE, SORT_ORDER } from '../../enums/common.enum';
import { useApplicationStore } from '../../hooks/useApplicationStore';
import { QueryFieldInterface } from '../../pages/ExplorePage/ExplorePage.interface';
import { getDropDownItems } from '../../utils/AdvancedSearchUtils';
import { Transi18next } from '../../utils/CommonUtils';
import { highlightEntityNameAndDescription } from '../../utils/EntityUtils';
import { getSelectedValuesFromQuickFilter } from '../../utils/Explore.utils';
import { getApplicationDetailsPath } from '../../utils/RouterUtils';
import searchClassBase from '../../utils/SearchClassBase';
import Loader from '../common/Loader/Loader';
import ResizablePanels from '../common/ResizablePanels/ResizablePanels';
import {
  ExploreProps,
  ExploreQuickFilterField,
  ExploreSearchIndex,
} from '../Explore/ExplorePage.interface';
import SearchedData from '../SearchedData/SearchedData';
import { SearchedDataProps } from '../SearchedData/SearchedData.interface';
import './exploreV1.less';

const IndexNotFoundBanner = () => {
  const { theme } = useApplicationStore();
  const { t } = useTranslation();

  return (
    <Alert
      closable
      description={
        <div className="d-flex items-start gap-3">
          <ExclamationCircleOutlined
            style={{
              color: theme.errorColor,
              fontSize: '16px',
            }}
          />
          <div className="d-flex flex-col gap-2">
            <Typography.Text className="font-semibold text-xs">
              {t('server.indexing-error')}
            </Typography.Text>
            <Typography.Paragraph className="m-b-0 text-xs">
              <Transi18next
                i18nKey="message.configure-search-re-index"
                renderElement={
                  <Link
                    className="alert-link"
                    to={getApplicationDetailsPath(SEARCH_INDEXING_APPLICATION)}
                  />
                }
                values={{
                  settings: t('label.search-index-setting-plural'),
                }}
              />
            </Typography.Paragraph>
          </div>
        </div>
      }
      type="error"
    />
  );
};

const ExploreV1: React.FC<ExploreProps> = ({
  aggregations,
  activeTabKey,
  tabItems = [],
  searchResults,
  onChangeAdvancedSearchQuickFilters,
  searchIndex,
  onChangeSearchIndex,
  sortOrder,
  onChangeSortOder,
  sortValue,
  onChangeSortValue,
  onChangeShowDeleted,
  showDeleted,
  onChangePage = noop,
  loading,
  quickFilters,
  isElasticSearchIssue,
}) => {
  const tabsInfo = searchClassBase.getTabsInfo();
  const { t } = useTranslation();
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<
    ExploreQuickFilterField[]
  >([] as ExploreQuickFilterField[]);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [entityDetails, setEntityDetails] =
    useState<SearchedDataProps['data'][number]['_source']>();

  const firstEntity = searchResults?.hits
    ?.hits[0] as SearchedDataProps['data'][number];

  const parsedSearch = useMemo(
    () =>
      Qs.parse(
        location.search.startsWith('?')
          ? location.search.substring(1)
          : location.search
      ),
    [location.search]
  );

  const searchQueryParam = useMemo(
    () => (isString(parsedSearch.search) ? parsedSearch.search : ''),
    [location.search]
  );

  const { toggleModal, sqlQuery, onResetAllFilters } = useAdvanceSearch();

  const handleClosePanel = () => {
    setShowSummaryPanel(false);
  };

  const isAscSortOrder = useMemo(
    () => sortOrder === SORT_ORDER.ASC,
    [sortOrder]
  );
  const sortProps = useMemo(
    () => ({
      className: 'text-base text-grey-muted',
      'data-testid': 'last-updated',
    }),
    []
  );

  const handleSummaryPanelDisplay = useCallback(
    (details: SearchedDataProps['data'][number]['_source']) => {
      setShowSummaryPanel(true);
      setEntityDetails(details);
    },
    []
  );

  const clearFilters = () => {
    // onChangeAdvancedSearchQuickFilters(undefined);
    onResetAllFilters();
  };

  const handleQuickFiltersChange = (data: ExploreQuickFilterField[]) => {
    const must = [] as Array<QueryFieldInterface>;

    // Mapping the selected advanced search quick filter dropdown values
    // to form a queryFilter to pass as a search parameter
    data.forEach((filter) => {
      if (!isEmpty(filter.value)) {
        const should = [] as Array<QueryFieldInterface>;
        filter.value?.forEach((filterValue) => {
          const term = {
            [filter.key]: filterValue.key,
          };

          if (filterValue.key === NULL_OPTION_KEY) {
            should.push({
              bool: {
                must_not: { exists: { field: filter.key } },
              },
            });
          } else {
            should.push({ term });
          }
        });

        if (should.length > 0) {
          must.push({ bool: { should } });
        }
      }
    });

    onChangeAdvancedSearchQuickFilters(
      isEmpty(must)
        ? undefined
        : {
            query: {
              bool: {
                must,
              },
            },
          }
    );
  };

  const handleQuickFiltersValueSelect = (field: ExploreQuickFilterField) => {
    setSelectedQuickFilters((pre) => {
      const data = pre.map((preField) => {
        if (preField.key === field.key) {
          return field;
        } else {
          return preField;
        }
      });

      handleQuickFiltersChange(data);

      return data;
    });
  };

  useEffect(() => {
    const escapeKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClosePanel();
      }
    };
    document.addEventListener('keydown', escapeKeyHandler);

    return () => {
      document.removeEventListener('keydown', escapeKeyHandler);
    };
  }, []);

  useEffect(() => {
    const dropdownItems: Array<{
      label: string;
      key: string;
    }> = getDropDownItems(activeTabKey);

    const selectedValuesFromQuickFilter = getSelectedValuesFromQuickFilter(
      dropdownItems,
      quickFilters
    );

    setSelectedQuickFilters(
      dropdownItems.map((item) => ({
        ...item,
        value: selectedValuesFromQuickFilter?.[item.label] ?? [],
      }))
    );
  }, [activeTabKey, quickFilters]);

  useEffect(() => {
    if (
      !isUndefined(searchResults) &&
      searchResults?.hits?.hits[0] &&
      searchResults?.hits?.hits[0]._index === searchIndex
    ) {
      handleSummaryPanelDisplay(
        highlightEntityNameAndDescription(
          firstEntity._source,
          firstEntity?.highlight
        )
      );
    } else {
      setShowSummaryPanel(false);
      setEntityDetails(undefined);
    }
  }, [searchResults]);

  if (tabItems.length === 0 && !searchQueryParam) {
    return <Loader />;
  }

  return (
    <div className="explore-page bg-white" data-testid="explore-page">
      <div className="w-full h-full">
        {tabItems.length > 0 && (
          <Layout hasSider className="bg-white">
            <Sider className="bg-white border-right" width={270}>
              <Typography.Paragraph className="explore-data-header">
                {t('label.data-asset-plural')}
              </Typography.Paragraph>
              <Menu
                className="custom-menu"
                data-testid="explore-left-panel"
                items={tabItems}
                mode="inline"
                rootClassName="left-container"
                selectedKeys={[activeTabKey]}
                onClick={(info) => {
                  if (info && info.key !== activeTabKey) {
                    onChangeSearchIndex(info.key as ExploreSearchIndex);
                    setShowSummaryPanel(false);
                  }
                }}
              />
            </Sider>
            <Content>
              <Row className="filters-row">
                <Col className="searched-data-container w-full">
                  <Row gutter={[0, 8]}>
                    <Col>
                      <ExploreQuickFilters
                        aggregations={aggregations}
                        fields={selectedQuickFilters}
                        fieldsWithNullValues={SUPPORTED_EMPTY_FILTER_FIELDS}
                        index={activeTabKey}
                        showDeleted={showDeleted}
                        onAdvanceSearch={() => toggleModal(true)}
                        onChangeShowDeleted={onChangeShowDeleted}
                        onFieldValueSelect={handleQuickFiltersValueSelect}
                      />
                    </Col>
                    <Col
                      className="d-flex items-center justify-end gap-4"
                      flex={410}>
                      <span className="flex-center">
                        <Switch
                          checked={showDeleted}
                          data-testid="show-deleted"
                          onChange={onChangeShowDeleted}
                        />
                        <Typography.Text className="p-l-xs text-grey-muted">
                          {t('label.deleted')}
                        </Typography.Text>
                      </span>
                      {(quickFilters || sqlQuery) && (
                        <Typography.Text
                          className="text-primary self-center cursor-pointer"
                          data-testid="clear-filters"
                          onClick={() => clearFilters()}>
                          {t('label.clear-entity', {
                            entity: '',
                          })}
                        </Typography.Text>
                      )}

                      <Typography.Text
                        className="text-primary self-center cursor-pointer"
                        data-testid="advance-search-button"
                        onClick={() => toggleModal(true)}>
                        {t('label.advanced-entity', {
                          entity: '',
                        })}
                      </Typography.Text>
                      <span className="sorting-dropdown-container">
                        <SortingDropDown
                          fieldList={tabsInfo[searchIndex].sortingFields}
                          handleFieldDropDown={onChangeSortValue}
                          sortField={sortValue}
                        />
                        <Button
                          className="p-0"
                          data-testid="sort-order-button"
                          size="small"
                          type="text"
                          onClick={() =>
                            onChangeSortOder(
                              isAscSortOrder ? SORT_ORDER.DESC : SORT_ORDER.ASC
                            )
                          }>
                          {isAscSortOrder ? (
                            <SortAscendingOutlined
                              style={{ fontSize: '14px' }}
                              {...sortProps}
                            />
                          ) : (
                            <SortDescendingOutlined
                              style={{ fontSize: '14px' }}
                              {...sortProps}
                            />
                          )}
                        </Button>
                      </span>
                    </Col>
                    {isElasticSearchIssue ? (
                      <Col span={24}>
                        <IndexNotFoundBanner />
                      </Col>
                    ) : (
                      <></>
                    )}
                    {sqlQuery && (
                      <Col span={24}>
                        <AppliedFilterText
                          filterText={sqlQuery}
                          onEdit={() => toggleModal(true)}
                        />
                      </Col>
                    )}
                  </Row>
                </Col>
              </Row>
              <ResizablePanels
                applyDefaultStyle={false}
                firstPanel={{
                  children: (
                    <Row className="p-t-md">
                      <Col
                        lg={{ offset: 2, span: 19 }}
                        md={{ offset: 0, span: 24 }}>
                        {!loading && !isElasticSearchIssue ? (
                          <SearchedData
                            isFilterSelected
                            data={searchResults?.hits.hits ?? []}
                            filter={parsedSearch}
                            handleSummaryPanelDisplay={
                              handleSummaryPanelDisplay
                            }
                            isSummaryPanelVisible={showSummaryPanel}
                            selectedEntityId={entityDetails?.id || ''}
                            totalValue={searchResults?.hits.total.value ?? 0}
                            onPaginationChange={onChangePage}
                          />
                        ) : (
                          <></>
                        )}
                        {loading ? <Loader /> : <></>}
                      </Col>
                    </Row>
                  ),
                  minWidth: 600,
                  flex: 0.65,
                }}
                hideSecondPanel={
                  !showSummaryPanel && !loading && !entityDetails
                }
                pageTitle={t('label.explore')}
                secondPanel={{
                  children: showSummaryPanel && entityDetails && !loading && (
                    <EntitySummaryPanel
                      entityDetails={{ details: entityDetails }}
                      handleClosePanel={handleClosePanel}
                      highlights={omit(
                        {
                          ...firstEntity?.highlight, // highlights of firstEntity that we get from the query api
                          'tag.name': (
                            selectedQuickFilters?.find(
                              (filterOption) => filterOption.key === TAG_FQN_KEY
                            )?.value ?? []
                          ).map((tagFQN) => tagFQN.key), // finding the tags filter from SelectedQuickFilters and creating the array of selected Tags FQN
                        },
                        ['description', 'displayName']
                      )}
                    />
                  ),
                  minWidth: 400,
                  flex: 0.35,
                  className: 'entity-summary-resizable-right-panel-container',
                }}
              />
            </Content>
          </Layout>
        )}
      </div>

      {searchQueryParam && tabItems.length === 0 && !loading && (
        <Space
          align="center"
          className="w-full flex-center full-height"
          data-testid="no-search-results"
          direction="vertical"
          size={48}>
          <ErrorPlaceHolder
            className="mt-0-important"
            type={ERROR_PLACEHOLDER_TYPE.FILTER}
          />
        </Space>
      )}
      {searchQueryParam && tabItems.length === 0 && loading && <Loader />}
    </div>
  );
};

export default ExploreV1;
