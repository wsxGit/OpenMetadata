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

// Library imports
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
// internal imports
import { OperationPermission } from '../../../../context/PermissionProvider/PermissionProvider.interface';
import { TEST_CASE } from '../../../../mocks/TableData.mock';
import TableProfilerV1 from './TableProfiler';
import { TableProfilerProps } from './TableProfiler.interface';

const mockLocation = {
  search: '?activeTab=Table Profile',
  pathname: '/table',
};

// mock library imports
jest.mock('react-router-dom', () => ({
  useHistory: jest.fn().mockImplementation(() => ({
    push: jest.fn(),
  })),
  useLocation: jest.fn().mockImplementation(() => mockLocation),
  Link: jest
    .fn()
    .mockImplementation(({ children }) => <a href="#">{children}</a>),
  useParams: jest.fn().mockReturnValue({
    fqn: 'sample_data.ecommerce_db.shopify.dim_address',
  }),
}));

jest.mock('./ColumnProfileTable/ColumnProfileTable', () => {
  return jest.fn().mockImplementation(() => {
    return <div>ColumnProfileTable.component</div>;
  });
});

jest.mock('../../../../rest/testAPI', () => ({
  getListTestCase: jest
    .fn()
    .mockImplementation(() => Promise.resolve(TEST_CASE)),
}));
jest.mock('../../../../rest/tableAPI', () => ({
  getTableDetailsByFQN: jest.fn().mockImplementation(() => Promise.resolve()),
}));
jest.mock('./QualityTab/QualityTab.component', () => ({
  QualityTab: jest
    .fn()
    .mockImplementation(() => <div>QualityTab.component</div>),
}));

const mockProps: TableProfilerProps = {
  permissions: {
    Create: true,
    Delete: true,
    EditAll: true,
    EditCustomFields: true,
    EditDataProfile: true,
    EditDescription: true,
    EditDisplayName: true,
    EditLineage: true,
    EditOwner: true,
    EditQueries: true,
    EditSampleData: true,
    EditTags: true,
    EditTests: true,
    EditTier: true,
    ViewAll: true,
    ViewDataProfile: true,
    ViewQueries: true,
    ViewSampleData: true,
    ViewTests: true,
    ViewUsage: true,
  } as OperationPermission,
};

describe('Test TableProfiler component', () => {
  beforeEach(() => {
    cleanup();
  });

  it('should render without crashing', async () => {
    render(<TableProfilerV1 {...mockProps} />);

    const profileContainer = await screen.findByTestId(
      'table-profiler-container'
    );
    const settingBtn = await screen.findByTestId('profiler-setting-btn');
    const addTableTest = await screen.findByTestId(
      'profiler-add-table-test-btn'
    );

    expect(profileContainer).toBeInTheDocument();
    expect(settingBtn).toBeInTheDocument();
    expect(addTableTest).toBeInTheDocument();
  });

  it('CTA: Add table test should work properly', async () => {
    render(<TableProfilerV1 {...mockProps} />);

    const addTableTest = await screen.findByTestId(
      'profiler-add-table-test-btn'
    );

    expect(addTableTest).toBeInTheDocument();
  });
});
