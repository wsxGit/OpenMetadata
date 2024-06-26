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
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Suggestion } from '../../../generated/entity/feed/suggestion';
import SuggestionsProvider from '../SuggestionsProvider/SuggestionsProvider';
import SuggestionsAlert from './SuggestionsAlert';

jest.mock('../../../hooks/useFqn', () => ({
  useFqn: jest.fn().mockImplementation(() => ({ fqn: 'testFqn' })),
}));

jest.mock('../../common/ProfilePicture/ProfilePicture', () => {
  return jest.fn().mockImplementation(({ name }) => <p>{name}</p>);
});

jest.mock('../SuggestionsProvider/SuggestionsProvider', () => ({
  useSuggestionsContext: jest.fn().mockImplementation(() => ({
    suggestions: [
      {
        id: '1',
        description: 'Test suggestion',
        createdBy: { id: '1', name: 'Test User', type: 'user' },
        entityLink: '<#E::table::sample_data.ecommerce_db.shopify.dim_address>',
      },
    ],
    acceptRejectSuggestion: jest.fn(),
  })),
  __esModule: true,
  default: 'SuggestionsProvider',
}));

describe('SuggestionsAlert', () => {
  const mockSuggestion: Suggestion = {
    id: '1',
    description: 'Test suggestion',
    createdBy: { id: '1', name: 'Test User', type: 'user' },
    entityLink: '<#E::table::sample_data.ecommerce_db.shopify.dim_address>',
  };

  it('renders alert without access', () => {
    render(
      <SuggestionsProvider>
        <SuggestionsAlert hasEditAccess={false} suggestion={mockSuggestion} />
      </SuggestionsProvider>
    );

    expect(screen.getByText(/Test suggestion/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
  });

  it('renders alert with access', () => {
    render(
      <SuggestionsProvider>
        <SuggestionsAlert hasEditAccess suggestion={mockSuggestion} />
      </SuggestionsProvider>
    );

    expect(screen.getByText(/Test suggestion/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
    expect(screen.getByTestId('reject-suggestion')).toBeInTheDocument();
    expect(screen.getByTestId('accept-suggestion')).toBeInTheDocument();
  });
});
