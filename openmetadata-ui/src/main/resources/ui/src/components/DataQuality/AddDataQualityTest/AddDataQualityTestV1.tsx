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

import { Col, Row, Typography } from 'antd';
import { AxiosError } from 'axios';
import { t } from 'i18next';
import { isUndefined } from 'lodash';
import Qs from 'qs';
import {
  default as React,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { HTTP_STATUS_CODE } from '../../../constants/Auth.constants';
import { getEntityDetailsPath } from '../../../constants/constants';
import {
  DEFAULT_RANGE_DATA,
  STEPS_FOR_ADD_TEST_CASE,
} from '../../../constants/profiler.constant';
import { EntityTabs, EntityType } from '../../../enums/entity.enum';
import { FormSubmitType } from '../../../enums/form.enum';
import { ProfilerDashboardType } from '../../../enums/table.enum';
import { OwnerType } from '../../../enums/user.enum';
import { CreateTestCase } from '../../../generated/api/tests/createTestCase';
import { TestCase } from '../../../generated/tests/testCase';
import { TestSuite } from '../../../generated/tests/testSuite';
import { useApplicationStore } from '../../../hooks/useApplicationStore';
import { useFqn } from '../../../hooks/useFqn';
import {
  createExecutableTestSuite,
  createTestCase,
  getTestSuiteByName,
} from '../../../rest/testAPI';
import {
  getEntityBreadcrumbs,
  getEntityName,
} from '../../../utils/EntityUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import ResizablePanels from '../../common/ResizablePanels/ResizablePanels';
import SuccessScreen from '../../common/SuccessScreen/SuccessScreen';
import TitleBreadcrumb from '../../common/TitleBreadcrumb/TitleBreadcrumb.component';
import { TitleBreadcrumbProps } from '../../common/TitleBreadcrumb/TitleBreadcrumb.interface';
import { TableProfilerTab } from '../../Database/Profiler/ProfilerDashboard/profilerDashboard.interface';
import SingleColumnProfile from '../../Database/Profiler/TableProfiler/SingleColumnProfile';
import TableProfilerChart from '../../Database/Profiler/TableProfiler/TableProfilerChart/TableProfilerChart';
import IngestionStepper from '../../Settings/Services/Ingestion/IngestionStepper/IngestionStepper.component';
import { AddDataQualityTestProps } from './AddDataQualityTest.interface';
import RightPanel from './components/RightPanel';
import TestCaseForm from './components/TestCaseForm';
import { addTestSuiteRightPanel, INGESTION_DATA } from './rightPanelData';
import TestSuiteIngestion from './TestSuiteIngestion';

const AddDataQualityTestV1: React.FC<AddDataQualityTestProps> = ({
  table,
}: AddDataQualityTestProps) => {
  const { dashboardType } = useParams<{ dashboardType: string }>();

  const { fqn } = useFqn();
  const isColumnFqn = dashboardType === ProfilerDashboardType.COLUMN;
  const isTableFqn = dashboardType === ProfilerDashboardType.TABLE;
  const history = useHistory();
  const [activeServiceStep, setActiveServiceStep] = useState(1);
  const [testCaseData, setTestCaseData] = useState<CreateTestCase>();
  const [testSuiteData, setTestSuiteData] = useState<TestSuite>();
  const [testCaseRes, setTestCaseRes] = useState<TestCase>();
  const [addIngestion, setAddIngestion] = useState(false);
  const { currentUser } = useApplicationStore();

  const breadcrumb = useMemo(() => {
    const data: TitleBreadcrumbProps['titleLinks'] = [
      ...getEntityBreadcrumbs(table, EntityType.TABLE),
      {
        name: getEntityName(table),
        url: getEntityDetailsPath(
          EntityType.TABLE,
          table.fullyQualifiedName ?? '',
          EntityTabs.PROFILER
        ),
      },
      {
        name: t('label.add-entity-test', {
          entity: isColumnFqn ? t('label.column') : t('label.table'),
        }),
        url: '',
        activeTitle: true,
      },
    ];

    return data;
  }, [table, fqn, isColumnFqn]);

  const owner = useMemo(
    () => ({
      id: currentUser?.id ?? '',
      type: OwnerType.USER,
    }),
    [currentUser]
  );

  const handleRedirection = () => {
    history.push({
      pathname: getEntityDetailsPath(
        EntityType.TABLE,
        table.fullyQualifiedName ?? '',
        EntityTabs.PROFILER
      ),
      search: Qs.stringify({ activeTab: TableProfilerTab.DATA_QUALITY }),
    });
  };

  const createTestSuite = async () => {
    const testSuite = {
      name: `${table.fullyQualifiedName}.testSuite`,
      executableEntityReference: table.fullyQualifiedName,
      owner,
    };
    const response = await createExecutableTestSuite(testSuite);
    setTestSuiteData(response);

    return response;
  };

  const fetchTestSuiteByFqn = async (fqn: string) => {
    try {
      const response = await getTestSuiteByName(fqn);
      setTestSuiteData(response);
    } catch (error) {
      setTestSuiteData(undefined);
    }
  };

  useEffect(() => {
    if (table.testSuite?.fullyQualifiedName) {
      fetchTestSuiteByFqn(table.testSuite.fullyQualifiedName);
    }
  }, [table.testSuite]);

  const handleFormSubmit = async (data: CreateTestCase) => {
    setTestCaseData(data);

    try {
      const testSuite = isUndefined(testSuiteData)
        ? await createTestSuite()
        : table.testSuite;

      const testCasePayload: CreateTestCase = {
        ...data,
        owner,
        testSuite: testSuite?.fullyQualifiedName ?? '',
      };

      const testCaseResponse = await createTestCase(testCasePayload);
      setActiveServiceStep(2);
      setTestCaseRes(testCaseResponse);
    } catch (error) {
      if (
        (error as AxiosError).response?.status === HTTP_STATUS_CODE.CONFLICT
      ) {
        showErrorToast(
          t('server.entity-already-exist', {
            entity: t('label.test-case'),
            entityPlural: t('label.test-case-lowercase-plural'),
            name: data.name,
          })
        );
      } else {
        showErrorToast(
          error as AxiosError,
          t('server.create-entity-error', {
            entity: t('label.test-case-lowercase'),
          })
        );
      }
    }
  };

  const RenderSelectedTab = useCallback(() => {
    if (activeServiceStep === 2) {
      const isNewTestSuite = isUndefined(table.testSuite);

      const successMessage = isNewTestSuite ? undefined : (
        <span>
          <span className="font-medium">
            {`"${testCaseRes?.name ?? t('label.test-case')}"`}{' '}
          </span>
          <span>
            {`${t('message.has-been-created-successfully')}.`}
            &nbsp;
            {t('message.this-will-pick-in-next-run')}
          </span>
        </span>
      );

      return (
        <SuccessScreen
          handleIngestionClick={() => setAddIngestion(true)}
          handleViewServiceClick={handleRedirection}
          name={testCaseRes?.name ?? t('label.test-case')}
          showIngestionButton={isNewTestSuite}
          state={FormSubmitType.ADD}
          successMessage={successMessage}
          viewServiceText={t('message.view-test-suite')}
        />
      );
    }

    return (
      <TestCaseForm
        initialValue={testCaseData}
        table={table}
        onCancel={handleRedirection}
        onSubmit={handleFormSubmit}
      />
    );
  }, [activeServiceStep, testCaseData, testCaseRes, handleFormSubmit, table]);

  const { activeColumnFqn } = useMemo(() => {
    const param = location.search;
    const searchData = Qs.parse(
      param.startsWith('?') ? param.substring(1) : param
    );

    return searchData as { activeColumnFqn: string };
  }, [location.search]);

  const secondPanel = (
    <Fragment>
      <RightPanel
        data={
          addIngestion
            ? INGESTION_DATA
            : addTestSuiteRightPanel(
                activeServiceStep,
                isUndefined(table.testSuite),
                {
                  testCase: testCaseData?.name || '',
                  testSuite: testSuiteData?.name || '',
                }
              )
        }
      />
      {isTableFqn && (
        <TableProfilerChart
          entityFqn={fqn}
          showHeader={false}
          tableDetails={table}
        />
      )}
      {isColumnFqn && (
        <SingleColumnProfile
          activeColumnFqn={activeColumnFqn}
          dateRangeObject={DEFAULT_RANGE_DATA}
          tableDetails={table}
        />
      )}
    </Fragment>
  );

  return (
    <ResizablePanels
      firstPanel={{
        children: (
          <div className="max-width-md w-9/10 service-form-container">
            <TitleBreadcrumb titleLinks={breadcrumb} />
            <div className="m-t-md">
              {addIngestion ? (
                <TestSuiteIngestion
                  testSuite={testSuiteData as TestSuite}
                  onCancel={() => setAddIngestion(false)}
                />
              ) : (
                <Row className="p-xs" gutter={[16, 16]}>
                  <Col span={24}>
                    <Typography.Paragraph
                      className="heading text-base"
                      data-testid="header">
                      {t('label.add-entity-test', {
                        entity: isColumnFqn
                          ? t('label.column')
                          : t('label.table'),
                      })}
                    </Typography.Paragraph>
                  </Col>
                  <Col span={24}>
                    <IngestionStepper
                      activeStep={activeServiceStep}
                      steps={STEPS_FOR_ADD_TEST_CASE}
                    />
                  </Col>
                  <Col span={24}>{RenderSelectedTab()}</Col>
                </Row>
              )}
            </div>
          </div>
        ),
        minWidth: 700,
        flex: 0.6,
      }}
      pageTitle={t('label.add-entity', {
        entity: t('label.data-quality-test'),
      })}
      secondPanel={{
        children: secondPanel,
        className: 'p-md p-t-xl',
        minWidth: 400,
        flex: 0.4,
      }}
    />
  );
};

export default AddDataQualityTestV1;
