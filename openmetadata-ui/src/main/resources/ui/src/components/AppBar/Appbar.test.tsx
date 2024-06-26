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

import { findByText, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Appbar from './Appbar';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn().mockReturnValue({ search: 'pathname' }),
  Link: jest
    .fn()
    .mockImplementation(({ children }: { children: React.ReactNode }) => (
      <p data-testid="link">{children}</p>
    )),
  useHistory: jest.fn(),
}));

jest.mock('../../hooks/useApplicationStore', () => {
  return {
    useApplicationStore: jest.fn().mockImplementation(() => ({
      isAuthenticated: true,
      getOidcToken: jest.fn().mockReturnValue({ isExpired: false }),
      onLogoutHandler: jest.fn(),
    })),
  };
});

jest.mock('../NavBar/NavBar', () => {
  return jest.fn().mockReturnValue(<p>NavBar</p>);
});

jest.mock('../../rest/miscAPI', () => ({
  getVersion: jest.fn().mockImplementation(() =>
    Promise.resolve({
      data: {
        version: '0.5.0-SNAPSHOT',
      },
    })
  ),
}));

jest.mock('../../utils/AuthProvider.util', () => ({
  ...jest.requireActual('../../utils/AuthProvider.util'),
  isProtectedRoute: jest.fn().mockReturnValue(true),
}));

describe('Test Appbar Component', () => {
  it('Component should render', async () => {
    const { container } = render(<Appbar />, {
      wrapper: MemoryRouter,
    });

    const NavBar = await findByText(container, 'NavBar');

    expect(NavBar).toBeInTheDocument();
  });
});
