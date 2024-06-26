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

import { act, render, screen } from '@testing-library/react';
import React from 'react';
import {
  getSystemProfileList,
  getTableProfilesList,
} from '../../../../../rest/tableAPI';
import TableProfilerChart from './TableProfilerChart';

const mockFQN = 'testFQN';

jest.mock('react-router-dom', () => ({
  useParams: jest.fn().mockImplementation(() => ({ fqn: mockFQN })),
  useHistory: jest.fn(),
}));
jest.mock('../../../../../rest/tableAPI');
jest.mock('../../ProfilerLatestValue/ProfilerLatestValue', () => {
  return jest.fn().mockImplementation(() => <div>ProfilerLatestValue</div>);
});
jest.mock('../../ProfilerDetailsCard/ProfilerDetailsCard', () => {
  return jest.fn().mockImplementation(() => <div>ProfilerDetailsCard</div>);
});
jest.mock('../../../../Visualisations/Chart/CustomBarChart', () => {
  return jest.fn().mockImplementation(() => <div>CustomBarChart</div>);
});
jest.mock('../../../../Visualisations/Chart/OperationDateBarChart', () => {
  return jest.fn().mockImplementation(() => <div>OperationDateBarChart</div>);
});
jest.mock('../../../../PageHeader/PageHeader.component', () => {
  return jest.fn().mockImplementation(() => <div>PageHeader</div>);
});
jest.mock('../../../../common/DatePickerMenu/DatePickerMenu.component', () => {
  return jest.fn().mockImplementation(() => <div>DatePickerMenu</div>);
});
jest.mock('../NoProfilerBanner/NoProfilerBanner.component', () => {
  return jest.fn().mockImplementation(() => <div>NoProfilerBanner</div>);
});
jest.mock('../../../../common/SummaryCard/SummaryCard.component', () => {
  return {
    SummaryCard: jest.fn().mockImplementation(() => <div>SummaryCard</div>),
  };
});
jest.mock('../../../../../constants/profiler.constant', () => ({
  DEFAULT_RANGE_DATA: {
    startDate: '2022-01-01',
    endDate: '2022-01-02',
  },
  INITIAL_OPERATION_METRIC_VALUE: {},
  INITIAL_ROW_METRIC_VALUE: {},
}));
jest.mock('../TableProfilerProvider', () => ({
  useTableProfiler: jest.fn().mockReturnValue({
    dateRangeObject: {
      startDate: '2022-01-01',
      endDate: '2022-01-02',
    },
    isProfilerDataLoading: false,
    permissions: {
      EditAll: true,
      EditDataProfile: true,
    },
    isTableDeleted: false,
  }),
}));

jest.mock('../../../../../rest/tableAPI', () => ({
  getSystemProfileList: jest.fn(),
  getTableProfilesList: jest.fn(),
}));

jest.mock('../../../../../utils/RouterUtils', () => ({
  getAddCustomMetricPath: jest.fn(),
  getAddDataQualityTableTestPath: jest.fn(),
}));

jest.mock('../../../../common/TabsLabel/TabsLabel.component', () => {
  return jest.fn().mockImplementation(() => <div>TabsLabel</div>);
});

jest.mock('../CustomMetricGraphs/CustomMetricGraphs.component', () => {
  return jest.fn().mockImplementation(() => <div>CustomMetricGraphs</div>);
});

describe('TableProfilerChart component test', () => {
  it('Component should render', async () => {
    const mockGetSystemProfileList = getSystemProfileList as jest.Mock;
    const mockGetTableProfilesList = getTableProfilesList as jest.Mock;
    act(() => {
      render(<TableProfilerChart />);
    });

    expect(
      await screen.findByTestId('table-profiler-chart-container')
    ).toBeInTheDocument();
    expect(await screen.findByTestId('row-metrics')).toBeInTheDocument();
    expect(await screen.findByTestId('operation-metrics')).toBeInTheDocument();
    expect(
      await screen.findByTestId('operation-date-metrics')
    ).toBeInTheDocument();
    expect(await screen.findAllByText('ProfilerLatestValue')).toHaveLength(2);
    expect(
      await screen.findByText('OperationDateBarChart')
    ).toBeInTheDocument();
    expect(await screen.findByText('CustomBarChart')).toBeInTheDocument();
    expect(await screen.findByText('ProfilerDetailsCard')).toBeInTheDocument();
    expect(mockGetSystemProfileList.mock.instances).toHaveLength(1);
    expect(mockGetTableProfilesList.mock.instances).toHaveLength(1);
  });

  it('Api call should done as per proper data', async () => {
    const mockGetSystemProfileList = getSystemProfileList as jest.Mock;
    const mockGetTableProfilesList = getTableProfilesList as jest.Mock;
    await act(async () => {
      render(<TableProfilerChart />);
    });

    // API should be call once
    expect(mockGetSystemProfileList.mock.instances).toHaveLength(1);
    expect(mockGetTableProfilesList.mock.instances).toHaveLength(1);
    // API should be call with FQN value
    expect(mockGetSystemProfileList.mock.calls[0][0]).toEqual(mockFQN);
    expect(mockGetTableProfilesList.mock.calls[0][0]).toEqual(mockFQN);
    // API should be call with proper Param value
    expect(mockGetSystemProfileList.mock.calls[0][1]).toEqual({});
    expect(mockGetTableProfilesList.mock.calls[0][1]).toEqual({});
  });

  it('If TimeRange change API should be call accordingly', async () => {
    const mockGetSystemProfileList = getSystemProfileList as jest.Mock;
    const mockGetTableProfilesList = getTableProfilesList as jest.Mock;

    await act(async () => {
      render(<TableProfilerChart />);
    });

    // API should be call with proper Param value
    expect(mockGetSystemProfileList.mock.calls[0][1]).toEqual({});
    expect(mockGetTableProfilesList.mock.calls[0][1]).toEqual({});
  });
});
