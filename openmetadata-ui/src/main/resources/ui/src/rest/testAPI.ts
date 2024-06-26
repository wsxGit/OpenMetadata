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

import { AxiosResponse } from 'axios';
import { Operation } from 'fast-json-patch';
import { PagingResponse, RestoreRequestType } from 'Models';
import { SORT_ORDER } from '../enums/common.enum';
import { CreateTestCase } from '../generated/api/tests/createTestCase';
import { CreateTestSuite } from '../generated/api/tests/createTestSuite';
import {
  TableData,
  TestCase,
  TestCaseResult,
  TestCaseStatus,
} from '../generated/tests/testCase';
import {
  EntityType,
  TestDefinition,
  TestPlatform,
} from '../generated/tests/testDefinition';
import { TestSuite, TestSummary } from '../generated/tests/testSuite';
import { Paging } from '../generated/type/paging';
import { ListParams } from '../interface/API.interface';
import { getEncodedFqn } from '../utils/StringsUtils';
import APIClient from './index';

export enum TestSuiteType {
  executable = 'executable',
  logical = 'logical',
}
export enum TestCaseType {
  all = 'all',
  table = 'table',
  column = 'column',
}

export type ListTestSuitePrams = ListParams & {
  testSuiteType?: TestSuiteType;
  includeEmptyTestSuites?: boolean;
};
export type ListTestSuitePramsBySearch = ListTestSuitePrams & {
  q?: string;
  sortType?: SORT_ORDER;
  sortNestedMode?: string[];
  sortNestedPath?: string;
  sortField?: string;
  owner?: string;
  offset?: number;
};

export type ListTestCaseParams = ListParams & {
  entityLink?: string;
  testSuiteId?: string;
  includeAllTests?: boolean;
  testCaseStatus?: TestCaseStatus;
  testCaseType?: TestCaseType;
};
export type ListTestCaseParamsBySearch = ListTestCaseParams & {
  q?: string;
  sortType?: SORT_ORDER;
  sortField?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  testPlatforms?: TestPlatform[];
  offset?: number;
  owner?: string;
  tags?: string;
  tier?: string;
  serviceName?: string;
};

export type ListTestDefinitionsParams = ListParams & {
  entityType?: EntityType;
  testPlatform: TestPlatform;
  supportedDataType?: string;
};

export type ListTestCaseResultsParams = Omit<
  ListParams,
  'fields' | 'include'
> & {
  startTs?: number;
  endTs?: number;
};

export type AddTestCaseToLogicalTestSuiteType = {
  testCaseIds: string[];
  testSuiteId: string;
};

const testCaseUrl = '/dataQuality/testCases';
const testSuiteUrl = '/dataQuality/testSuites';
const testDefinitionUrl = '/dataQuality/testDefinitions';

// testCase section
export const getListTestCase = async (params?: ListTestCaseParams) => {
  const response = await APIClient.get<PagingResponse<TestCase[]>>(
    testCaseUrl,
    {
      params,
    }
  );

  return response.data;
};

export const getListTestCaseBySearch = async (
  params?: ListTestCaseParamsBySearch
) => {
  const response = await APIClient.get<PagingResponse<TestCase[]>>(
    `${testCaseUrl}/search/list`,
    {
      params,
    }
  );

  return response.data;
};

export const getListTestCaseResults = async (
  fqn: string,
  params?: ListTestCaseResultsParams
) => {
  const url = `${testCaseUrl}/${getEncodedFqn(fqn)}/testCaseResult`;
  const response = await APIClient.get<{
    data: TestCaseResult[];
    paging: Paging;
  }>(url, {
    params,
  });

  return response.data;
};

export const getTestCaseFailedSampleData = async (id: string) => {
  const url = `${testCaseUrl}/${id}/failedRowsSample`;
  const response = await APIClient.get<TableData>(url);

  return response.data;
};

export const deleteTestCaseFailedSampleData = async (id: string) => {
  const url = `${testCaseUrl}/${id}/failedRowsSample`;
  const response = await APIClient.delete(url);

  return response.data;
};

export const getTestCaseByFqn = async (
  fqn: string,
  params?: { fields?: string[] }
) => {
  const response = await APIClient.get<TestCase>(
    `/dataQuality/testCases/name/${getEncodedFqn(fqn)}`,
    {
      params,
    }
  );

  return response.data;
};
export const getTestCaseById = async (
  id: string,
  params?: Pick<ListParams, 'fields' | 'include'>
) => {
  const response = await APIClient.get<TestCase>(`${testCaseUrl}/${id}`, {
    params,
  });

  return response;
};

export const createTestCase = async (data: CreateTestCase) => {
  const response = await APIClient.post<
    CreateTestCase,
    AxiosResponse<TestCase>
  >(testCaseUrl, data);

  return response.data;
};

export const updateTestCaseById = async (id: string, data: Operation[]) => {
  const response = await APIClient.patch<Operation[], AxiosResponse<TestCase>>(
    `${testCaseUrl}/${id}`,
    data
  );

  return response.data;
};

export const getTestCaseExecutionSummary = async (testSuiteId?: string) => {
  const response = await APIClient.get<TestSummary>(
    `${testSuiteUrl}/executionSummary`,
    { params: { testSuiteId } }
  );

  return response.data;
};

export const addTestCaseToLogicalTestSuite = async (
  data: AddTestCaseToLogicalTestSuiteType
) => {
  const response = await APIClient.put<
    AddTestCaseToLogicalTestSuiteType,
    AxiosResponse<TestSuite>
  >(`${testCaseUrl}/logicalTestCases`, data);

  return response.data;
};

export const removeTestCaseFromTestSuite = async (
  testCaseId: string,
  testSuiteId: string
) => {
  const response = await APIClient.delete<
    AddTestCaseToLogicalTestSuiteType,
    AxiosResponse<TestCase>
  >(`${testCaseUrl}/logicalTestCases/${testSuiteId}/${testCaseId}`);

  return response.data;
};

// testDefinition Section
export const getListTestDefinitions = async (
  params?: ListTestDefinitionsParams
) => {
  const response = await APIClient.get<{
    data: TestDefinition[];
    paging: Paging;
  }>(testDefinitionUrl, {
    params,
  });

  return response.data;
};
export const getTestDefinitionById = async (
  id: string,
  params?: Pick<ListParams, 'fields' | 'include'>
) => {
  const response = await APIClient.get<TestDefinition>(
    `${testDefinitionUrl}/${id}`,
    {
      params,
    }
  );

  return response.data;
};

// testSuite Section
export const getListTestSuites = async (params?: ListTestSuitePrams) => {
  const response = await APIClient.get<{
    data: TestSuite[];
    paging: Paging;
  }>(testSuiteUrl, {
    params,
  });

  return response.data;
};

export const getListTestSuitesBySearch = async (
  params?: ListTestSuitePramsBySearch
) => {
  const response = await APIClient.get<PagingResponse<TestSuite[]>>(
    `${testSuiteUrl}/search/list`,
    {
      params,
    }
  );

  return response.data;
};

export const createTestSuites = async (data: CreateTestSuite) => {
  const response = await APIClient.post<
    CreateTestSuite,
    AxiosResponse<TestSuite>
  >(testSuiteUrl, data);

  return response.data;
};

export const createExecutableTestSuite = async (data: CreateTestSuite) => {
  const response = await APIClient.post<
    CreateTestSuite,
    AxiosResponse<TestSuite>
  >(`${testSuiteUrl}/executable`, data);

  return response.data;
};

export const getTestSuiteByName = async (
  name: string,
  params?: ListTestCaseParams
) => {
  const response = await APIClient.get<TestSuite>(
    `${testSuiteUrl}/name/${getEncodedFqn(name)}`,
    { params }
  );

  return response.data;
};

export const updateTestSuiteById = async (id: string, data: Operation[]) => {
  const response = await APIClient.patch<Operation[], AxiosResponse<TestSuite>>(
    `${testSuiteUrl}/${id}`,
    data
  );

  return response.data;
};

export const restoreTestSuite = async (id: string) => {
  const response = await APIClient.put<
    RestoreRequestType,
    AxiosResponse<TestSuite>
  >('/dataQuality/testSuites/restore', { id });

  return response.data;
};

// Test Result

export const patchTestCaseResult = async ({
  testCaseFqn,
  timestamp,
  patch,
}: {
  testCaseFqn: string;
  timestamp: number;
  patch: Operation[];
}) => {
  const response = await APIClient.patch<Operation[], AxiosResponse<TestSuite>>(
    `${testCaseUrl}/${getEncodedFqn(testCaseFqn)}/testCaseResult/${timestamp}`,
    patch
  );

  return response.data;
};
