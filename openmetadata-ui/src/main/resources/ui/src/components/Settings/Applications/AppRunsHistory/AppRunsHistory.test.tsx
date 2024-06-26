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
import {
  act,
  render,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table as AntdTable } from 'antd';
import React from 'react';
import { AppType } from '../../../../generated/entity/applications/app';
import { mockApplicationData } from '../../../../mocks/rests/applicationAPI.mock';
import AppRunsHistory from './AppRunsHistory.component';

const mockHandlePagingChange = jest.fn();
const mockHandlePageChange = jest.fn();
const mockHandlePageSizeChange = jest.fn();
const mockGetApplicationRuns = jest.fn().mockReturnValue({
  data: [mockApplicationData],
  paging: {
    offset: 0,
    total: 3,
  },
});
const mockShowErrorToast = jest.fn();
const mockPush = jest.fn();

jest.mock('../../../../hooks/paging/usePaging', () => ({
  usePaging: jest.fn().mockReturnValue({
    currentPage: 8,
    paging: {},
    pageSize: 5,
    handlePagingChange: jest
      .fn()
      .mockImplementation((...args) => mockHandlePagingChange(...args)),
    handlePageChange: jest
      .fn()
      .mockImplementation((...args) => mockHandlePageChange(...args)),
    handlePageSizeChange: jest
      .fn()
      .mockImplementation(() => mockHandlePageSizeChange()),
    showPagination: true,
  }),
}));

jest.mock('../../../../hooks/useFqn', () => ({
  useFqn: jest.fn().mockReturnValue({ fqn: 'mockFQN' }),
}));

jest.mock('../../../../rest/applicationAPI', () => ({
  getApplicationRuns: jest
    .fn()
    .mockImplementation((...args) => mockGetApplicationRuns(...args)),
}));

jest.mock('../../../../utils/ApplicationUtils', () => ({
  getStatusFromPipelineState: jest.fn(),
  getStatusTypeForApplication: jest.fn(),
}));

jest.mock('../../../../utils/RouterUtils', () => ({
  getLogsViewerPath: jest.fn().mockReturnValue('logs viewer path'),
}));

jest.mock('../../../../utils/ToastUtils', () => ({
  showErrorToast: jest
    .fn()
    .mockImplementation((...args) => mockShowErrorToast(...args)),
}));

jest.mock('../../../../utils/date-time/DateTimeUtils', () => ({
  formatDateTime: jest.fn().mockReturnValue('formatDateTime'),
  getEpochMillisForPastDays: jest.fn().mockReturnValue('startDay'),
}));

jest.mock('../../../common/ErrorWithPlaceholder/ErrorPlaceHolder', () =>
  jest.fn().mockReturnValue(<div>ErrorPlaceHolder</div>)
);

jest.mock('../../../common/NextPrevious/NextPrevious', () =>
  jest.fn().mockImplementation(({ pagingHandler }) => (
    // passing currentPage value in pagingHandler
    <button onClick={() => pagingHandler({ currentPage: 6 })}>
      NextPrevious
    </button>
  ))
);

jest.mock('../../../common/StatusBadge/StatusBadge.component', () =>
  jest.fn().mockReturnValue(<div>StatusBadge</div>)
);

jest.mock('../../../common/Table/Table', () => {
  return jest.fn().mockImplementation(({ loading, ...rest }) => (
    <div>
      {loading ? <p>TableLoader</p> : <AntdTable {...rest} />}
      Table
    </div>
  ));
});

jest.mock('../AppLogsViewer/AppLogsViewer.component', () =>
  jest.fn().mockReturnValue(<div>AppLogsViewer</div>)
);

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn().mockImplementation(() => ({
    push: mockPush,
  })),
}));

jest.mock('../../../../constants/constants', () => ({
  NO_DATA_PLACEHOLDER: '--',
}));

const mockProps1 = {
  appData: mockApplicationData,
  maxRecords: 10,
  showPagination: true,
};

const mockProps2 = {
  ...mockProps1,
  appData: {
    ...mockProps1.appData,
    appType: AppType.External,
  },
};

describe('AppRunsHistory component', () => {
  it('should contain all necessary elements based on mockProps1', async () => {
    render(<AppRunsHistory {...mockProps1} />);
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('label.run-at')).toBeInTheDocument();
    expect(screen.getByText('label.run-type')).toBeInTheDocument();
    expect(screen.getByText('label.action-plural')).toBeInTheDocument();

    // checking the logs function call for internal app
    act(() => {
      userEvent.click(screen.getByText('label.log-plural'));
    });

    expect(screen.queryByText('--')).not.toBeInTheDocument();

    expect(screen.getByText('NextPrevious')).toBeInTheDocument();
  });

  it('should show the error toast if fail in fetching app history', async () => {
    mockGetApplicationRuns.mockRejectedValueOnce('fetching app history failed');

    render(<AppRunsHistory {...mockProps1} />);
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    expect(mockShowErrorToast).toHaveBeenCalledWith(
      'fetching app history failed'
    );
  });

  it('should fetch data based on limit and offset for internal app onclick of NextPrevious', async () => {
    render(<AppRunsHistory {...mockProps1} />);
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    userEvent.click(screen.getByRole('button', { name: 'NextPrevious' }));
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    expect(mockHandlePageChange).toHaveBeenCalledWith(6);
    expect(mockGetApplicationRuns).toHaveBeenCalledWith('mockFQN', {
      limit: 10,
      offset: 25,
    });
  });

  it('should fetch data based on startTs and endTs for external app onclick of NextPrevious', async () => {
    jest.useFakeTimers('modern').setSystemTime(new Date('2024-02-05'));

    render(<AppRunsHistory {...mockProps2} />);
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    userEvent.click(screen.getByRole('button', { name: 'NextPrevious' }));
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    expect(mockHandlePageChange).toHaveBeenCalledWith(6);
    expect(mockGetApplicationRuns).toHaveBeenCalledWith('mockFQN', {
      startTs: 'startDay',
      endTs: Date.now(),
    });

    jest.useRealTimers();
  });

  it('should expose children method to parent using ref', async () => {
    const refInParent = React.createRef();

    render(
      <AppRunsHistory
        {...mockProps1}
        maxRecords={undefined}
        ref={refInParent}
      />
    );
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    act(() => {
      (
        refInParent.current as { refreshAppHistory: () => void }
      )?.refreshAppHistory();
    });
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    expect(mockGetApplicationRuns).toHaveBeenCalledWith('mockFQN', {
      limit: 5,
      offset: 0,
    });
  });

  it('onclick of logs button should call history.push method of external apps', async () => {
    render(<AppRunsHistory {...mockProps2} />);
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    userEvent.click(screen.getByText('label.log-plural'));

    expect(mockPush).toHaveBeenCalledWith('logs viewer path');
  });

  it('checking behaviour of component when no prop is passed', async () => {
    render(<AppRunsHistory />);
    await waitForElementToBeRemoved(() => screen.getByText('TableLoader'));

    expect(screen.getByText('--')).toBeInTheDocument();
  });
});
