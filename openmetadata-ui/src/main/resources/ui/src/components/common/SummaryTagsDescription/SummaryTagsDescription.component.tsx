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
import { Col, Divider, Row, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import TagsViewer from '../../../components/Tag/TagsViewer/TagsViewer';
import { BasicEntityInfo } from '../../Explore/EntitySummaryPanel/SummaryList/SummaryList.interface';
import { EntityUnion } from '../../Explore/ExplorePage.interface';
import RichTextEditorPreviewer from '../RichTextEditor/RichTextEditorPreviewer';

const SummaryTagsDescription = ({
  tags = [],
  entityDetail,
}: {
  tags: BasicEntityInfo['tags'];
  entityDetail: EntityUnion;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Row className="m-md" gutter={[0, 8]}>
        <Col span={24}>
          <Typography.Text
            className="summary-panel-section-title"
            data-testid="tags-header">
            {t('label.tag-plural')}
          </Typography.Text>
        </Col>
        <Col className="d-flex flex-wrap gap-2" span={24}>
          {tags.length > 0 ? (
            <TagsViewer sizeCap={-1} tags={tags} />
          ) : (
            <Typography.Text className="text-grey-body">
              {t('label.no-tags-added')}
            </Typography.Text>
          )}
        </Col>
      </Row>

      <Divider className="m-y-xs" />

      <Row className="m-md" gutter={[0, 8]}>
        <Col span={24}>
          <Typography.Text
            className="summary-panel-section-title"
            data-testid="description-header">
            {t('label.description')}
          </Typography.Text>
        </Col>
        <Col span={24}>
          <div>
            {entityDetail.description?.trim() ? (
              <RichTextEditorPreviewer
                markdown={entityDetail.description}
                maxLength={200}
              />
            ) : (
              <Typography className="text-grey-body">
                {t('label.no-data-found')}
              </Typography>
            )}
          </div>
        </Col>
      </Row>
    </>
  );
};

export default SummaryTagsDescription;
