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

import { DateRangeObject } from 'Models';
import { CurveType } from 'recharts/types/shape/Curve';
import {
  Column,
  ColumnProfile,
  Table,
} from '../../../../generated/entity/data/table';
import { Thread } from '../../../../generated/entity/feed/thread';
import { TestCase } from '../../../../generated/tests/testCase';
import { TestSuite } from '../../../../generated/tests/testSuite';
import { ListTestCaseParams } from '../../../../rest/testAPI';
import { NextPreviousProps } from '../../../common/NextPrevious/NextPrevious.interface';
import { TitleBreadcrumbProps } from '../../../common/TitleBreadcrumb/TitleBreadcrumb.interface';

export interface ProfilerDashboardProps {
  onTableChange: (table: Table) => void;
  isTestCaseLoading?: boolean;
  table: Table;
  testCases: TestCase[];
  profilerData: ColumnProfile[];
  fetchProfilerData: (
    tableId: string,
    dateRangeObject?: DateRangeObject
  ) => void;
  fetchTestCases: (fqn: string, params?: ListTestCaseParams) => void;
  onTestCaseUpdate: (deleted?: boolean) => void;
}

export type MetricChartType = {
  information: {
    title: string;
    dataKey: string;
    stackId?: string;
    color: string;
    latestValue?: string | number;
  }[];
  data: Record<string, string | number | undefined>[];
};

export interface ProfilerDetailsCardProps {
  showYAxisCategory?: boolean;
  chartCollection: MetricChartType;
  name: string;
  title?: string;
  tickFormatter?: string;
  curveType?: CurveType;
  isLoading?: boolean;
}

export enum ProfilerDashboardTab {
  SUMMARY = 'Summary',
  PROFILER = 'Profiler',
  DATA_QUALITY = 'Data Quality',
}

export enum TableProfilerTab {
  COLUMN_PROFILE = 'Column Profile',
  TABLE_PROFILE = 'Table Profile',
  DATA_QUALITY = 'Data Quality',
}

export type ChartData = {
  name: string;
  proportion?: number;
  value: number;
  timestamp: number;
};

export type ChartCollection = {
  data: ChartData[];
  color: string;
};

export type ChartDataCollection = Record<string, ChartCollection>;

export interface ProfilerTabProps {
  profilerData: ColumnProfile[];
  activeColumnDetails: Column;
  tableProfile: Table['profile'];
}

export interface ProfilerSummaryCardProps {
  title: string;
  data: {
    title: string;
    value: number | string;
  }[];
  showIndicator?: boolean;
}

export interface DataQualityTabProps {
  testCases: TestCase[];
  onTestUpdate?: (testCase?: TestCase) => void;
  afterDeleteAction?: () => void;
  showTableColumn?: boolean;
  isLoading?: boolean;
  onTestCaseResultUpdate?: (data: TestCase) => void;
  pagingData?: NextPreviousProps;
  removeFromTestSuite?: {
    testSuite: TestSuite;
  };
  showPagination?: boolean;
  breadcrumbData?: TitleBreadcrumbProps['titleLinks'];
}

export interface TestSummaryProps {
  data: TestCase;
}

export interface ProfilerLatestValueProps {
  information: MetricChartType['information'];
  tickFormatter?: string;
  stringValue?: boolean;
}

export type TestCaseAction = {
  data: TestCase;
  action: 'UPDATE' | 'DELETE' | 'UPDATE_STATUS';
};

export type TestCaseChartDataType = {
  information: { label: string; color: string }[];
  data: Record<string, string | number | undefined | Thread>[];
};

export interface LineChartRef {
  container: HTMLElement;
}
