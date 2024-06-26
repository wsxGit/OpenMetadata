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
  findByRole,
  render,
  screen,
  waitForElement,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import { isString } from 'lodash';
import React from 'react';
import DestinationSelectItem from './DestinationSelectItem';
import { DestinationSelectItemProps } from './DestinationSelectItem.interface';

const MOCK_DESTINATION_SELECT_ITEM_PROPS: DestinationSelectItemProps = {
  selectorKey: 0,
  id: 0,
  remove: jest.fn(),
};

jest.mock('../../../../hooks/useFqn', () => ({
  useFqn: jest.fn().mockImplementation(() => ({ fqn: 'testFqn' })),
}));

jest.mock('antd', () => {
  const antd = jest.requireActual('antd');

  return {
    ...antd,
    Form: {
      ...antd.Form,
      useFormInstance: jest.fn().mockImplementation(() => ({
        setFieldValue: jest.fn(),
        getFieldValue: jest
          .fn()
          .mockImplementation((val: string | string[]) =>
            isString(val) ? [{ category: 'External' }] : ''
          ),
      })),
    },
  };
});

describe('DestinationSelectItem component', () => {
  it('should show internal tab by default in the dropdown', async () => {
    await act(async () => {
      render(<DestinationSelectItem {...MOCK_DESTINATION_SELECT_ITEM_PROPS} />);
    });

    const id = MOCK_DESTINATION_SELECT_ITEM_PROPS.id;
    const selectorKey = MOCK_DESTINATION_SELECT_ITEM_PROPS.selectorKey;

    expect(screen.getByTestId(`destination-${id}`)).toBeInTheDocument();

    const categorySelect = await findByRole(
      screen.getByTestId(`destination-category-select-${id}`),
      'combobox'
    );

    await act(async () => {
      userEvent.click(categorySelect);
    });

    await waitForElement(() =>
      screen.findByTestId(`destination-category-dropdown-${selectorKey}`)
    );

    expect(
      await screen.findByTestId('Admins-internal-option')
    ).toHaveTextContent('Admins');
    expect(
      await screen.findByTestId('Followers-internal-option')
    ).toHaveTextContent('Followers');
    expect(
      await screen.findByTestId('Owners-internal-option')
    ).toHaveTextContent('Owners');
    expect(
      await screen.findByTestId('Teams-internal-option')
    ).toHaveTextContent('Teams');
    expect(
      await screen.findByTestId('Users-internal-option')
    ).toHaveTextContent('Users');
  });

  it('should show external tab by default when selected destination type is external', async () => {
    jest.spyOn(Form, 'useFormInstance').mockImplementationOnce(() => ({
      ...Form.useFormInstance(),
      setFieldValue: jest.fn(),
      getFieldValue: jest
        .fn()
        .mockImplementation((val: string | string[]) =>
          isString(val)
            ? [{ category: 'External', destinationType: 'Teams' }]
            : ''
        ),
    }));

    const id = MOCK_DESTINATION_SELECT_ITEM_PROPS.id;
    const selectorKey = MOCK_DESTINATION_SELECT_ITEM_PROPS.selectorKey;

    await act(async () => {
      render(<DestinationSelectItem {...MOCK_DESTINATION_SELECT_ITEM_PROPS} />);
    });

    const categorySelect = await findByRole(
      screen.getByTestId(`destination-category-select-${id}`),
      'combobox'
    );

    await act(async () => {
      userEvent.click(categorySelect);
    });

    await waitForElement(() =>
      screen.findByTestId(`destination-category-dropdown-${selectorKey}`)
    );
    screen.debug(
      await screen.findByTestId(`destination-category-dropdown-${selectorKey}`)
    );

    expect(
      await screen.findByTestId('Email-external-option')
    ).toHaveTextContent('Email');
    expect(
      await screen.findByTestId('G Chat-external-option')
    ).toHaveTextContent('G Chat');
    expect(
      await screen.findByTestId('Webhook-external-option')
    ).toHaveTextContent('Webhook');
    expect(
      await screen.findByTestId('Ms Teams-external-option')
    ).toHaveTextContent('Ms Teams');
    expect(
      await screen.findByTestId('Slack-external-option')
    ).toHaveTextContent('Slack');
  });

  it('should call remove method with correct id on click of remove field button', async () => {
    const id = MOCK_DESTINATION_SELECT_ITEM_PROPS.id;

    await act(async () => {
      render(<DestinationSelectItem {...MOCK_DESTINATION_SELECT_ITEM_PROPS} />);
    });

    const removeFieldButton = screen.getByTestId(`remove-destination-${id}`);

    await act(async () => {
      userEvent.click(removeFieldButton);
    });

    expect(MOCK_DESTINATION_SELECT_ITEM_PROPS.remove).toHaveBeenCalledWith(id);
  });
});
