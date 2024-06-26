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

import { Button, Col, Divider, Form, Input, Row, Typography } from 'antd';
import { isEmpty } from 'lodash';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import loginBG from '../../assets/img/login-bg.png';

import { useBasicAuth } from '../../components/Auth/AuthProviders/BasicAuthProvider';
import BrandImage from '../../components/common/BrandImage/BrandImage';
import { ROUTES, VALIDATION_MESSAGES } from '../../constants/constants';
import { passwordRegex } from '../../constants/regex.constants';
import { AuthProvider } from '../../generated/settings/settings';
import { useApplicationStore } from '../../hooks/useApplicationStore';
import LoginCarousel from '../LoginPage/LoginCarousel';
import './../LoginPage/login.style.less';

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

const BasicSignUp = () => {
  const { t } = useTranslation();
  const { authConfig } = useApplicationStore();
  const { handleRegister } = useBasicAuth();
  const history = useHistory();

  const [form] = Form.useForm();
  const password = Form.useWatch('password', form);

  const { isAuthProviderBasic } = useMemo(() => {
    return {
      isAuthProviderBasic:
        authConfig?.provider === AuthProvider.Basic ||
        authConfig?.provider === AuthProvider.LDAP,
    };
  }, [authConfig]);

  const handleSubmit = async (data: SignUpFormData) => {
    if (data.confirmPassword) {
      delete data['confirmPassword'];
    }

    const request = data;

    if (request) {
      handleRegister(request);
    }
  };

  const handleLogin = () => history.push(ROUTES.SIGNIN);

  return (
    <Row className="h-full" data-testid="signin-page">
      <Col className="bg-white" span={10}>
        <div className="mt-4 text-center flex-center flex-col">
          <BrandImage height="auto" width={200} />
          <Typography.Text className="mt-8 w-80 text-xl font-medium text-grey-muted">
            {t('message.om-description')}
          </Typography.Text>

          {isAuthProviderBasic ? (
            <div className="m-t-lg" style={{ width: '334px' }}>
              <Form
                autoComplete="off"
                form={form}
                layout="vertical"
                validateMessages={VALIDATION_MESSAGES}
                onFinish={handleSubmit}>
                <Form.Item
                  label={t('label.entity-name', {
                    entity: t('label.first'),
                  })}
                  name="firstName"
                  rules={[{ whitespace: true, required: true }]}>
                  <Input
                    autoFocus
                    placeholder={t('label.enter-entity-name', {
                      entity: t('label.first-lowercase'),
                    })}
                  />
                </Form.Item>
                <Form.Item
                  label={t('label.entity-name', {
                    entity: t('label.last'),
                  })}
                  name="lastName"
                  rules={[{ whitespace: true, required: true }]}>
                  <Input
                    placeholder={t('label.enter-entity', {
                      entity: t('label.last-name-lowercase'),
                    })}
                  />
                </Form.Item>
                <Form.Item
                  label={t('label.email')}
                  name="email"
                  rules={[{ type: 'email', required: true }]}>
                  <Input
                    placeholder={t('label.enter-entity', {
                      entity: t('label.email-lowercase'),
                    })}
                  />
                </Form.Item>
                <Form.Item
                  label={t('label.password')}
                  name="password"
                  rules={[
                    {
                      required: true,
                    },
                    {
                      pattern: passwordRegex,
                      message: t('message.password-error-message'),
                    },
                  ]}>
                  <Input.Password
                    autoComplete="off"
                    placeholder={t('label.enter-entity', {
                      entity: t('label.password-lowercase'),
                    })}
                  />
                </Form.Item>
                <Form.Item
                  label={t('label.password-type', {
                    type: t('label.confirm'),
                  })}
                  name="confirmPassword"
                  rules={[
                    {
                      validator: (_, value) => {
                        if (isEmpty(password)) {
                          return Promise.reject(
                            t('label.please-password-type-first')
                          );
                        }
                        if (value !== password) {
                          return Promise.reject(t('label.password-not-match'));
                        }

                        return Promise.resolve();
                      },
                    },
                  ]}>
                  <Input.Password
                    autoComplete="off"
                    placeholder={t('label.confirm-password')}
                  />
                </Form.Item>

                <Button className="w-full" htmlType="submit" type="primary">
                  {t('label.create-entity', {
                    entity: t('label.account'),
                  })}
                </Button>

                <Divider className="w-min-0  mt-8 mb-12 justify-center">
                  <Typography.Text type="secondary">
                    {t('label.or-lowercase')}
                  </Typography.Text>
                </Divider>

                <div className="mt-4 d-flex flex-center">
                  <Typography.Text className="mr-4">
                    {t('message.already-a-user')}
                  </Typography.Text>
                  <Button
                    ghost
                    data-testid="login"
                    type="link"
                    onClick={handleLogin}>
                    {t('label.login')}
                  </Button>
                </div>
              </Form>
            </div>
          ) : null}
        </div>
      </Col>

      <Col className="relative" span={14}>
        <div className="absolute inset-0">
          <img
            alt="bg-image"
            className="w-full h-full"
            data-testid="bg-image"
            src={loginBG}
          />
        </div>

        <LoginCarousel />
      </Col>
    </Row>
  );
};

export default BasicSignUp;
