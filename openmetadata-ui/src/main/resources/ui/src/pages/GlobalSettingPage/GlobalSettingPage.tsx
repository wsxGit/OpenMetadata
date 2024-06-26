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

import { Col, Row } from 'antd';
import { isEmpty, isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import PageHeader from '../../components/PageHeader/PageHeader.component';
import PageLayoutV1 from '../../components/PageLayoutV1/PageLayoutV1';
import SettingItemCard from '../../components/Settings/SettingItemCard/SettingItemCard.component';
import { PAGE_HEADERS } from '../../constants/PageHeaders.constant';
import { usePermissionProvider } from '../../context/PermissionProvider/PermissionProvider';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import { useAuth } from '../../hooks/authHooks';
import {
  getGlobalSettingMenuItem,
  getGlobalSettingsMenuWithPermission,
  SettingMenuItem,
} from '../../utils/GlobalSettingsUtils';
import { getSettingPath } from '../../utils/RouterUtils';
import './global-setting-page.style.less';

const GlobalSettingPage = () => {
  const history = useHistory();
  const { t } = useTranslation();

  const { permissions } = usePermissionProvider();
  const { isAdminUser } = useAuth();

  const [settings, setSettings] = useState<SettingMenuItem[]>([]);

  const settingItems = useMemo(
    () =>
      getGlobalSettingsMenuWithPermission(permissions, isAdminUser).filter(
        (curr: SettingMenuItem) => {
          const menuItem = getGlobalSettingMenuItem(curr);

          if (!isUndefined(menuItem.isProtected)) {
            return menuItem.isProtected;
          }

          if (menuItem.items && menuItem.items.length > 0) {
            return true;
          }

          return false;
        }
      ),
    [permissions, isAdminUser]
  );

  const handleSettingItemClick = useCallback((category: string) => {
    history.push(getSettingPath(category));
  }, []);

  useEffect(() => {
    setSettings(settingItems);
  }, []);

  if (isEmpty(settingItems)) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  return (
    <PageLayoutV1 pageTitle={t('label.setting-plural')}>
      <Row className="page-container" gutter={[0, 20]}>
        <Col span={24}>
          <PageHeader data={PAGE_HEADERS.SETTING} />
        </Col>

        <Col span={24}>
          <Row gutter={[20, 20]}>
            {settings.map((setting) => (
              <Col key={setting?.key} span={6}>
                <SettingItemCard
                  data={setting}
                  onClick={handleSettingItemClick}
                />
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    </PageLayoutV1>
  );
};

export default GlobalSettingPage;
