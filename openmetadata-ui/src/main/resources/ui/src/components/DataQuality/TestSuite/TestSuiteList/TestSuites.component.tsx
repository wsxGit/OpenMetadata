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
import { Button, Col, Form, Row, Select, Space } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { AxiosError } from 'axios';
import { isEmpty } from 'lodash';
import QueryString from 'qs';
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory, useLocation, useParams } from 'react-router-dom';
import {
  getEntityDetailsPath,
  INITIAL_PAGING_VALUE,
  ROUTES,
} from '../../../../constants/constants';
import { PROGRESS_BAR_COLOR } from '../../../../constants/TestSuite.constant';
import { usePermissionProvider } from '../../../../context/PermissionProvider/PermissionProvider';
import {
  ERROR_PLACEHOLDER_TYPE,
  SORT_ORDER,
} from '../../../../enums/common.enum';
import { EntityTabs, EntityType } from '../../../../enums/entity.enum';
import { EntityReference } from '../../../../generated/entity/type';
import { TestSuite, TestSummary } from '../../../../generated/tests/testCase';
import { usePaging } from '../../../../hooks/paging/usePaging';
import { DataQualityPageTabs } from '../../../../pages/DataQuality/DataQualityPage.interface';
import {
  getListTestSuitesBySearch,
  ListTestSuitePramsBySearch,
  TestSuiteType,
} from '../../../../rest/testAPI';
import { getEntityName } from '../../../../utils/EntityUtils';
import { getTestSuitePath } from '../../../../utils/RouterUtils';
import { showErrorToast } from '../../../../utils/ToastUtils';
import ErrorPlaceHolder from '../../../common/ErrorWithPlaceholder/ErrorPlaceHolder';
import FilterTablePlaceHolder from '../../../common/ErrorWithPlaceholder/FilterTablePlaceHolder';
import NextPrevious from '../../../common/NextPrevious/NextPrevious';
import { PagingHandlerParams } from '../../../common/NextPrevious/NextPrevious.interface';
import { OwnerLabel } from '../../../common/OwnerLabel/OwnerLabel.component';
import Searchbar from '../../../common/SearchBarComponent/SearchBar.component';
import Table from '../../../common/Table/Table';
import { UserTeamSelectableList } from '../../../common/UserTeamSelectableList/UserTeamSelectableList.component';
import { TableProfilerTab } from '../../../Database/Profiler/ProfilerDashboard/profilerDashboard.interface';
import ProfilerProgressWidget from '../../../Database/Profiler/TableProfiler/ProfilerProgressWidget/ProfilerProgressWidget';
import { DataQualitySearchParams } from '../../DataQuality.interface';

export const TestSuites = ({ summaryPanel }: { summaryPanel: ReactNode }) => {
  const { t } = useTranslation();
  const { tab = DataQualityPageTabs.TABLES } =
    useParams<{ tab: DataQualityPageTabs }>();
  const history = useHistory();
  const location = useLocation();

  const params = useMemo(() => {
    const search = location.search;

    const params = QueryString.parse(
      search.startsWith('?') ? search.substring(1) : search
    );

    return params as DataQualitySearchParams;
  }, [location]);
  const { searchValue, owner } = params;
  const selectedOwner = useMemo(
    () => (owner ? JSON.parse(owner) : undefined),
    [owner]
  );

  const { permissions } = usePermissionProvider();
  const { testSuite: testSuitePermission } = permissions;
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const {
    currentPage,
    pageSize,
    paging,
    handlePageChange,
    handlePageSizeChange,
    handlePagingChange,
    showPagination,
  } = usePaging();

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const ownerFilterValue = useMemo(() => {
    return selectedOwner
      ? {
          key: selectedOwner.fullyQualifiedName ?? selectedOwner.name,
          label: getEntityName(selectedOwner),
        }
      : undefined;
  }, [selectedOwner]);
  const columns = useMemo(() => {
    const data: ColumnsType<TestSuite> = [
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => {
          if (a.executable) {
            // Sort for executable test suites
            return (
              a.executableEntityReference?.fullyQualifiedName?.localeCompare(
                b.executableEntityReference?.fullyQualifiedName ?? ''
              ) ?? 0
            );
          } else {
            // Sort for logical test suites
            return (
              a.fullyQualifiedName?.localeCompare(b.fullyQualifiedName ?? '') ??
              0
            );
          }
        },
        sortDirections: ['ascend', 'descend'],
        render: (name, record) => {
          return record.executable ? (
            <Link
              data-testid={name}
              to={{
                pathname: getEntityDetailsPath(
                  EntityType.TABLE,
                  record.executableEntityReference?.fullyQualifiedName ?? '',
                  EntityTabs.PROFILER
                ),
                search: QueryString.stringify({
                  activeTab: TableProfilerTab.DATA_QUALITY,
                }),
              }}>
              {record.executableEntityReference?.fullyQualifiedName ??
                record.executableEntityReference?.name}
            </Link>
          ) : (
            <Link
              data-testid={name}
              to={getTestSuitePath(record.fullyQualifiedName ?? record.name)}>
              {getEntityName(record)}
            </Link>
          );
        },
      },
      {
        title: t('label.test-plural'),
        dataIndex: 'summary',
        key: 'tests',
        render: (value: TestSummary) => value?.total ?? 0,
      },
      {
        title: `${t('label.success')} %`,
        dataIndex: 'summary',
        key: 'success',
        render: (value: TestSuite['summary']) => {
          const percent =
            value?.total && value?.success ? value.success / value.total : 0;

          return (
            <ProfilerProgressWidget
              strokeColor={PROGRESS_BAR_COLOR}
              value={percent}
            />
          );
        },
      },
      {
        title: t('label.owner'),
        dataIndex: 'owner',
        key: 'owner',
        render: (owner: EntityReference) => <OwnerLabel owner={owner} />,
      },
    ];

    return data;
  }, []);

  const fetchTestSuites = async (
    currentPage = INITIAL_PAGING_VALUE,
    params?: ListTestSuitePramsBySearch
  ) => {
    setIsLoading(true);
    try {
      const result = await getListTestSuitesBySearch({
        ...params,
        fields: 'owner,summary',
        q: searchValue ? `*${searchValue}*` : undefined,
        owner: ownerFilterValue?.key,
        offset: (currentPage - 1) * pageSize,
        includeEmptyTestSuites: tab !== DataQualityPageTabs.TABLES,
        testSuiteType:
          tab === DataQualityPageTabs.TABLES
            ? TestSuiteType.executable
            : TestSuiteType.logical,
        sortField: 'testCaseResultSummary.timestamp',
        sortType: SORT_ORDER.DESC,
        sortNestedPath: 'testCaseResultSummary',
        sortNestedMode: ['max'],
      });
      setTestSuites(result.data);
      handlePagingChange(result.paging);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSuitesPageChange = useCallback(
    ({ currentPage }: PagingHandlerParams) => {
      fetchTestSuites(currentPage, { limit: pageSize });
      handlePageChange(currentPage);
    },
    [pageSize, paging]
  );

  const handleSearchParam = (
    value: string,
    key: keyof DataQualitySearchParams
  ) => {
    history.push({
      search: QueryString.stringify({
        ...params,
        [key]: isEmpty(value) ? undefined : value,
      }),
    });
  };

  const handleOwnerSelect = (owner?: EntityReference) => {
    handleSearchParam(owner ? JSON.stringify(owner) : '', 'owner');
  };

  useEffect(() => {
    if (testSuitePermission?.ViewAll || testSuitePermission?.ViewBasic) {
      fetchTestSuites(INITIAL_PAGING_VALUE, {
        limit: pageSize,
      });
    } else {
      setIsLoading(false);
    }
  }, [testSuitePermission, pageSize, searchValue, owner]);

  if (!testSuitePermission?.ViewAll && !testSuitePermission?.ViewBasic) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  return (
    <Row
      className="p-x-lg p-y-md"
      data-testid="test-suite-container"
      gutter={[16, 16]}>
      <Col span={24}>
        <Row justify="space-between">
          <Col>
            <Form layout="inline">
              <Space
                align="center"
                className="w-full justify-between"
                size={16}>
                <Form.Item className="m-0 w-80">
                  <Searchbar
                    removeMargin
                    searchValue={searchValue}
                    onSearch={(value) =>
                      handleSearchParam(value, 'searchValue')
                    }
                  />
                </Form.Item>
                <Form.Item
                  className="m-0"
                  label={t('label.owner')}
                  name="owner">
                  <UserTeamSelectableList
                    hasPermission
                    owner={selectedOwner}
                    onUpdate={(updatedUser) =>
                      handleOwnerSelect(updatedUser as EntityReference)
                    }>
                    <Select
                      data-testid="owner-select-filter"
                      open={false}
                      placeholder={t('label.owner')}
                      value={ownerFilterValue}
                    />
                  </UserTeamSelectableList>
                </Form.Item>
              </Space>
            </Form>
          </Col>
          <Col>
            {tab === DataQualityPageTabs.TEST_SUITES &&
              testSuitePermission?.Create && (
                <Link
                  data-testid="add-test-suite-btn"
                  to={ROUTES.ADD_TEST_SUITES}>
                  <Button type="primary">
                    {t('label.add-entity', { entity: t('label.test-suite') })}
                  </Button>
                </Link>
              )}
          </Col>
        </Row>
      </Col>

      <Col span={24}>{summaryPanel}</Col>
      <Col span={24}>
        <Table
          bordered
          columns={columns}
          data-testid="test-suite-table"
          dataSource={testSuites}
          loading={isLoading}
          locale={{
            emptyText: <FilterTablePlaceHolder />,
          }}
          pagination={false}
          size="small"
        />
      </Col>
      <Col span={24}>
        {showPagination && (
          <NextPrevious
            isNumberBased
            currentPage={currentPage}
            pageSize={pageSize}
            paging={paging}
            pagingHandler={handleTestSuitesPageChange}
            onShowSizeChange={handlePageSizeChange}
          />
        )}
      </Col>
    </Row>
  );
};
