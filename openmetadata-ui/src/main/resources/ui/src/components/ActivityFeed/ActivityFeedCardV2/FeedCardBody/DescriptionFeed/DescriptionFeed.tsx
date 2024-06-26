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

import { Col, Row } from 'antd';
import React, { useMemo } from 'react';
import { EntityField } from '../../../../../constants/Feeds.constants';
import { getTextDiff } from '../../../../../utils/EntityVersionUtils';
import {
  getFeedChangeFieldLabel,
  getFieldOperationIcon,
  getFrontEndFormat,
} from '../../../../../utils/FeedUtils';
import RichTextEditorPreviewer from '../../../../common/RichTextEditor/RichTextEditorPreviewer';
import { DescriptionFeedProps } from './DescriptionFeed.interface';

function DescriptionFeed({ feed }: Readonly<DescriptionFeedProps>) {
  const { message, fieldOperation } = useMemo(() => {
    const diffText = getTextDiff(
      feed.feedInfo?.entitySpecificInfo?.previousDescription ?? '',
      feed.feedInfo?.entitySpecificInfo?.newDescription ?? ''
    );

    return {
      message: diffText,
      fieldOperation: feed.fieldOperation,
      fieldChanged: getFeedChangeFieldLabel(
        feed.feedInfo?.fieldName as EntityField
      ),
    };
  }, [feed]);

  const operationIcon = useMemo(
    () => getFieldOperationIcon(fieldOperation),
    [fieldOperation]
  );

  return (
    <Row gutter={[12, 12]} wrap={false}>
      <Col className="h-4">{operationIcon}</Col>
      <Col>
        <RichTextEditorPreviewer
          className="text-wrap"
          markdown={getFrontEndFormat(message)}
        />
      </Col>
    </Row>
  );
}

export default DescriptionFeed;
