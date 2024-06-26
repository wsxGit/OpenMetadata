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

import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  mockDataInsightApplication,
  mockDataInsightApplicationRun,
  mockIngestionPipeline,
  mockLatestDataInsightApplicationRunLogs,
  mockLogsData,
} from '../../mocks/LogsViewerPage.mock';
import {
  getApplicationByName,
  getExternalApplicationRuns,
  getLatestApplicationRuns,
} from '../../rest/applicationAPI';
import LogsViewerPage from './LogsViewerPage';

jest.mock('react-router-dom', () => ({
  useParams: jest.fn().mockReturnValue({
    logEntityType: 'TestSuite',
    ingestionName: 'ingestion_123456',
  }),
}));

jest.mock('../../utils/LogsClassBase', () => ({
  getLogBreadCrumbs: jest
    .fn()
    .mockReturnValue({ name: 'getLogBreadCrumbs', url: '' }),
}));

jest.mock(
  '../../components/common/TitleBreadcrumb/TitleBreadcrumb.component',
  () => () => <>TitleBreadcrumb.component</>
);
jest.mock('../../components/PageLayoutV1/PageLayoutV1', () =>
  jest.fn().mockImplementation(({ children }) => <div>{children}</div>)
);

jest.mock('react-lazylog', () => ({
  LazyLog: jest
    .fn()
    .mockImplementation(() => <div data-testid="logs">LazyLog</div>),
}));

jest.mock('../../rest/ingestionPipelineAPI', () => ({
  getIngestionPipelineLogById: jest
    .fn()
    .mockImplementation(() => Promise.resolve({ data: mockLogsData })),
  getIngestionPipelineByFqn: jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockIngestionPipeline)),
}));

jest.mock(
  '../../components/Settings/Services/Ingestion/IngestionRecentRun/IngestionRecentRuns.component',
  () => ({
    IngestionRecentRuns: jest
      .fn()
      .mockImplementation(() => <p>IngestionRecentRuns</p>),
  })
);

jest.mock('./LogsViewerPageSkeleton.component', () => {
  return jest.fn().mockImplementation(() => <p>LogsViewerPageSkeleton</p>);
});

jest.mock('../../rest/applicationAPI', () => ({
  getApplicationByName: jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockDataInsightApplication)),
  getExternalApplicationRuns: jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockDataInsightApplicationRun)),
  getLatestApplicationRuns: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(mockLatestDataInsightApplicationRunLogs)
    ),
}));

describe('LogsViewerPage.component', () => {
  it('On initial, component should render', async () => {
    await act(async () => {
      render(<LogsViewerPage />);

      expect(
        await screen.findByText('TitleBreadcrumb.component')
      ).toBeInTheDocument();
    });

    expect(
      await screen.findByText('test-redshift_metadata_ZeCajs9g')
    ).toBeInTheDocument();

    const logElement = await screen.findByTestId('logs');

    expect(logElement).toBeInTheDocument();
  });

  it('should fetch api for application logs', async () => {
    (useParams as jest.Mock).mockReturnValue({
      logEntityType: 'apps',
      fqn: 'DataInsightsApplication',
    });

    await act(async () => {
      render(<LogsViewerPage />);
    });

    expect(getApplicationByName).toHaveBeenCalled();
    expect(getExternalApplicationRuns).toHaveBeenCalled();
    expect(getLatestApplicationRuns).toHaveBeenCalled();
  });

  it('should show basic configuration for application in right panel', async () => {
    (useParams as jest.Mock).mockReturnValue({
      logEntityType: 'apps',
      fqn: 'DataInsightsApplication',
    });

    await act(async () => {
      render(<LogsViewerPage />);
    });

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();

    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('0 0 * * *')).toBeInTheDocument();

    expect(screen.getByText('Recent Runs')).toBeInTheDocument();
    expect(screen.getByText('IngestionRecentRuns')).toBeInTheDocument();
  });
});
