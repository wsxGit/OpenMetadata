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

import {
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Row,
  Space,
  Table,
  Typography,
} from 'antd';
import { isEmpty, isNil } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LazyLog } from 'react-lazylog';
import { ReactComponent as IconSuccessBadge } from '../../../../assets/svg/success-badge.svg';
import { getEntityStatsData } from '../../../../utils/ApplicationUtils';
import { formatDateTimeWithTimezone } from '../../../../utils/date-time/DateTimeUtils';
import { formatJsonString } from '../../../../utils/StringsUtils';
import AppBadge from '../../../common/Badge/Badge.component';
import CopyToClipboardButton from '../../../common/CopyToClipboardButton/CopyToClipboardButton';
import './app-logs-viewer.less';
import {
  AppLogsViewerProps,
  EntityStats,
  JobStats,
} from './AppLogsViewer.interface';

const AppLogsViewer = ({ data }: AppLogsViewerProps) => {
  const { t } = useTranslation();

  const { successContext, failureContext, timestamp } = data;

  const handleJumpToEnd = () => {
    const logsBody = document.getElementsByClassName(
      'ReactVirtualized__Grid'
    )[0];

    if (!isNil(logsBody)) {
      logsBody.scrollTop = logsBody.scrollHeight;
    }
  };

  const logsRender = useCallback(
    (logs: string) =>
      logs && (
        <Row className="p-t-sm">
          <Col className="d-flex justify-end" span={24}>
            <Space size="small">
              <Button
                ghost
                data-testid="jump-to-end-button"
                type="primary"
                onClick={handleJumpToEnd}>
                {t('label.jump-to-end')}
              </Button>

              <CopyToClipboardButton copyText={logs} />
            </Space>
          </Col>

          <Col
            className="p-t-md h-min-400 lazy-log-container"
            data-testid="lazy-log"
            span={24}>
            <LazyLog
              caseInsensitive
              enableSearch
              selectableLines
              extraLines={1} // 1 is to be add so that linux users can see last line of the log
              text={logs}
            />
          </Col>
        </Row>
      ),
    [handleJumpToEnd]
  );

  const statsRender = useCallback(
    (jobStats: JobStats) => (
      <Card data-testid="stats-component" size="small">
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Space wrap direction="horizontal" size={0}>
              <div className="flex">
                <span className="text-grey-muted">{`${t(
                  'label.status'
                )}:`}</span>

                <Space align="center" className="m-l-xs" size={8}>
                  <IconSuccessBadge height={14} width={14} />
                  <span>{t('label.success')}</span>
                </Space>
              </div>
              <Divider type="vertical" />
              <div className="flex">
                <span className="text-grey-muted">{`${t(
                  'label.index-states'
                )}:`}</span>
                <span className="m-l-xs">
                  <Space size={8}>
                    <Badge
                      showZero
                      className="request-badge running"
                      count={jobStats.totalRecords}
                      overflowCount={99999999}
                      title={`${t('label.total-index-sent')}: ${
                        jobStats.totalRecords
                      }`}
                    />

                    <Badge
                      showZero
                      className="request-badge success"
                      count={jobStats.successRecords}
                      overflowCount={99999999}
                      title={`${t('label.entity-index', {
                        entity: t('label.success'),
                      })}: ${jobStats.successRecords}`}
                    />

                    <Badge
                      showZero
                      className="request-badge failed"
                      count={jobStats.failedRecords}
                      overflowCount={99999999}
                      title={`${t('label.entity-index', {
                        entity: t('label.failed'),
                      })}: ${jobStats.failedRecords}`}
                    />
                  </Space>
                </span>
              </div>
              <Divider type="vertical" />
              <div className="flex">
                <span className="text-grey-muted">{`${t(
                  'label.last-updated'
                )}:`}</span>
                <span className="m-l-xs">
                  {timestamp ? formatDateTimeWithTimezone(timestamp) : '--'}
                </span>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>
    ),
    [timestamp, formatDateTimeWithTimezone]
  );

  const tableColumn = useMemo(() => {
    const entityTotalJobStatsData =
      successContext?.stats?.jobStats || failureContext?.stats?.jobStats;

    return isEmpty(entityTotalJobStatsData)
      ? []
      : [
          {
            title: t('label.name'),
            dataIndex: 'name',
            key: 'name',
          },
          {
            title: (
              <div className="d-flex items-center">
                <Typography.Text>
                  {t('label.entity-record-plural', {
                    entity: t('label.total'),
                  })}{' '}
                </Typography.Text>
                <AppBadge
                  className="entity-stats total m-l-sm"
                  label={entityTotalJobStatsData.totalRecords}
                />
              </div>
            ),
            dataIndex: 'totalRecords',
            key: 'totalRecords',
            render: (text: string) => (
              <Typography.Text className="text-primary">{text}</Typography.Text>
            ),
          },
          {
            title: (
              <div className="d-flex items-center">
                <Typography.Text>
                  {t('label.entity-record-plural', {
                    entity: t('label.success'),
                  })}{' '}
                </Typography.Text>
                <AppBadge
                  className="entity-stats success m-l-sm"
                  label={entityTotalJobStatsData.successRecords}
                />
              </div>
            ),
            dataIndex: 'successRecords',
            key: 'successRecords',
            render: (text: string) => (
              <Typography.Text className="text-success">{text}</Typography.Text>
            ),
          },
          {
            title: (
              <div className="d-flex items-center">
                <Typography.Text>
                  {t('label.entity-record-plural', {
                    entity: t('label.failed'),
                  })}{' '}
                </Typography.Text>
                <AppBadge
                  className="entity-stats failure m-l-sm"
                  label={entityTotalJobStatsData.failedRecords}
                />
              </div>
            ),
            dataIndex: 'failedRecords',
            key: 'failedRecords',
            render: (text: string) => (
              <Typography.Text className="text-failure">{text}</Typography.Text>
            ),
          },
        ];
  }, [successContext, failureContext]);

  const entityStatsRenderer = useCallback(
    (entityStats: EntityStats) => {
      return (
        <Table
          bordered
          className="m-t-md"
          columns={tableColumn}
          data-testid="app-entity-stats-history-table"
          dataSource={getEntityStatsData(entityStats)}
          pagination={false}
          rowKey="name"
          scroll={{ y: 200 }}
          size="small"
        />
      );
    },
    [tableColumn]
  );

  return (
    <>
      {successContext?.stats?.jobStats &&
        statsRender(successContext?.stats.jobStats)}
      {failureContext?.stats?.jobStats &&
        statsRender(failureContext?.stats.jobStats)}

      {successContext?.stats?.entityStats &&
        entityStatsRenderer(successContext.stats.entityStats)}
      {failureContext?.stats?.entityStats &&
        entityStatsRenderer(failureContext.stats.entityStats)}

      {logsRender(
        formatJsonString(
          JSON.stringify(
            failureContext?.stackTrace ?? failureContext?.failure ?? {}
          )
        )
      )}
    </>
  );
};

export default AppLogsViewer;
