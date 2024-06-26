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

import { Tabs } from 'antd';
import { Change } from 'diff';
import { isEqual } from 'lodash';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RichTextEditor from '../../../components/common/RichTextEditor/RichTextEditor';
import { EditorContentRef } from '../../../components/common/RichTextEditor/RichTextEditor.interface';
import RichTextEditorPreviewer from '../../../components/common/RichTextEditor/RichTextEditorPreviewer';
import { getDescriptionDiff } from '../../../utils/TasksUtils';
import { DiffView } from './DiffView';

interface Props {
  value: string;
  suggestion: string;
  placeHolder?: string;
  onChange?: (value: string) => void;
}

export const DescriptionTabs = ({
  value = '',
  suggestion,
  placeHolder,
  onChange,
}: Props) => {
  const { t } = useTranslation();
  const { TabPane } = Tabs;
  const [description] = useState(value);
  const [diffs, setDiffs] = useState<Change[]>([]);
  const [activeTab, setActiveTab] = useState<string>('3');
  const markdownRef = useRef<EditorContentRef>();

  const onTabChange = useCallback(
    (key: string) => {
      setActiveTab(key);
      if (isEqual(key, '2')) {
        const newDescription = markdownRef.current?.getEditorContent();
        if (newDescription) {
          const diff = getDescriptionDiff(description, newDescription);
          setDiffs(diff);
        }
      } else {
        setDiffs([]);
      }
    },
    [markdownRef]
  );

  return (
    <Tabs
      activeKey={activeTab}
      className="ant-tabs-description"
      data-testid="tabs"
      size="small"
      type="card"
      onChange={onTabChange}>
      <TabPane data-testid="current-tab" key="1" tab="Current">
        <div className="border border-main rounded-4 p-sm m-t-sm">
          {description.trim() ? (
            <RichTextEditorPreviewer
              enableSeeMoreVariant={false}
              markdown={description}
            />
          ) : (
            <span className="text-grey-muted">
              {t('label.no-entity', { entity: t('label.description') })}
            </span>
          )}
        </div>
      </TabPane>
      <TabPane data-testid="diff-tab" key="2" tab="Diff">
        <DiffView
          className="border border-main rounded-4 p-sm m-t-sm"
          diffArr={diffs}
        />
      </TabPane>
      <TabPane data-testid="new-tab" key="3" tab="New">
        <RichTextEditor
          className="m-t-sm"
          height="208px"
          initialValue={suggestion}
          placeHolder={placeHolder ?? t('label.update-description')}
          ref={markdownRef}
          onTextChange={onChange}
        />
      </TabPane>
    </Tabs>
  );
};
