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
import { LoginCallback } from '@okta/okta-react';
import React, { useMemo } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { ROUTES } from '../../constants/constants';
import { AuthProvider } from '../../generated/configuration/authenticationConfiguration';
import { useApplicationStore } from '../../hooks/useApplicationStore';
import PageNotFound from '../../pages/PageNotFound/PageNotFound';
import SamlCallback from '../../pages/SamlCallback';
import AccountActivationConfirmation from '../../pages/SignUp/account-activation-confirmation.component';
import { isProtectedRoute } from '../../utils/AuthProvider.util';
import Auth0Callback from '../Auth/AppCallbacks/Auth0Callback/Auth0Callback';
import withSuspenseFallback from './withSuspenseFallback';

const SigninPage = withSuspenseFallback(
  React.lazy(() => import('../../pages/LoginPage/SignInPage'))
);

const ForgotPassword = withSuspenseFallback(
  React.lazy(
    () => import('../../pages/ForgotPassword/ForgotPassword.component')
  )
);

const ResetPassword = withSuspenseFallback(
  React.lazy(() => import('../../pages/ResetPassword/ResetPassword.component'))
);

const BasicSignupPage = withSuspenseFallback(
  React.lazy(() => import('../../pages/SignUp/BasicSignup.component'))
);

export const UnAuthenticatedAppRouter = () => {
  const { authConfig, isSigningUp } = useApplicationStore();

  const isBasicAuthProvider =
    authConfig &&
    (authConfig.provider === AuthProvider.Basic ||
      authConfig.provider === AuthProvider.LDAP);

  const callbackComponent = useMemo(() => {
    switch (authConfig?.provider) {
      case AuthProvider.Okta: {
        return LoginCallback;
      }
      case AuthProvider.Auth0: {
        return Auth0Callback;
      }
      default: {
        return null;
      }
    }
  }, [authConfig?.provider]);

  if (isProtectedRoute(location.pathname)) {
    return <Redirect to={ROUTES.SIGNIN} />;
  }

  return (
    <Switch>
      <Route exact component={SigninPage} path={ROUTES.SIGNIN} />

      {callbackComponent && (
        <Route component={callbackComponent} path={ROUTES.CALLBACK} />
      )}
      <Route
        component={SamlCallback}
        path={[ROUTES.SAML_CALLBACK, ROUTES.AUTH_CALLBACK]}
      />
      {!isSigningUp && (
        <Route exact path={ROUTES.HOME}>
          <Redirect to={ROUTES.SIGNIN} />
        </Route>
      )}

      {/* keep this route before any conditional JSX.Element rendering */}
      <Route exact component={PageNotFound} path={ROUTES.NOT_FOUND} />

      {isBasicAuthProvider && (
        <>
          <Route exact component={BasicSignupPage} path={ROUTES.REGISTER} />
          <Route
            exact
            component={ForgotPassword}
            path={ROUTES.FORGOT_PASSWORD}
          />
          <Route exact component={ResetPassword} path={ROUTES.RESET_PASSWORD} />
          <Route
            exact
            component={AccountActivationConfirmation}
            path={ROUTES.ACCOUNT_ACTIVATION}
          />
        </>
      )}
    </Switch>
  );
};
