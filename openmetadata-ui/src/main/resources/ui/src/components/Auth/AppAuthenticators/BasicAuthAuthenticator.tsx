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

import React, {
  forwardRef,
  Fragment,
  ReactNode,
  useImperativeHandle,
} from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '../../../generated/settings/settings';
import {
  AccessTokenResponse,
  getAccessTokenOnExpiry,
} from '../../../rest/auth-API';

import { useApplicationStore } from '../../../hooks/useApplicationStore';
import Loader from '../../common/Loader/Loader';
import { useBasicAuth } from '../AuthProviders/BasicAuthProvider';

interface BasicAuthenticatorInterface {
  children: ReactNode;
}

const BasicAuthenticator = forwardRef(
  ({ children }: BasicAuthenticatorInterface, ref) => {
    const { handleLogout } = useBasicAuth();
    const { t } = useTranslation();
    const {
      setIsAuthenticated,
      authConfig,
      getRefreshToken,
      setRefreshToken,
      setOidcToken,
      isApplicationLoading,
    } = useApplicationStore();

    const handleSilentSignIn = async (): Promise<AccessTokenResponse> => {
      const refreshToken = getRefreshToken();

      if (
        authConfig?.provider !== AuthProvider.Basic &&
        authConfig?.provider !== AuthProvider.LDAP
      ) {
        Promise.reject(t('message.authProvider-is-not-basic'));
      }

      const response = await getAccessTokenOnExpiry({
        refreshToken: refreshToken as string,
      });

      setRefreshToken(response.refreshToken);
      setOidcToken(response.accessToken);

      return Promise.resolve(response);
    };

    useImperativeHandle(ref, () => ({
      invokeLogout() {
        handleLogout();
        setIsAuthenticated(false);
      },
      renewIdToken() {
        return handleSilentSignIn();
      },
    }));

    /**
     * isApplicationLoading is true when the application is loading in AuthProvider
     * and is false when the application is loaded.
     * If the application is loading, show the loader.
     * If the user is authenticated, show the AppContainer.
     * If the user is not authenticated, show the UnAuthenticatedAppRouter.
     * */
    if (isApplicationLoading) {
      return <Loader fullScreen />;
    }

    return <Fragment>{children}</Fragment>;
  }
);

export default BasicAuthenticator;
