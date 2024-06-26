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

import { Form, Modal, Select } from 'antd';
import { AxiosError } from 'axios';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  API_RES_MAX_SIZE,
  VALIDATION_MESSAGES,
} from '../../../constants/constants';
import { getGlossaryTerms } from '../../../rest/glossaryAPI';
import { getEntityName } from '../../../utils/EntityUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import {
  ChangeParentHierarchyProps,
  SelectOptions,
} from './ChangeParentHierarchy.interface';

const ChangeParentHierarchy = ({
  selectedData,
  onCancel,
  onSubmit,
}: ChangeParentHierarchyProps) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loadingState, setLoadingState] = useState({
    isSaving: false,
    isFetching: true,
  });

  const [options, setOptions] = useState<SelectOptions[]>([]);

  const fetchGlossaryTerm = async () => {
    setLoadingState((prev) => ({ ...prev, isFetching: true }));
    try {
      const { data } = await getGlossaryTerms({
        glossary: selectedData.glossary.id,
        limit: API_RES_MAX_SIZE,
      });

      setOptions(
        data
          .filter((item) => item.id !== selectedData.id)
          .map((item) => ({
            label: getEntityName(item),
            value: item.fullyQualifiedName ?? '',
          }))
      );
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setLoadingState((prev) => ({ ...prev, isFetching: false }));
    }
  };

  const handleSubmit = async (value: { parent: string }) => {
    setLoadingState((prev) => ({ ...prev, isSaving: true }));
    await onSubmit(value.parent);
    setLoadingState((prev) => ({ ...prev, isSaving: false }));
  };

  useEffect(() => {
    fetchGlossaryTerm();
  }, []);

  return (
    <Modal
      open
      cancelText={t('label.cancel')}
      okButtonProps={{
        form: 'change-parent-hierarchy-modal',
        htmlType: 'submit',
        loading: loadingState.isSaving,
      }}
      okText={t('label.submit')}
      title={t('label.change-entity', { entity: t('label.parent') })}
      onCancel={onCancel}>
      <Form
        form={form}
        id="change-parent-hierarchy-modal"
        layout="vertical"
        validateMessages={VALIDATION_MESSAGES}
        onFinish={handleSubmit}>
        <Form.Item
          label={t('label.select-field', {
            field: t('label.parent'),
          })}
          name="parent"
          rules={[
            {
              required: true,
            },
          ]}>
          <Select
            data-testid="change-parent-select"
            loading={loadingState.isFetching}
            options={options}
            placeholder={t('label.select-field', {
              field: t('label.parent'),
            })}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangeParentHierarchy;
