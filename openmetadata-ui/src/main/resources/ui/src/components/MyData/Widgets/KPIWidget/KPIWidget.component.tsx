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

import { CloseOutlined, DragOutlined } from '@ant-design/icons';
import { Card, Col, Row, Space, Typography } from 'antd';
import { AxiosError } from 'axios';
import { isEmpty, isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { ReactComponent as KPIEmptyIcon } from '../../../../assets/svg/KPI-not-data-placeholder.svg';
import {
  CHART_WIDGET_DAYS_DURATION,
  GRAPH_BACKGROUND_COLOR,
} from '../../../../constants/constants';
import { KPI_WIDGET_GRAPH_COLORS } from '../../../../constants/DataInsight.constants';
import { DATA_INSIGHT_DOCS } from '../../../../constants/docs.constants';
import { SIZE } from '../../../../enums/common.enum';
import { WidgetWidths } from '../../../../enums/CustomizablePage.enum';
import { Kpi, KpiResult } from '../../../../generated/dataInsight/kpi/kpi';
import { UIKpiResult } from '../../../../interface/data-insight.interface';
import {
  getLatestKpiResult,
  getListKpiResult,
  getListKPIs,
} from '../../../../rest/KpiAPI';
import { Transi18next } from '../../../../utils/CommonUtils';
import { getKpiGraphData } from '../../../../utils/DataInsightUtils';
import {
  getCurrentMillis,
  getEpochMillisForPastDays,
} from '../../../../utils/date-time/DateTimeUtils';
import { showErrorToast } from '../../../../utils/ToastUtils';
import KPILatestResultsV1 from '../../../DataInsight/KPILatestResultsV1';
import './kpi-widget.less';
import { KPIWidgetProps } from './KPIWidget.interface';

const EmptyPlaceholder = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-center flex-col h-full p-t-sm">
      <KPIEmptyIcon width={SIZE.X_SMALL} />
      <div className="m-t-xs text-center">
        <Typography.Paragraph style={{ marginBottom: '0' }}>
          {t('message.no-kpi')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <Transi18next
            i18nKey="message.refer-to-our-doc"
            renderElement={
              <Link
                rel="noreferrer"
                target="_blank"
                to={{ pathname: DATA_INSIGHT_DOCS }}
              />
            }
            values={{
              doc: t('label.doc-plural-lowercase'),
            }}
          />
        </Typography.Paragraph>
      </div>
    </div>
  );
};

const KPIWidget = ({
  isEditView = false,
  selectedDays = CHART_WIDGET_DAYS_DURATION,
  handleRemoveWidget,
  widgetKey,
  selectedGridSize = WidgetWidths.medium,
}: KPIWidgetProps) => {
  const { t } = useTranslation();
  const [kpiList, setKpiList] = useState<Array<Kpi>>([]);
  const [isKPIListLoading, setIsKPIListLoading] = useState<boolean>(false);
  const [kpiResults, setKpiResults] = useState<KpiResult[]>([]);
  const [kpiLatestResults, setKpiLatestResults] =
    useState<Record<string, UIKpiResult>>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchKpiResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises = kpiList.map((kpi) =>
        getListKpiResult(kpi.fullyQualifiedName ?? '', {
          startTs: getEpochMillisForPastDays(selectedDays),
          endTs: getCurrentMillis(),
        })
      );
      const responses = await Promise.allSettled(promises);
      const kpiResultsList: KpiResult[] = [];

      responses.forEach((response) => {
        if (response.status === 'fulfilled') {
          kpiResultsList.push(...response.value.data);
        }
      });
      setKpiResults(kpiResultsList);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  }, [kpiList, selectedDays]);

  const fetchKpiLatestResults = async () => {
    setIsLoading(true);
    try {
      const promises = kpiList.map((kpi) =>
        getLatestKpiResult(kpi.fullyQualifiedName ?? '')
      );
      const responses = await Promise.allSettled(promises);

      const latestResults = responses.reduce((previous, curr) => {
        if (curr.status === 'fulfilled') {
          const resultValue: KpiResult = curr.value;
          const kpiName = resultValue.kpiFqn ?? '';

          // get the current kpi
          const kpi = kpiList.find((k) => k.fullyQualifiedName === kpiName);

          // get the kpiTarget
          const kpiTarget = kpi?.targetDefinition?.[0];

          if (!isUndefined(kpi) && !isUndefined(kpiTarget)) {
            return {
              ...previous,
              [kpiName]: {
                ...resultValue,
                target: kpiTarget?.value,
                metricType: kpi?.metricType,
                startDate: kpi?.startDate,
                endDate: kpi?.endDate,
                displayName: kpi.displayName ?? kpiName,
              },
            };
          }
        }

        return previous;
      }, {} as Record<string, UIKpiResult>);
      setKpiLatestResults(latestResults);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const { kpis, graphData } = useMemo(() => {
    return { ...getKpiGraphData(kpiResults, kpiList) };
  }, [kpiResults, kpiList]);

  const fetchKpiList = async () => {
    try {
      setIsKPIListLoading(true);
      const response = await getListKPIs({ fields: 'dataInsightChart' });
      setKpiList(response.data);
    } catch (_err) {
      setKpiList([]);
      showErrorToast(_err as AxiosError);
    } finally {
      setIsKPIListLoading(false);
    }
  };

  const handleCloseClick = useCallback(() => {
    !isUndefined(handleRemoveWidget) && handleRemoveWidget(widgetKey);
  }, [widgetKey]);

  const isWidgetSizeMedium = useMemo(
    () => selectedGridSize === WidgetWidths.medium,
    [selectedGridSize]
  );

  useEffect(() => {
    fetchKpiList().catch(() => {
      // catch handled in parent function
    });
  }, []);

  useEffect(() => {
    setKpiResults([]);
    setKpiLatestResults(undefined);
  }, [selectedDays]);

  useEffect(() => {
    if (kpiList.length) {
      fetchKpiResults();
      fetchKpiLatestResults();
    }
  }, [kpiList, selectedDays]);

  return (
    <Card
      className="kpi-widget-card h-full"
      data-testid="kpi-widget"
      id="kpi-charts"
      loading={isKPIListLoading || isLoading}>
      {isEditView && (
        <Row justify="end">
          <Col>
            <Space align="center">
              <DragOutlined
                className="drag-widget-icon cursor-pointer"
                data-testid="drag-widget-button"
                size={14}
              />
              <CloseOutlined
                data-testid="remove-widget-button"
                size={14}
                onClick={handleCloseClick}
              />
            </Space>
          </Col>
        </Row>
      )}
      <Row align="middle" justify="space-between">
        <Col>
          <Typography.Text className="font-medium">
            {t('label.kpi-title')}
          </Typography.Text>
        </Col>
      </Row>
      {isEmpty(kpiList) || isEmpty(graphData) ? (
        <EmptyPlaceholder />
      ) : (
        <Row className="p-t-md">
          <Col span={isWidgetSizeMedium ? 14 : 24}>
            <ResponsiveContainer debounce={1} height={250} width="100%">
              <LineChart
                data={graphData}
                margin={{
                  top: 10,
                  right: isWidgetSizeMedium ? 50 : 20,
                  left: -30,
                  bottom: 0,
                }}>
                <CartesianGrid
                  stroke={GRAPH_BACKGROUND_COLOR}
                  vertical={false}
                />
                <XAxis dataKey="timestamp" />
                <YAxis />
                {kpis.map((kpi, i) => (
                  <Line
                    dataKey={kpi}
                    key={kpi}
                    stroke={KPI_WIDGET_GRAPH_COLORS[i]}
                    type="monotone"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Col>
          {!isUndefined(kpiLatestResults) &&
            !isEmpty(kpiLatestResults) &&
            isWidgetSizeMedium && (
              <Col span={10}>
                <KPILatestResultsV1 kpiLatestResultsRecord={kpiLatestResults} />
              </Col>
            )}
        </Row>
      )}
    </Card>
  );
};

export default KPIWidget;
