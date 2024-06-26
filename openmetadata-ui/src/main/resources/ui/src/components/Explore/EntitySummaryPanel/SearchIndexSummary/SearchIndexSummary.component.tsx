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
import { get, isEmpty } from 'lodash';
import { default as React, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SummaryEntityType } from '../../../../enums/EntitySummary.enum';
import { ExplorePageTabs } from '../../../../enums/Explore.enum';
import { SearchIndex } from '../../../../generated/entity/data/searchIndex';
import {
  getFormattedEntityData,
  getSortedTagsWithHighlight,
} from '../../../../utils/EntitySummaryPanelUtils';
import {
  DRAWER_NAVIGATION_OPTIONS,
  getEntityOverview,
} from '../../../../utils/EntityUtils';
import SummaryPanelSkeleton from '../../../common/Skeleton/SummaryPanelSkeleton/SummaryPanelSkeleton.component';
import SummaryTagsDescription from '../../../common/SummaryTagsDescription/SummaryTagsDescription.component';
import CommonEntitySummaryInfo from '../CommonEntitySummaryInfo/CommonEntitySummaryInfo';
import SummaryList from '../SummaryList/SummaryList.component';
import { BasicEntityInfo } from '../SummaryList/SummaryList.interface';
import { SearchIndexSummaryProps } from './SearchIndexSummary.interface';

function SearchIndexSummary({
  entityDetails,
  componentType = DRAWER_NAVIGATION_OPTIONS.explore,
  tags,
  isLoading,
  highlights,
}: SearchIndexSummaryProps) {
  const { t } = useTranslation();
  const [searchIndexDetails, setSearchIndexDetails] =
    useState<SearchIndex>(entityDetails);

  const isExplore = useMemo(
    () => componentType === DRAWER_NAVIGATION_OPTIONS.explore,
    [componentType]
  );

  const { fields } = searchIndexDetails;

  const formattedFieldsData: BasicEntityInfo[] = useMemo(
    () => getFormattedEntityData(SummaryEntityType.FIELD, fields, highlights),
    [fields, searchIndexDetails]
  );

  const entityInfo = useMemo(
    () => getEntityOverview(ExplorePageTabs.SEARCH_INDEX, searchIndexDetails),
    [searchIndexDetails]
  );

  useEffect(() => {
    if (!isEmpty(entityDetails)) {
      setSearchIndexDetails(entityDetails);
    }
  }, [entityDetails]);

  return (
    <SummaryPanelSkeleton loading={isLoading ?? isEmpty(searchIndexDetails)}>
      <>
        {!isExplore ? (
          <>
            <Row className="m-md m-t-0" gutter={[0, 4]}>
              <Col span={24}>
                <CommonEntitySummaryInfo
                  componentType={componentType}
                  entityInfo={entityInfo}
                />
              </Col>
            </Row>

            <Divider className="m-y-xs" />

            <SummaryTagsDescription
              entityDetail={entityDetails}
              tags={tags ?? []}
            />
            <Divider className="m-y-xs" />
          </>
        ) : null}

        {isExplore ? (
          <>
            <SummaryTagsDescription
              entityDetail={entityDetails}
              tags={
                tags ??
                getSortedTagsWithHighlight(
                  entityDetails.tags,
                  get(highlights, 'tag.name')
                )
              }
            />
            <Divider className="m-y-xs" />
          </>
        ) : null}
        <Row className="m-md" gutter={[0, 8]}>
          <Col span={24}>
            <Typography.Text
              className="summary-panel-section-title"
              data-testid="fields-header">
              {t('label.field-plural')}
            </Typography.Text>
          </Col>
          <Col span={24}>
            <SummaryList
              entityType={SummaryEntityType.FIELD}
              formattedEntityData={formattedFieldsData}
            />
          </Col>
        </Row>
      </>
    </SummaryPanelSkeleton>
  );
}

export default SearchIndexSummary;
