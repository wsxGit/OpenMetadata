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
import React from 'react';
import { GlobalSettingOptions } from '../../../../constants/GlobalSettings.constants';
import { mockApplicationData } from '../../../../mocks/rests/applicationAPI.mock';
import AppDetails from './AppDetails.component';

jest.mock('../../../../constants/constants', () => ({
  DE_ACTIVE_COLOR: '#fefefe',
}));

jest.mock('../../../common/Loader/Loader', () =>
  jest.fn().mockReturnValue(<div>Loader</div>)
);

jest.mock('../../../PageLayoutV1/PageLayoutV1', () =>
  jest.fn().mockImplementation(({ children }) => <div>{children}</div>)
);

jest.mock('../../../common/TabsLabel/TabsLabel.component', () =>
  jest.fn().mockImplementation(({ name }) => <span>{name}</span>)
);

jest.mock('../../../../hooks/useFqn', () => ({
  useFqn: jest.fn().mockReturnValue({ fqn: 'mockFQN' }),
}));

const mockConfigureApp = jest.fn();
const mockDeployApp = jest.fn();
const mockRestoreApp = jest.fn();
const mockTriggerOnDemandApp = jest.fn();
const mockUninstallApp = jest.fn();
const mockShowErrorToast = jest.fn();
const mockShowSuccessToast = jest.fn();
const mockPush = jest.fn();
const mockPatchApplication = jest.fn().mockReturnValue(mockApplicationData);
const mockGetApplicationByName = jest.fn().mockReturnValue(mockApplicationData);

jest.mock('../../../../rest/applicationAPI', () => ({
  configureApp: mockConfigureApp,
  deployApp: jest.fn().mockImplementation(() => mockDeployApp()),
  getApplicationByName: jest
    .fn()
    .mockImplementation(() => mockGetApplicationByName()),
  patchApplication: jest.fn().mockImplementation(() => mockPatchApplication()),
  restoreApp: jest.fn().mockImplementation(() => mockRestoreApp()),
  triggerOnDemandApp: jest
    .fn()
    .mockImplementation(() => mockTriggerOnDemandApp()),
  uninstallApp: jest
    .fn()
    .mockImplementation((...args) => mockUninstallApp(...args)),
}));

jest.mock('../../../../utils/date-time/DateTimeUtils', () => ({
  getRelativeTime: jest.fn().mockReturnValue('getRelativeTime'),
}));

jest.mock('../../../../utils/EntityUtils', () => ({
  getEntityName: jest.fn(),
}));

jest.mock('../../../../utils/JSONSchemaFormUtils', () => ({
  formatFormDataForSubmit: jest.fn(),
}));

jest.mock('../../../../utils/RouterUtils', () => ({
  getSettingPath: jest.fn().mockImplementation((path) => path),
}));

jest.mock('../../../../utils/ToastUtils', () => ({
  showErrorToast: jest.fn().mockImplementation(() => mockShowErrorToast()),
  showSuccessToast: jest.fn().mockImplementation(() => mockShowSuccessToast()),
}));

jest.mock('../../../common/FormBuilder/FormBuilder', () =>
  jest
    .fn()
    .mockImplementation(({ onSubmit }) => (
      <button onClick={onSubmit}>Configure Save</button>
    ))
);

jest.mock(
  '../../../common/ManageButtonContentItem/ManageButtonContentItem.component',
  () => ({
    ManageButtonItemLabel: jest
      .fn()
      .mockImplementation(({ name }) => <div>{name}</div>),
  })
);

jest.mock('../../../Modals/ConfirmationModal/ConfirmationModal', () =>
  jest.fn().mockImplementation(({ visible, onConfirm, onCancel }) => (
    <>
      {visible ? 'Confirmation Modal is open' : 'Confirmation Modal is close'}
      <button onClick={onConfirm}>Confirm Confirmation Modal</button>
      <button onClick={onCancel}>Cancel Confirmation Modal</button>
    </>
  ))
);

jest.mock('../AppLogo/AppLogo.component', () =>
  jest.fn().mockImplementation(() => <>AppLogo</>)
);

jest.mock('../AppRunsHistory/AppRunsHistory.component', () =>
  jest.fn().mockReturnValue(<div>AppRunsHistory</div>)
);

jest.mock('../AppSchedule/AppSchedule.component', () =>
  jest
    .fn()
    .mockImplementation(({ onSave, onDemandTrigger, onDeployTrigger }) => (
      <>
        AppSchedule
        <button onClick={onSave}>Save AppSchedule</button>
        <button onClick={onDemandTrigger}>DemandTrigger AppSchedule</button>
        <button onClick={onDeployTrigger}>DeployTrigger AppSchedule</button>
      </>
    ))
);

jest.mock('./ApplicationsClassBase', () => ({
  importSchema: jest.fn().mockReturnValue({ default: ['table'] }),
  getJSONUISchema: jest.fn().mockReturnValue({}),
}));

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn().mockImplementation(() => ({
    push: mockPush,
  })),
}));

const renderAppDetails = async () => {
  render(<AppDetails />);
  await waitForElementToBeRemoved(() => screen.getByText('Loader'));
};

const ConfirmAction = (buttonLabel: string) => {
  userEvent.click(screen.getByRole('menuitem', { name: buttonLabel }));

  expect(screen.getByText('Confirmation Modal is open')).toBeInTheDocument();

  userEvent.click(
    screen.getByRole('button', { name: 'Confirm Confirmation Modal' })
  );
};

describe('AppDetails component', () => {
  it('actions check in AppDetails component', async () => {
    await renderAppDetails();

    expect(screen.getByText('Confirmation Modal is close')).toBeInTheDocument();

    // back button
    userEvent.click(
      screen.getByRole('button', { name: 'left label.browse-app-plural' })
    );

    expect(mockPush).toHaveBeenCalledWith(GlobalSettingOptions.APPLICATIONS);

    // menu items
    userEvent.click(screen.getByTestId('manage-button'));

    // uninstall app
    ConfirmAction('label.uninstall');

    expect(mockUninstallApp).toHaveBeenCalledWith(expect.anything(), true);
    expect(mockPush).toHaveBeenCalledWith(GlobalSettingOptions.APPLICATIONS);

    // disable app
    ConfirmAction('label.disable');

    expect(mockUninstallApp).toHaveBeenCalledWith(expect.anything(), false);
    expect(mockPush).toHaveBeenCalledWith(GlobalSettingOptions.APPLICATIONS);
  });

  it('check for restore button', async () => {
    mockGetApplicationByName.mockReturnValueOnce({
      ...mockApplicationData,
      deleted: true,
    });

    await renderAppDetails();

    userEvent.click(screen.getByTestId('manage-button'));

    // enable app
    ConfirmAction('label.restore');

    expect(mockRestoreApp).toHaveBeenCalled();
  });

  it('Configuration tab actions check', async () => {
    await renderAppDetails();

    userEvent.click(screen.getByRole('tab', { name: 'label.configuration' }));
    userEvent.click(screen.getByRole('button', { name: 'Configure Save' }));

    expect(mockPatchApplication).toHaveBeenCalled();
  });

  it('Schedule tab Actions check', async () => {
    await renderAppDetails();

    userEvent.click(
      screen.getByRole('button', { name: 'DemandTrigger AppSchedule' })
    );

    expect(mockTriggerOnDemandApp).toHaveBeenCalled();

    act(() => {
      userEvent.click(
        screen.getByRole('button', { name: 'DeployTrigger AppSchedule' })
      );
    });

    expect(mockDeployApp).toHaveBeenCalled();
    expect(mockGetApplicationByName).toHaveBeenCalled();
  });
});
