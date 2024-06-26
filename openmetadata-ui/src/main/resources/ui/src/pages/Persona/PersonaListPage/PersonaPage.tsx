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
import { Button, Col, Row, Skeleton, Space } from 'antd';
import Card from 'antd/lib/card/Card';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import NextPrevious from '../../../components/common/NextPrevious/NextPrevious';
import { PagingHandlerParams } from '../../../components/common/NextPrevious/NextPrevious.interface';
import TitleBreadcrumb from '../../../components/common/TitleBreadcrumb/TitleBreadcrumb.component';
import { TitleBreadcrumbProps } from '../../../components/common/TitleBreadcrumb/TitleBreadcrumb.interface';
import { AddEditPersonaForm } from '../../../components/MyData/Persona/AddEditPersona/AddEditPersona.component';
import { PersonaDetailsCard } from '../../../components/MyData/Persona/PersonaDetailsCard/PersonaDetailsCard';
import PageHeader from '../../../components/PageHeader/PageHeader.component';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { GlobalSettingsMenuCategory } from '../../../constants/GlobalSettings.constants';
import { PAGE_HEADERS } from '../../../constants/PageHeaders.constant';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { Persona } from '../../../generated/entity/teams/persona';
import { Paging } from '../../../generated/type/paging';
import { useAuth } from '../../../hooks/authHooks';
import { usePaging } from '../../../hooks/paging/usePaging';
import { getAllPersonas } from '../../../rest/PersonaAPI';
import { getSettingPageEntityBreadCrumb } from '../../../utils/GlobalSettingsUtils';

export const PersonaPage = () => {
  const { isAdminUser } = useAuth();
  const { t } = useTranslation();

  const [persona, setPersona] = useState<Persona[]>();

  const [addEditPersona, setAddEditPersona] = useState<Persona>();

  const [isLoading, setIsLoading] = useState(false);
  const {
    currentPage,
    handlePageChange,
    pageSize,
    handlePageSizeChange,
    paging,
    handlePagingChange,
    showPagination,
  } = usePaging();

  const breadcrumbs: TitleBreadcrumbProps['titleLinks'] = useMemo(
    () =>
      getSettingPageEntityBreadCrumb(
        GlobalSettingsMenuCategory.MEMBERS,
        t('label.persona-plural')
      ),
    []
  );

  const fetchPersonas = useCallback(async (params?: Partial<Paging>) => {
    try {
      setIsLoading(true);
      const { data, paging } = await getAllPersonas({
        limit: pageSize,
        fields: 'users',
        after: params?.after,
        before: params?.before,
      });

      setPersona(data);
      handlePagingChange(paging);
    } catch (error) {
      // Error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonas();
  }, [pageSize]);

  const handleAddNewPersona = () => {
    setAddEditPersona({} as Persona);
  };

  const errorPlaceHolder = useMemo(
    () => (
      <Col className="mt-24 text-center" span={24}>
        <ErrorPlaceHolder
          heading={t('label.persona')}
          permission={isAdminUser}
          type={ERROR_PLACEHOLDER_TYPE.CREATE}
          onClick={handleAddNewPersona}
        />
      </Col>
    ),
    [isAdminUser]
  );

  const handlePersonalAddEditCancel = () => {
    setAddEditPersona(undefined);
  };

  const handlePersonaAddEditSave = () => {
    handlePersonalAddEditCancel();
    fetchPersonas();
  };

  const handlePersonaPageChange = ({
    currentPage,
    cursorType,
  }: PagingHandlerParams) => {
    handlePageChange(currentPage);
    if (cursorType) {
      fetchPersonas({ [cursorType]: paging[cursorType] });
    }
  };

  return (
    <PageLayoutV1 pageTitle={t('label.persona-plural')}>
      <Row
        className="user-listing page-container p-b-md"
        data-testid="user-list-v1-component"
        gutter={[16, 16]}>
        <Col span={24}>
          <TitleBreadcrumb titleLinks={breadcrumbs} />
        </Col>
        <Col span={18}>
          <PageHeader data={PAGE_HEADERS.PERSONAS} />
        </Col>
        <Col span={6}>
          <Space align="center" className="w-full justify-end" size={16}>
            <Button
              data-testid="add-persona-button"
              type="primary"
              onClick={handleAddNewPersona}>
              {t('label.add-entity', { entity: t('label.persona') })}
            </Button>
          </Space>
        </Col>

        {isLoading
          ? [1, 2, 3].map((key) => (
              <Col key={key} span={8}>
                <Card>
                  <Skeleton active paragraph title />
                </Card>
              </Col>
            ))
          : persona?.map((persona) => (
              <Col key={persona.id} span={8}>
                <PersonaDetailsCard persona={persona} />
              </Col>
            ))}

        {isEmpty(persona) && !isLoading && errorPlaceHolder}

        {showPagination && (
          <Col span={24}>
            <NextPrevious
              currentPage={currentPage}
              pageSize={pageSize}
              paging={paging}
              pagingHandler={handlePersonaPageChange}
              onShowSizeChange={handlePageSizeChange}
            />
          </Col>
        )}

        {Boolean(addEditPersona) && (
          <AddEditPersonaForm
            persona={addEditPersona}
            onCancel={handlePersonalAddEditCancel}
            onSave={handlePersonaAddEditSave}
          />
        )}
      </Row>
    </PageLayoutV1>
  );
};
