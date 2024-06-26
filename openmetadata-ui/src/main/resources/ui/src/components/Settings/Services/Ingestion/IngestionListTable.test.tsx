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

import { render, screen } from '@testing-library/react';
import React from 'react';
import { NO_DATA_PLACEHOLDER } from '../../../../constants/constants';
import { useAirflowStatus } from '../../../../hooks/useAirflowStatus';
import { mockIngestionListTableProps } from '../../../../mocks/IngestionListTable.mock';
import IngestionListTable from './IngestionListTable.component';

jest.mock('../../../common/NextPrevious/NextPrevious', () =>
  jest.fn().mockImplementation(() => <div>nextPrevious</div>)
);
jest.mock('../../../common/Loader/Loader', () =>
  jest.fn().mockImplementation(() => <div>loader</div>)
);

jest.mock(
  '../../../common/Skeleton/CommonSkeletons/ControlElements/ControlElements.component',
  () => jest.fn().mockImplementation(() => <div>ButtonSkeleton</div>)
);

jest.mock('./PipelineActions.component', () =>
  jest.fn().mockImplementation(() => <div>pipelineActions</div>)
);
jest.mock('./IngestionRecentRun/IngestionRecentRuns.component', () => ({
  IngestionRecentRuns: jest
    .fn()
    .mockImplementation(() => <div>ingestionRecentRuns</div>),
}));

jest.mock('../../../../hooks/useAirflowStatus', () => ({
  useAirflowStatus: jest.fn(() => {
    return {
      isFetchingStatus: false,
      platform: 'airflow',
    };
  }),
}));

describe('IngestionListTable tests', () => {
  it('Should display the loader if the isLoading is true', async () => {
    render(<IngestionListTable {...mockIngestionListTableProps} isLoading />);

    const loader = await screen.findByTestId('skeleton-table');

    expect(loader).toBeInTheDocument();
  });

  it('Should not display the loader if the isLoading is false', () => {
    render(
      <IngestionListTable {...mockIngestionListTableProps} isLoading={false} />
    );

    const ingestionListTable = screen.getByTestId('ingestion-list-table');
    const loader = screen.queryByText('loader');

    expect(ingestionListTable).toBeInTheDocument();
    expect(loader).toBeNull();
  });

  it('Should not display the loader if the isLoading is undefined', () => {
    render(
      <IngestionListTable
        {...mockIngestionListTableProps}
        isLoading={undefined}
      />
    );

    const ingestionListTable = screen.getByTestId('ingestion-list-table');
    const loader = screen.queryByText('loader');

    expect(ingestionListTable).toBeInTheDocument();
    expect(loader).toBeNull();
  });

  it('Should display NexPrevious component for list size more than 10 and paging object has after field', () => {
    render(
      <IngestionListTable
        {...mockIngestionListTableProps}
        paging={{
          total: 26,
          after: 'after',
        }}
      />
    );

    const nextPrevious = screen.getByText('nextPrevious');

    expect(nextPrevious).toBeInTheDocument();
  });

  it('Should not display NexPrevious component for list size less than 10', () => {
    render(
      <IngestionListTable
        {...mockIngestionListTableProps}
        paging={{
          total: 4,
        }}
      />
    );

    const nextPrevious = screen.queryByText('nextPrevious');

    expect(nextPrevious).toBeNull();
  });

  it('Should render the ingestion name', () => {
    render(<IngestionListTable {...mockIngestionListTableProps} />);

    const ingestionDagName = screen.getByText(
      'OpenMetadata_elasticSearchReindex'
    );

    expect(ingestionDagName).toBeInTheDocument();
  });

  it('Should render pipeline action component if airflow platform is not disabled', () => {
    render(<IngestionListTable {...mockIngestionListTableProps} />);

    const actionButtons = screen.getByText('pipelineActions');

    expect(actionButtons).toBeInTheDocument();
  });

  it('Should render noDataPlaceholder in ingestion table is airflow platform is disabled', () => {
    (useAirflowStatus as jest.Mock).mockImplementation(() => ({
      isFetchingStatus: false,
      platform: 'disabled',
    }));

    render(<IngestionListTable {...mockIngestionListTableProps} />);

    const noData = screen.getByText(NO_DATA_PLACEHOLDER);

    expect(noData).toBeInTheDocument();
  });

  it('Should render loader in ingestion table is airflow status is fetching', () => {
    (useAirflowStatus as jest.Mock).mockImplementation(() => ({
      isFetchingStatus: true,
      platform: 'disabled',
    }));

    render(<IngestionListTable {...mockIngestionListTableProps} />);

    const loader = screen.getByText('ButtonSkeleton');

    expect(loader).toBeInTheDocument();
  });
});
