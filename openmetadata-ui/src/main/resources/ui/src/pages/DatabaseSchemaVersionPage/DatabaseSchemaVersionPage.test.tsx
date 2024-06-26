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
import userEvent from '@testing-library/user-event';
import React from 'react';
import DatabaseSchemaVersionPage from './DatabaseSchemaVersionPage';
import {
  CURRENT_TABLE_PAGE,
  CUSTOM_PROPERTY_TABLE,
  CUSTOM_PROPERTY_TAB_NAME,
  DATABASE_SCHEMA_ID,
  DATA_ASSET_VERSION_HEADER,
  DATA_PRODUCT_CONTAINER,
  ENTITY_VERSION_TIMELINE,
  ERROR_PLACEHOLDER,
  LOADER,
  MOCK_FQN,
  MOCK_PARAMS,
  SCHEMA_TABLE_TAB,
  TAGS_CONTAINER_V2,
} from './mocks/DatabaseSchemaVersionPage.mock';

jest.mock(
  '../../components/common/CustomPropertyTable/CustomPropertyTable',
  () => ({
    CustomPropertyTable: jest
      .fn()
      .mockImplementation(() => <div>{CUSTOM_PROPERTY_TABLE}</div>),
  })
);

jest.mock('../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder', () =>
  jest.fn().mockImplementation(() => <div>{ERROR_PLACEHOLDER}</div>)
);

jest.mock(
  '../../components/DataAssets/DataAssetsVersionHeader/DataAssetsVersionHeader',
  () =>
    jest
      .fn()
      .mockImplementation(({ onVersionClick }) => (
        <button onClick={onVersionClick}>{DATA_ASSET_VERSION_HEADER}</button>
      ))
);

jest.mock(
  '../../components/DataProducts/DataProductsContainer/DataProductsContainer.component',
  () => jest.fn().mockImplementation(() => <div>{DATA_PRODUCT_CONTAINER}</div>)
);

jest.mock(
  '../../components/Entity/EntityVersionTimeLine/EntityVersionTimeLine',
  () =>
    jest
      .fn()
      .mockImplementation(({ versionHandler }) => (
        <button onClick={versionHandler}>{ENTITY_VERSION_TIMELINE}</button>
      ))
);

jest.mock('../../components/common/Loader/Loader', () =>
  jest.fn().mockImplementation(() => <div>{LOADER}</div>)
);

jest.mock('../../components/PageLayoutV1/PageLayoutV1', () => {
  return jest.fn().mockImplementation(({ children }) => <div>{children}</div>);
});

const mockGetEntityPermissionByFqn = jest.fn().mockReturnValue({
  ViewAll: true,
});

jest.mock('../../context/PermissionProvider/PermissionProvider', () => ({
  usePermissionProvider: jest.fn().mockReturnValue({
    getEntityPermissionByFqn: jest.fn(() => mockGetEntityPermissionByFqn()),
  }),
}));

jest.mock('../../components/common/TabsLabel/TabsLabel.component', () =>
  jest.fn().mockImplementation(({ name }) => <div>{name}</div>)
);

jest.mock('../../components/Tag/TagsContainerV2/TagsContainerV2', () =>
  jest.fn().mockImplementation(() => <div>{TAGS_CONTAINER_V2}</div>)
);

jest.mock('../../hooks/useFqn', () => ({
  useFqn: jest.fn().mockImplementation(() => ({ fqn: MOCK_FQN })),
}));

jest.mock('../../pages/DatabaseSchemaPage/SchemaTablesTab', () =>
  jest
    .fn()
    .mockImplementation(({ tablePaginationHandler, currentTablesPage }) => (
      <>
        <p>
          {currentTablesPage ? `currentTablesPage is ${currentTablesPage}` : ''}
        </p>
        <button
          onClick={tablePaginationHandler({
            currentPage: CURRENT_TABLE_PAGE,
            // cursorType: CursorType.BEFORE,
          })}>
          {SCHEMA_TABLE_TAB}
        </button>
      </>
    ))
);

const mockGetDatabaseSchemaDetailsByFQN = jest
  .fn()
  .mockResolvedValue({ id: DATABASE_SCHEMA_ID });
const mockGetDatabaseSchemaVersionData = jest.fn().mockResolvedValue({});
const mockGetDatabaseSchemaVersions = jest.fn().mockResolvedValue({});

jest.mock('../../rest/databaseAPI', () => ({
  getDatabaseSchemaDetailsByFQN: jest.fn(() =>
    mockGetDatabaseSchemaDetailsByFQN()
  ),
  getDatabaseSchemaVersionData: jest.fn(() =>
    mockGetDatabaseSchemaVersionData()
  ),
  getDatabaseSchemaVersions: jest.fn(() => mockGetDatabaseSchemaVersions()),
}));

jest.mock('../../rest/tableAPI', () => ({
  ...jest.requireActual('../../rest/tableAPI'),
  getTableList: jest.fn().mockReturnValue({
    paging: {},
  }),
}));

jest.mock('../../utils/EntityUtils', () => ({
  getEntityName: jest.fn().mockReturnValue('entityName'),
}));

jest.mock('../../utils/EntityVersionUtils', () => ({
  getBasicEntityInfoFromVersionData: jest.fn().mockReturnValue({}),
  getCommonDiffsFromVersionData: jest.fn().mockReturnValue({}),
  getCommonExtraInfoForVersionDetails: jest.fn().mockReturnValue({}),
}));

const mockPush = jest.fn();

jest.mock('react-router-dom', () => ({
  useParams: jest.fn(() => MOCK_PARAMS),
  useHistory: jest.fn(() => ({
    push: mockPush,
  })),
}));

describe('DatabaseSchemaVersionPage', () => {
  it('should render all necessary components', async () => {
    await act(async () => {
      render(<DatabaseSchemaVersionPage />);
    });

    expect(screen.getByText(DATA_ASSET_VERSION_HEADER)).toBeInTheDocument();
    expect(screen.getByText(ENTITY_VERSION_TIMELINE)).toBeInTheDocument();
    expect(screen.getByText(SCHEMA_TABLE_TAB)).toBeInTheDocument();
    expect(screen.getByText(DATA_PRODUCT_CONTAINER)).toBeInTheDocument();
    expect(screen.getAllByText(TAGS_CONTAINER_V2)).toHaveLength(2);
  });

  it('actions on table tab', async () => {
    await act(async () => {
      render(<DatabaseSchemaVersionPage />);
    });

    // tablePaginationHandler
    act(() => {
      userEvent.click(screen.getByText(SCHEMA_TABLE_TAB));
    });

    expect(
      screen.getByText(`currentTablesPage is ${CURRENT_TABLE_PAGE}`)
    ).toBeInTheDocument();
  });

  it('tab change, version handler, back handler should work', async () => {
    await act(async () => {
      render(<DatabaseSchemaVersionPage />);
    });

    // for tab change
    userEvent.click(
      screen.getByRole('tab', {
        name: CUSTOM_PROPERTY_TAB_NAME,
      })
    );

    // for back handler
    userEvent.click(
      screen.getByRole('button', {
        name: DATA_ASSET_VERSION_HEADER,
      })
    );

    // for version handler
    userEvent.click(
      screen.getByRole('button', {
        name: ENTITY_VERSION_TIMELINE,
      })
    );

    expect(mockPush).toHaveBeenCalledTimes(3);
  });

  it('should show ErrorPlaceHolder if not have view permission', async () => {
    mockGetEntityPermissionByFqn.mockResolvedValueOnce({});

    await act(async () => {
      render(<DatabaseSchemaVersionPage />);
    });

    expect(screen.getByText(ERROR_PLACEHOLDER)).toBeInTheDocument();
  });
});
