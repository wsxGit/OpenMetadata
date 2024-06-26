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
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MOCK_TABLE } from '../../../../../mocks/TableData.mock';
import { useTableProfiler } from '../TableProfilerProvider';
import { QualityTab } from './QualityTab.component';

const testCasePermission = {
  Create: true,
  Delete: true,
  ViewAll: true,
  EditAll: true,
  EditDescription: true,
  EditDisplayName: true,
  EditCustomFields: true,
};

const mockTable = {
  displayName: 'Test Table',
  name: 'test-table',
};

const mockPush = jest.fn();
const mockUseTableProfiler = {
  tableProfiler: MOCK_TABLE,
  permissions: {
    EditAll: true,
    EditDataProfile: true,
    EditTests: true,
  },
  fetchAllTests: jest.fn(),
  onTestCaseUpdate: jest.fn(),
  allTestCases: [],
  isTestsLoading: false,
  isTableDeleted: false,
  testCasePaging: {
    currentPage: 1,
    pageSize: 10,
    paging: { total: 16, after: 'after' },
    handlePageChange: jest.fn(),
    handlePageSizeChange: jest.fn(),
    showPagination: true,
  },
};

jest.mock('../TableProfilerProvider', () => ({
  useTableProfiler: jest.fn().mockImplementation(() => mockUseTableProfiler),
}));

jest.mock(
  '../../../../../context/PermissionProvider/PermissionProvider',
  () => ({
    usePermissionProvider: jest.fn().mockImplementation(() => ({
      permissions: {
        testCase: testCasePermission,
      },
    })),
  })
);

jest.mock('../../../../../hooks/useFqn', () => ({
  useFqn: jest.fn().mockImplementation(() => ({ fqn: 'testFqn' })),
}));

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn().mockImplementation(() => ({
    push: mockPush,
  })),
  Link: jest.fn().mockImplementation(() => <div>Link</div>),
}));

jest.mock('../../../../../rest/tableAPI', () => ({
  getTableDetailsByFQN: jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockTable)),
}));
jest.mock('../../../../common/NextPrevious/NextPrevious', () => {
  return jest.fn().mockImplementation(({ pagingHandler }) => (
    <div>
      <p>NextPrevious.component</p>
      <button
        data-testid="next-btn"
        onClick={() => pagingHandler({ cursorType: 'after', currentPage: 2 })}>
        Next
      </button>
    </div>
  ));
});
jest.mock('../../DataQualityTab/DataQualityTab', () => {
  return jest
    .fn()
    .mockImplementation(() => <div>DataQualityTab.component</div>);
});

describe('QualityTab', () => {
  it('should render QualityTab', async () => {
    await act(async () => {
      render(<QualityTab />);
    });

    expect(
      await screen.findByTestId('page-header-container')
    ).toBeInTheDocument();
    expect(await screen.findByTestId('heading')).toHaveTextContent(
      'label.data-quality'
    );
    expect(await screen.findByTestId('sub-heading')).toHaveTextContent(
      'message.page-sub-header-for-data-quality'
    );
    expect(
      await screen.findByText('label.test-case-plural')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('NextPrevious.component')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('DataQualityTab.component')
    ).toBeInTheDocument();
    expect(await screen.findByText('label.pipeline')).toBeInTheDocument();
  });

  it("Pagination should be called with 'handlePageChange'", async () => {
    await act(async () => {
      render(<QualityTab />);
    });
    const nextBtn = await screen.findByTestId('next-btn');

    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(
      mockUseTableProfiler.testCasePaging.handlePageChange
    ).toHaveBeenCalledWith(2);
    expect(mockUseTableProfiler.fetchAllTests).toHaveBeenCalledWith({
      after: 'after',
      testCaseStatus: undefined,
      testCaseType: 'all',
    });
  });

  it('should render the Add button if editTest is true and isTableDeleted is false', async () => {
    await act(async () => {
      render(<QualityTab />);
    });

    expect(
      await screen.findByTestId('profiler-add-table-test-btn')
    ).toBeInTheDocument();
  });

  it('should not render the Add button if editTest is false', async () => {
    (useTableProfiler as jest.Mock).mockReturnValue({
      ...mockUseTableProfiler,
      permissions: {
        EditAll: false,
        EditTests: false,
      },
      isTableDeleted: false,
    });

    await act(async () => {
      render(<QualityTab />);
    });

    expect(
      screen.queryByTestId('profiler-add-table-test-btn')
    ).not.toBeInTheDocument();
  });

  it('should not render the Add button if isTableDeleted is true', async () => {
    (useTableProfiler as jest.Mock).mockReturnValue({
      ...mockUseTableProfiler,
      permissions: {
        EditAll: true,
        EditTests: true,
      },
      isTableDeleted: true,
    });

    await act(async () => {
      render(<QualityTab />);
    });

    expect(
      screen.queryByTestId('profiler-add-table-test-btn')
    ).not.toBeInTheDocument();
  });

  it('should render tabs', async () => {
    await act(async () => {
      render(<QualityTab />);
    });

    expect(
      await screen.getByRole('tab', { name: 'label.test-case-plural' })
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      await screen.getByRole('tab', { name: 'label.pipeline' })
    ).toHaveAttribute('aria-selected', 'false');
  });

  it('should display the initial summary data', async () => {
    (useTableProfiler as jest.Mock).mockImplementationOnce(() => ({
      ...mockUseTableProfiler,
      permissions: {
        EditAll: true,
        EditTests: true,
      },
      isTableDeleted: false,
    }));

    await act(async () => {
      render(<QualityTab />);
    });

    expect(await screen.findByText('label.total-entity')).toBeInTheDocument();
    expect(await screen.findByText('label.success')).toBeInTheDocument();
    expect(await screen.findByText('label.aborted')).toBeInTheDocument();
  });
});
