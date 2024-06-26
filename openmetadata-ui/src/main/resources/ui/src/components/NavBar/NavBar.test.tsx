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
import { HELP_ITEMS_ENUM } from '../../constants/Navbar.constants';
import { getVersion } from '../../rest/miscAPI';
import { getHelpDropdownItems } from '../../utils/NavbarUtils';
import NavBar from './NavBar';

const mockHandleSearchBoxOpen = jest.fn();
const mockHandleSearchChange = jest.fn();
const mockHandleOnClick = jest.fn();
const mockHandleKeyDown = jest.fn();
const mockHandleClear = jest.fn();
const mockProps = {
  searchValue: 'searchValue',
  isTourRoute: false,
  pathname: '',
  isSearchBoxOpen: false,
  handleSearchBoxOpen: mockHandleSearchBoxOpen,
  handleSearchChange: mockHandleSearchChange,
  handleOnClick: mockHandleOnClick,
  handleClear: mockHandleClear,
  handleKeyDown: mockHandleKeyDown,
};

jest.mock('../../hooks/useApplicationStore', () => ({
  useApplicationStore: jest.fn().mockImplementation(() => ({
    searchCriteria: '',
    updateSearchCriteria: jest.fn(),
  })),
}));

jest.mock('../../context/WebSocketProvider/WebSocketProvider', () => ({
  useWebSocketConnector: jest.fn().mockImplementation(() => ({
    socket: {
      on: jest.fn(),
      off: jest.fn(),
    },
  })),
}));
jest.mock('../../utils/BrowserNotificationUtils', () => ({
  hasNotificationPermission: jest.fn(),
  shouldRequestPermission: jest.fn(),
}));
jest.mock('../../utils/CommonUtils', () => ({
  refreshPage: jest.fn(),
  getEntityDetailLink: jest.fn(),
}));
jest.mock('../../utils/FeedUtils', () => ({
  getEntityFQN: jest.fn().mockReturnValue('entityFQN'),
  getEntityType: jest.fn().mockReturnValue('entityType'),
  prepareFeedLink: jest.fn().mockReturnValue('entity-link'),
}));

jest.mock('../../hooks/useDomainStore', () => ({
  useDomainStore: jest.fn().mockImplementation(() => ({
    domainOptions: jest.fn().mockReturnValue('domainOptions'),
    activeDomain: jest.fn().mockReturnValue('activeDomain'),
    updateActiveDomain: jest.fn(),
  })),
}));

jest.mock('../Modals/WhatsNewModal/WhatsNewModal', () => {
  return jest
    .fn()
    .mockImplementation(() => (
      <p data-testid="whats-new-modal-close">WhatsNewModal</p>
    ));
});

jest.mock('../NotificationBox/NotificationBox.component', () => {
  return jest.fn().mockImplementation(({ onTabChange }) => (
    <div data-testid="tab-change" onClick={onTabChange}>
      tab change
    </div>
  ));
});

jest.mock(
  '../Settings/Users/UserProfileIcon/UserProfileIcon.component',
  () => ({
    UserProfileIcon: jest
      .fn()
      .mockReturnValue(
        <div data-testid="user-profile-icon">UserProfileIcon</div>
      ),
  })
);
jest.mock('react-router-dom', () => ({
  useLocation: jest
    .fn()
    .mockReturnValue({ search: 'search', pathname: '/my-data' }),
  useHistory: jest.fn(),
}));

jest.mock('../common/CmdKIcon/CmdKIcon.component', () => {
  return jest.fn().mockReturnValue(<div data-testid="cmd">CmdKIcon</div>);
});
jest.mock('../AppBar/SearchOptions', () => {
  return jest.fn().mockReturnValue(<div data-testid="cmd">SearchOptions</div>);
});
jest.mock('../AppBar/Suggestions', () => {
  return jest.fn().mockReturnValue(<div data-testid="cmd">Suggestions</div>);
});
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),

  Dropdown: jest.fn().mockImplementation(({ dropdownRender }) => {
    return (
      <div data-testid="dropdownRender">
        <div>{dropdownRender}</div>
      </div>
    );
  }),
}));

jest.mock('../../rest/miscAPI', () => ({
  getVersion: jest.fn().mockImplementation(() =>
    Promise.resolve({
      data: {
        version: '0.5.0-SNAPSHOT',
      },
    })
  ),
}));

jest.mock('../../utils/NavbarUtils', () => ({
  getHelpDropdownItems: jest.fn().mockReturnValue([
    {
      label: <p data-testid="whats-new">Whats New</p>,
      key: HELP_ITEMS_ENUM.WHATS_NEW,
    },
  ]),
}));

describe('Test NavBar Component', () => {
  it('Should render NavBar component', async () => {
    render(<NavBar {...mockProps} />);

    expect(
      await screen.findByTestId('navbar-search-container')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('global-search-selector')
    ).toBeInTheDocument();
    expect(await screen.findByTestId('searchBox')).toBeInTheDocument();
    expect(await screen.findByTestId('cmd')).toBeInTheDocument();
    expect(await screen.findByTestId('user-profile-icon')).toBeInTheDocument();
    expect(
      await screen.findByTestId('whats-new-alert-card')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('whats-new-alert-header')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('close-whats-new-alert')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('label.whats-new-version')
    ).toBeInTheDocument();
  });

  it('should call getVersion onMount', () => {
    render(<NavBar {...mockProps} />);

    expect(getVersion).toHaveBeenCalled();
  });

  it('should handle search box open', () => {
    render(<NavBar {...mockProps} />);
    const searchBox = screen.getByTestId('searchBox');
    fireEvent.click(searchBox);

    expect(mockHandleSearchBoxOpen).toHaveBeenCalled();
  });

  it('should handle search change', () => {
    render(<NavBar {...mockProps} />);
    const searchBox = screen.getByTestId('searchBox');
    fireEvent.change(searchBox, { target: { value: 'test' } });

    expect(mockHandleSearchChange).toHaveBeenCalledWith('test');
  });

  it('should handle key down', () => {
    render(<NavBar {...mockProps} />);
    const searchBox = screen.getByTestId('searchBox');
    fireEvent.keyDown(searchBox, { key: 'Enter', code: 'Enter' });

    expect(mockHandleKeyDown).toHaveBeenCalled();
  });

  it('should render cancel icon', () => {
    render(<NavBar {...mockProps} />);
    const searchBox = screen.getByTestId('searchBox');
    fireEvent.keyDown(searchBox, { key: 'Enter', code: 'Enter' });

    expect(mockHandleKeyDown).toHaveBeenCalled();
  });

  it('should call function on icon search', async () => {
    render(<NavBar {...mockProps} searchValue="" />);
    const searchBox = await screen.findByTestId('search-icon');
    await act(async () => {
      fireEvent.click(searchBox);
    });

    expect(mockHandleOnClick).toHaveBeenCalled();
  });

  it('should call getHelpDropdownItems function', async () => {
    render(<NavBar {...mockProps} searchValue="" />);

    expect(getHelpDropdownItems).toHaveBeenCalled();
  });
});
