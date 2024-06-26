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
import { EntityReference } from '../../../../../generated/tests/testCase';
import { useAuth } from '../../../../../hooks/authHooks';
import { USER_DATA, USER_TEAMS } from '../../../../../mocks/User.mock';
import UserProfileTeams from './UserProfileTeams.component';
import { UserProfileTeamsProps } from './UserProfileTeams.interface';

const mockPropsData: UserProfileTeamsProps = {
  teams: [],
  updateUserDetails: jest.fn(),
};

jest.mock('../../../../../hooks/authHooks', () => ({
  useAuth: jest.fn().mockReturnValue({ isAdminUser: true }),
}));

jest.mock('../../../../../utils/CommonUtils', () => ({
  getNonDeletedTeams: jest.fn().mockImplementation((data) => data),
}));

jest.mock('../../../../common/InlineEdit/InlineEdit.component', () => {
  return jest.fn().mockImplementation(({ children, onCancel, onSave }) => (
    <div data-testid="inline-edit">
      <span>InlineEdit</span>
      {children}
      <button data-testid="save" onClick={onSave}>
        save
      </button>
      <button data-testid="cancel" onClick={onCancel}>
        cancel
      </button>
    </div>
  ));
});

jest.mock('../../../../common/Chip/Chip.component', () => {
  return jest.fn().mockReturnValue(<p>Chip</p>);
});

jest.mock('../../../Team/TeamsSelectable/TeamsSelectable', () => {
  return jest
    .fn()
    .mockImplementation(({ selectedTeams, onSelectionChange }) => (
      <div>
        <span>TeamsSelectable</span>
        <div>
          {selectedTeams.map(
            (item: EntityReference) => item.fullyQualifiedName
          )}
        </div>
        <input
          data-testid="select-user-teams"
          onChange={() =>
            onSelectionChange([
              {
                id: '37a00e0b-383c-4451-b63f-0bad4c745abc',
                name: 'admin',
                type: 'team',
              },
            ])
          }
        />
      </div>
    ));
});

describe('Test User Profile Teams Component', () => {
  it('should render user profile teams component', async () => {
    render(<UserProfileTeams {...mockPropsData} />);

    expect(screen.getByTestId('user-team-card-container')).toBeInTheDocument();
  });

  it('should render teams if data available', async () => {
    render(<UserProfileTeams {...mockPropsData} teams={USER_DATA.teams} />);

    expect(screen.getByTestId('user-team-card-container')).toBeInTheDocument();

    expect(screen.getByTestId('edit-teams-button')).toBeInTheDocument();

    expect(await screen.findAllByText('Chip')).toHaveLength(1);
  });

  it('should maintain initial state if edit is close without save', async () => {
    render(<UserProfileTeams {...mockPropsData} teams={USER_DATA.teams} />);

    fireEvent.click(screen.getByTestId('edit-teams-button'));

    const selectInput = screen.getByTestId('select-user-teams');

    act(() => {
      fireEvent.change(selectInput, {
        target: {
          value: 'test',
        },
      });
    });

    fireEvent.click(screen.getByTestId('cancel'));

    fireEvent.click(screen.getByTestId('edit-teams-button'));

    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('should call updateUserDetails on click save', async () => {
    render(<UserProfileTeams {...mockPropsData} teams={USER_DATA.teams} />);

    const editButton = screen.getByTestId('edit-teams-button');

    fireEvent.click(editButton);

    expect(screen.getByText('InlineEdit')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('save'));
    });

    expect(mockPropsData.updateUserDetails).toHaveBeenCalledWith(
      {
        teams: [
          {
            id: '9e8b7464-3f3e-4071-af05-19be142d75db',
            type: 'team',
          },
        ],
      },
      'teams'
    );
  });

  it('should not render edit button to non admin user', async () => {
    (useAuth as jest.Mock).mockImplementation(() => ({
      isAdminUser: false,
    }));

    render(<UserProfileTeams {...mockPropsData} teams={USER_TEAMS} />);

    expect(screen.getByTestId('user-team-card-container')).toBeInTheDocument();

    expect(screen.queryByTestId('edit-teams-button')).not.toBeInTheDocument();
  });
});
