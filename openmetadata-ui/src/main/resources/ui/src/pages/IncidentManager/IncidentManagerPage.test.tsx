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
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { getListTestCaseIncidentStatus } from '../../rest/incidentManagerAPI';
import IncidentManagerPage from './IncidentManagerPage';

jest.mock('../../components/common/NextPrevious/NextPrevious', () => {
  return jest.fn().mockImplementation(() => <div>NextPrevious.component</div>);
});
jest.mock(
  '../../components/common/DatePickerMenu/DatePickerMenu.component',
  () => {
    return jest.fn().mockImplementation(({ handleDateRangeChange }) => (
      <div>
        <p>DatePickerMenu.component</p>
        <button
          data-testid="time-filter"
          onClick={() =>
            handleDateRangeChange({
              startTs: 1709556624254,
              endTs: 1710161424255,
            })
          }>
          time filter
        </button>
      </div>
    ));
  }
);
jest.mock('../../components/PageLayoutV1/PageLayoutV1', () => {
  return jest.fn().mockImplementation(({ children }) => <div>{children}</div>);
});
jest.mock('../TasksPage/shared/Assignees', () => {
  return jest.fn().mockImplementation(() => <div>Assignees.component</div>);
});
jest.mock('../../components/common/AsyncSelect/AsyncSelect', () => ({
  AsyncSelect: jest
    .fn()
    .mockImplementation(() => <div>AsyncSelect.component</div>),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: jest.fn().mockImplementation(() => <div>Link</div>),
}));
jest.mock('../../context/PermissionProvider/PermissionProvider', () => ({
  usePermissionProvider: jest.fn().mockReturnValue({
    permissions: {
      testCase: {
        Create: true,
        Delete: true,
        ViewAll: true,
        EditAll: true,
        EditDescription: true,
        EditDisplayName: true,
        EditCustomFields: true,
      },
    },
  }),
}));
jest.mock('../../hooks/paging/usePaging', () => ({
  usePaging: jest.fn().mockReturnValue({
    currentPage: 1,
    showPagination: true,
    pageSize: 10,
    handlePageChange: jest.fn(),
    handlePagingChange: jest.fn(),
    handlePageSizeChange: jest.fn(),
  }),
}));
jest.mock('../../rest/incidentManagerAPI', () => ({
  getListTestCaseIncidentStatus: jest
    .fn()
    .mockImplementation(() => Promise.resolve({ data: [] })),
  updateTestCaseIncidentById: jest.fn(),
}));
jest.mock('../../rest/searchAPI', () => ({
  searchQuery: jest
    .fn()
    .mockImplementation(() => Promise.resolve({ hits: { hits: [] } })),
}));

describe('IncidentManagerPage', () => {
  it('should render component', async () => {
    render(<IncidentManagerPage />);

    expect(await screen.findByTestId('page-title')).toBeInTheDocument();
    expect(await screen.findByTestId('page-sub-title')).toBeInTheDocument();
    expect(await screen.findByTestId('status-select')).toBeInTheDocument();
    expect(
      await screen.findByTestId('test-case-incident-manager-table')
    ).toBeInTheDocument();
    expect(await screen.findByText('Assignees.component')).toBeInTheDocument();
    expect(
      await screen.findByText('AsyncSelect.component')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('DatePickerMenu.component')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('NextPrevious.component')
    ).toBeInTheDocument();
  });

  it('Incident should be fetch with updated time', async () => {
    const mockGetListTestCaseIncidentStatus =
      getListTestCaseIncidentStatus as jest.Mock;
    render(<IncidentManagerPage />);

    const timeFilterButton = await screen.findByTestId('time-filter');

    act(() => {
      fireEvent.click(timeFilterButton);
    });

    expect(mockGetListTestCaseIncidentStatus).toHaveBeenCalledWith({
      endTs: 1710161424255,
      latest: true,
      limit: 10,
      startTs: 1709556624254,
    });
  });
});
