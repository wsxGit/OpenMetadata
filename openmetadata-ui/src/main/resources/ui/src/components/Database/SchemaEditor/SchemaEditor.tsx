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

import { Button, Tooltip } from 'antd';
import classNames from 'classnames';
import { Editor, EditorChange } from 'codemirror';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/selection/active-line';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/sql/sql';
import { isUndefined } from 'lodash';
import React, { useEffect, useState } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import { useTranslation } from 'react-i18next';
import { ReactComponent as CopyIcon } from '../../../assets/svg/icon-copy.svg';
import { JSON_TAB_SIZE } from '../../../constants/constants';
import { CSMode } from '../../../enums/codemirror.enum';
import { useClipboard } from '../../../hooks/useClipBoard';
import { getSchemaEditorValue } from '../../../utils/SchemaEditor.utils';
import './schema-editor.less';
import { SchemaEditorProps } from './SchemaEditor.interface';

const SchemaEditor = ({
  value = '',
  className = '',
  mode = {
    name: CSMode.JAVASCRIPT,
    json: true,
  },
  options,
  editorClass,
  showCopyButton = true,
  onChange,
}: SchemaEditorProps) => {
  const { t } = useTranslation();
  const defaultOptions = {
    tabSize: JSON_TAB_SIZE,
    indentUnit: JSON_TAB_SIZE,
    indentWithTabs: false,
    lineNumbers: true,
    lineWrapping: true,
    styleActiveLine: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    mode,
    readOnly: false,
    ...options,
  };
  const [internalValue, setInternalValue] = useState<string>(
    getSchemaEditorValue(value)
  );
  const { onCopyToClipBoard, hasCopied } = useClipboard(internalValue);

  const handleEditorInputBeforeChange = (
    _editor: Editor,
    _data: EditorChange,
    value: string
  ): void => {
    setInternalValue(getSchemaEditorValue(value));
  };
  const handleEditorInputChange = (
    _editor: Editor,
    _data: EditorChange,
    value: string
  ): void => {
    if (!isUndefined(onChange)) {
      onChange(getSchemaEditorValue(value));
    }
  };

  useEffect(() => {
    setInternalValue(getSchemaEditorValue(value));
  }, [value]);

  return (
    <div
      className={classNames('relative', className)}
      data-testid="code-mirror-container">
      {showCopyButton && (
        <div className="query-editor-button">
          <Tooltip
            title={
              hasCopied ? t('label.copied') : t('message.copy-to-clipboard')
            }>
            <Button
              className="flex-center bg-white"
              data-testid="query-copy-button"
              icon={<CopyIcon height={16} width={16} />}
              onClick={onCopyToClipBoard}
            />
          </Tooltip>
        </div>
      )}

      <CodeMirror
        className={editorClass}
        options={defaultOptions}
        value={internalValue}
        onBeforeChange={handleEditorInputBeforeChange}
        onChange={handleEditorInputChange}
      />
    </div>
  );
};

export default SchemaEditor;
