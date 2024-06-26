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
import { PersonaDetailsCard } from './PersonaDetailsCard';

const mockPush = jest.fn();
const personaWithDescription = {
  id: '123',
  name: 'John Doe',
  fullyQualifiedName: 'john-doe',
  displayName: 'John Doe',
  description: 'This is a sample rich text description.',
};

const personaWithoutDescription = {
  id: '456',
  name: 'Jane Smith',
  fullyQualifiedName: 'personas/jane-smith',
  displayName: 'Jane Smith',
};

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn().mockImplementation(() => ({
    push: mockPush,
  })),
  useLocation: jest.fn().mockReturnValue({ pathname: '/' }),
}));

describe('PersonaDetailsCard Component', () => {
  it('should render persona details card', async () => {
    await act(async () => {
      render(<PersonaDetailsCard persona={personaWithDescription} />);
    });

    expect(
      await screen.findByTestId('persona-details-card')
    ).toBeInTheDocument();
  });

  it('should render persona card with description as rich text if available', async () => {
    await act(async () => {
      render(<PersonaDetailsCard persona={personaWithDescription} />);
    });

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(
      await screen.findByText('This is a sample rich text description.')
    ).toBeInTheDocument();
  });

  it('should render persona card with "no description" message if description is empty', async () => {
    await act(async () => {
      render(<PersonaDetailsCard persona={personaWithoutDescription} />);
    });

    expect(await screen.findByText('label.no-description')).toBeInTheDocument();
    expect(await screen.findByText('Jane Smith')).toBeInTheDocument();
  });

  it('should navigate to persona details page on card click', async () => {
    await act(async () => {
      render(<PersonaDetailsCard persona={personaWithDescription} />);
    });
    const personaCardTitle = await screen.findByText('John Doe');
    await act(async () => {
      userEvent.click(personaCardTitle);
    });

    expect(mockPush).toHaveBeenCalledWith('/settings/members/persona/john-doe');
  });

  it('should not navigate when persona.fullyQualifiedName is missing', async () => {
    const personaWithoutFQN = {
      ...personaWithDescription,
      fullyQualifiedName: undefined,
    };

    await act(async () => {
      render(<PersonaDetailsCard persona={personaWithoutFQN} />);
    });
    const personaCardTitle = await screen.findByText('John Doe');

    await act(async () => {
      userEvent.click(personaCardTitle);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
