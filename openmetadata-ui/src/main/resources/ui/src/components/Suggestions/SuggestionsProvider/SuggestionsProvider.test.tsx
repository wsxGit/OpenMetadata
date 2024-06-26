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
import { SuggestionType } from '../../../generated/entity/feed/suggestion';
import { mockEntityPermissions } from '../../../pages/DatabaseSchemaPage/mocks/DatabaseSchemaPage.mock';
import {
  aproveRejectAllSuggestions,
  getSuggestionsList,
  updateSuggestionStatus,
} from '../../../rest/suggestionsAPI';
import SuggestionsProvider, {
  useSuggestionsContext,
} from './SuggestionsProvider';
import { SuggestionAction } from './SuggestionsProvider.interface';

const suggestions = [
  {
    id: '1',
    description: 'Test suggestion1',
    createdBy: { id: '1', name: 'Avatar 1', type: 'user' },
    entityLink: '<#E::table::sample_data.ecommerce_db.shopify.dim_address>',
  },
  {
    id: '2',
    description: 'Test suggestion2',
    createdBy: { id: '2', name: 'Avatar 2', type: 'user' },
    entityLink: '<#E::table::sample_data.ecommerce_db.shopify.dim_address>',
  },
];

jest.mock('../../../hooks/useFqn', () => ({
  useFqn: jest.fn().mockReturnValue({ fqn: 'mockFQN' }),
}));

jest.mock('../../../rest/suggestionsAPI', () => ({
  getSuggestionsList: jest.fn().mockImplementation(() => Promise.resolve()),
  aproveRejectAllSuggestions: jest.fn(),
  updateSuggestionStatus: jest.fn(),
}));

jest.mock('../../../context/PermissionProvider/PermissionProvider', () => ({
  usePermissionProvider: jest.fn().mockImplementation(() => ({
    permissions: mockEntityPermissions,
  })),
}));

describe('SuggestionsProvider', () => {
  it('renders provider and fetches data', async () => {
    await act(async () => {
      render(
        <SuggestionsProvider>
          <TestComponent />
        </SuggestionsProvider>
      );
    });

    expect(getSuggestionsList).toHaveBeenCalled();
  });

  it('calls approveRejectAllSuggestions when button is clicked', () => {
    render(
      <SuggestionsProvider>
        <TestComponent />
      </SuggestionsProvider>
    );

    const button = screen.getByText('Active User');
    fireEvent.click(button);

    const acceptAllBtn = screen.getByText('Accept All');
    fireEvent.click(acceptAllBtn);

    expect(aproveRejectAllSuggestions).toHaveBeenCalledWith(
      '1',
      'mockFQN',
      SuggestionType.SuggestDescription,
      SuggestionAction.Accept
    );
  });

  it('calls approveRejectAllSuggestions when reject button is clicked', () => {
    render(
      <SuggestionsProvider>
        <TestComponent />
      </SuggestionsProvider>
    );

    const button = screen.getByText('Active User');
    fireEvent.click(button);

    const rejectAll = screen.getByText('Reject All');
    fireEvent.click(rejectAll);

    expect(aproveRejectAllSuggestions).toHaveBeenCalledWith(
      '1',
      'mockFQN',
      SuggestionType.SuggestDescription,
      SuggestionAction.Reject
    );
  });

  it('calls accept suggestion when accept button is clicked', () => {
    render(
      <SuggestionsProvider>
        <TestComponent />
      </SuggestionsProvider>
    );

    const acceptBtn = screen.getByText('Accept One');
    fireEvent.click(acceptBtn);

    expect(updateSuggestionStatus).toHaveBeenCalledWith(
      suggestions[0],
      SuggestionAction.Accept
    );
  });

  it('calls reject suggestion when accept button is clicked', () => {
    render(
      <SuggestionsProvider>
        <TestComponent />
      </SuggestionsProvider>
    );

    const rejectBtn = screen.getByText('Reject One');
    fireEvent.click(rejectBtn);

    expect(updateSuggestionStatus).toHaveBeenCalledWith(
      suggestions[0],
      SuggestionAction.Reject
    );
  });
});

function TestComponent() {
  const {
    acceptRejectAllSuggestions,
    onUpdateActiveUser,
    acceptRejectSuggestion,
  } = useSuggestionsContext();

  return (
    <>
      <button
        onClick={() =>
          acceptRejectAllSuggestions(
            SuggestionType.SuggestDescription,
            SuggestionAction.Accept
          )
        }>
        Accept All
      </button>
      <button
        onClick={() =>
          acceptRejectAllSuggestions(
            SuggestionType.SuggestDescription,
            SuggestionAction.Reject
          )
        }>
        Reject All
      </button>
      <button
        onClick={() =>
          onUpdateActiveUser({ id: '1', name: 'Avatar 1', type: 'user' })
        }>
        Active User
      </button>
      <button
        onClick={() =>
          acceptRejectSuggestion(suggestions[0], SuggestionAction.Accept)
        }>
        Accept One
      </button>
      <button
        onClick={() =>
          acceptRejectSuggestion(suggestions[0], SuggestionAction.Reject)
        }>
        Reject One
      </button>
    </>
  );
}
