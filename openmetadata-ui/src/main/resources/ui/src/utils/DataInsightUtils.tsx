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

import { Card, Typography } from 'antd';
import { RangePickerProps } from 'antd/lib/date-picker';
import { t } from 'i18next';
import {
  first,
  groupBy,
  isEmpty,
  isInteger,
  isString,
  isUndefined,
  last,
  omit,
  round,
  sortBy,
  startCase,
  sumBy,
  toNumber,
} from 'lodash';
import moment from 'moment';
import React from 'react';
import { ListItem } from 'react-awesome-query-builder';
import { LegendProps, Surface } from 'recharts';
import { SearchDropdownOption } from '../components/SearchDropdown/SearchDropdown.interface';
import {
  GRAYED_OUT_COLOR,
  PLACEHOLDER_ROUTE_TAB,
  ROUTES,
} from '../constants/constants';
import {
  ENTITIES_SUMMARY_LIST,
  WEB_SUMMARY_LIST,
} from '../constants/DataInsight.constants';
import { KpiTargetType } from '../generated/api/dataInsight/kpi/createKpiRequest';
import {
  DataInsightChartResult,
  DataInsightChartType,
} from '../generated/dataInsight/dataInsightChartResult';
import { Kpi, KpiResult } from '../generated/dataInsight/kpi/kpi';
import { DailyActiveUsers } from '../generated/dataInsight/type/dailyActiveUsers';
import { TotalEntitiesByTier } from '../generated/dataInsight/type/totalEntitiesByTier';
import {
  ChartValue,
  DataInsightChartTooltipProps,
  DataInsightTabs,
} from '../interface/data-insight.interface';
import { pluralize } from './CommonUtils';
import { customFormatDateTime, formatDate } from './date-time/DateTimeUtils';

const checkIsPercentageGraph = (dataInsightChartType: DataInsightChartType) =>
  [
    DataInsightChartType.PercentageOfEntitiesWithDescriptionByType,
    DataInsightChartType.PercentageOfEntitiesWithOwnerByType,
    DataInsightChartType.PercentageOfServicesWithDescription,
    DataInsightChartType.PercentageOfServicesWithOwner,
  ].includes(dataInsightChartType);

export const renderLegend = (
  legendData: LegendProps,
  activeKeys = [] as string[],
  valueFormatter?: (value: string) => string
) => {
  const { payload = [] } = legendData;

  return (
    <ul className="custom-data-insight-legend">
      {payload.map((entry, index) => {
        const isActive =
          activeKeys.length === 0 || activeKeys.includes(entry.value);

        return (
          <li
            className="recharts-legend-item custom-data-insight-legend-item"
            key={`item-${index}`}
            onClick={(e) =>
              legendData.onClick && legendData.onClick(entry, index, e)
            }
            onMouseEnter={(e) =>
              legendData.onMouseEnter &&
              legendData.onMouseEnter(entry, index, e)
            }
            onMouseLeave={(e) =>
              legendData.onMouseLeave &&
              legendData.onMouseLeave(entry, index, e)
            }>
            <Surface className="m-r-xss" height={14} version="1.1" width={14}>
              <rect
                fill={isActive ? entry.color : GRAYED_OUT_COLOR}
                height="14"
                rx="2"
                width="14"
              />
            </Surface>
            <span style={{ color: isActive ? 'inherit' : GRAYED_OUT_COLOR }}>
              {valueFormatter ? valueFormatter(entry.value) : entry.value}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export const getEntryFormattedValue = (
  value: number | string | undefined,
  dataKey: number | string | undefined,
  kpiTooltipRecord: DataInsightChartTooltipProps['kpiTooltipRecord'],
  isPercentage?: boolean
) => {
  let suffix = '';
  if (isPercentage) {
    suffix = '%';
  }

  // handle kpi metric type check for entry value suffix

  if (
    !isUndefined(kpiTooltipRecord) &&
    !isEmpty(kpiTooltipRecord) &&
    !isUndefined(dataKey)
  ) {
    const metricType = kpiTooltipRecord[dataKey];
    suffix = metricType === KpiTargetType.Percentage ? '%' : suffix;
  }

  if (!isUndefined(value)) {
    if (isString(value)) {
      return `${value}${suffix}`;
    } else if (isInteger(value)) {
      return `${value}${suffix}`;
    } else {
      return `${round(value, 2)}${suffix}`;
    }
  } else {
    return '';
  }
};

export const CustomTooltip = (props: DataInsightChartTooltipProps) => {
  const {
    active,
    payload = [],
    isPercentage,
    valueFormatter,
    kpiTooltipRecord,
  } = props;

  if (active && payload && payload.length) {
    const timestamp = formatDate(payload[0].payload.timestampValue || 0);

    return (
      <Card
        className="custom-data-insight-tooltip"
        title={<Typography.Title level={5}>{timestamp}</Typography.Title>}>
        <ul className="custom-data-insight-tooltip-container">
          {payload.map((entry, index) => (
            <li
              className="d-flex items-center justify-between gap-6 p-b-xss text-sm"
              key={`item-${index}`}>
              <span className="flex items-center text-grey-muted">
                <Surface className="mr-2" height={12} version="1.1" width={12}>
                  <rect fill={entry.color} height="14" rx="2" width="14" />
                </Surface>
                {startCase(entry.dataKey as string)}
              </span>
              <span className="font-medium">
                {valueFormatter
                  ? valueFormatter(entry.value)
                  : getEntryFormattedValue(
                      entry.value,
                      entry.dataKey,
                      kpiTooltipRecord,
                      isPercentage
                    )}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  return null;
};

/**
 * takes timestamps and raw data as inputs and return the graph data by mapping timestamp
 * @param timestamps timestamps array
 * @param rawData graph rwa data
 * @returns graph data
 */
const prepareGraphData = (
  timestamps: string[],
  rawData: (
    | {
        [x: string]: ChartValue;
        timestamp: string;
      }
    | undefined
  )[]
) => {
  return (
    timestamps.map((timestamp) => {
      return rawData.reduce((previous, current) => {
        if (current?.timestamp === timestamp) {
          return { ...previous, ...current };
        }

        return previous;
      }, {});
    }) || []
  );
};

/**
 *
 * @param latestData latest chart data
 * @returns latest sum count for chart
 */
const getLatestCount = (latestData = {}) => {
  let total = 0;
  const latestEntries = Object.entries(latestData ?? {});

  for (const entry of latestEntries) {
    // if key is 'timestamp' or 'timestampValue' skipping its count for total
    if (!['timestamp', 'timestampValue'].includes(entry[0])) {
      total += toNumber(entry[1]);
    }
  }

  return total;
};

/**
 *
 * @param rawData raw chart data
 * @param dataInsightChartType chart type
 * @returns latest percentage for the chart
 */
const getLatestPercentage = (
  rawData: DataInsightChartResult['data'] = [],
  dataInsightChartType: DataInsightChartType
) => {
  let totalEntityCount = 0;
  let totalEntityWithDescription = 0;
  let totalEntityWithOwner = 0;

  const modifiedData = rawData
    .map((raw) => {
      const timestamp = raw.timestamp;
      if (timestamp) {
        return {
          ...raw,
          timestamp,
        };
      }

      return;
    })
    .filter(Boolean);

  const sortedData = sortBy(modifiedData, 'timestamp');
  const groupDataByTimeStamp = groupBy(sortedData, 'timestamp');
  const latestData = last(sortedData);
  if (latestData) {
    const latestChartRecords = groupDataByTimeStamp[latestData.timestamp];

    latestChartRecords.forEach((record) => {
      totalEntityCount += record?.entityCount ?? 0;
      totalEntityWithDescription += record?.completedDescription ?? 0;
      totalEntityWithOwner += record?.hasOwner ?? 0;
    });
    switch (dataInsightChartType) {
      case DataInsightChartType.PercentageOfEntitiesWithDescriptionByType:
      case DataInsightChartType.PercentageOfServicesWithDescription:
        return ((totalEntityWithDescription / totalEntityCount) * 100).toFixed(
          2
        );

      case DataInsightChartType.PercentageOfEntitiesWithOwnerByType:
      case DataInsightChartType.PercentageOfServicesWithOwner:
        return ((totalEntityWithOwner / totalEntityCount) * 100).toFixed(2);

      default:
        return 0;
    }
  }

  return 0;
};

/**
 *
 * @param rawData raw chart data
 * @param dataInsightChartType chart type
 * @returns old percentage for the chart
 */
const getOldestPercentage = (
  rawData: DataInsightChartResult['data'] = [],
  dataInsightChartType: DataInsightChartType
) => {
  let totalEntityCount = 0;
  let totalEntityWithDescription = 0;
  let totalEntityWithOwner = 0;

  const modifiedData = rawData
    .map((raw) => {
      const timestamp = raw.timestamp;
      if (timestamp) {
        return {
          ...raw,
          timestamp,
        };
      }

      return;
    })
    .filter(Boolean);

  const sortedData = sortBy(modifiedData, 'timestamp');
  const groupDataByTimeStamp = groupBy(sortedData, 'timestamp');
  const oldestData = first(sortedData);
  if (oldestData) {
    const oldestChartRecords = groupDataByTimeStamp[oldestData.timestamp];

    oldestChartRecords.forEach((record) => {
      totalEntityCount += record?.entityCount ?? 0;
      totalEntityWithDescription += record?.completedDescription ?? 0;
      totalEntityWithOwner += record?.hasOwner ?? 0;
    });
    switch (dataInsightChartType) {
      case DataInsightChartType.PercentageOfEntitiesWithDescriptionByType:
      case DataInsightChartType.PercentageOfServicesWithDescription:
        return ((totalEntityWithDescription / totalEntityCount) * 100).toFixed(
          2
        );

      case DataInsightChartType.PercentageOfEntitiesWithOwnerByType:
      case DataInsightChartType.PercentageOfServicesWithOwner:
        return ((totalEntityWithOwner / totalEntityCount) * 100).toFixed(2);

      default:
        return 0;
    }
  }

  return 0;
};

/**
 *
 * @param rawData raw chart data
 * @param dataInsightChartType chart type
 * @returns formatted chart for graph
 */
const getGraphFilteredData = (
  rawData: DataInsightChartResult['data'] = [],
  dataInsightChartType: DataInsightChartType
) => {
  const entities: string[] = [];
  const timestamps: string[] = [];

  const filteredData = rawData
    .map((data) => {
      if (data.timestamp && (data.entityType || data.serviceName)) {
        let value;
        const timestamp = customFormatDateTime(data.timestamp, 'MMM dd');
        if (!entities.includes(data.entityType ?? data.serviceName ?? '')) {
          entities.push(data.entityType ?? data.serviceName ?? '');
        }

        if (!timestamps.includes(timestamp)) {
          timestamps.push(timestamp);
        }

        switch (dataInsightChartType) {
          case DataInsightChartType.TotalEntitiesByType:
            value = data.entityCount;

            break;
          case DataInsightChartType.PercentageOfEntitiesWithDescriptionByType:
          case DataInsightChartType.PercentageOfServicesWithDescription:
            value = (data.completedDescriptionFraction ?? 0) * 100;

            break;
          case DataInsightChartType.PercentageOfEntitiesWithOwnerByType:
          case DataInsightChartType.PercentageOfServicesWithOwner:
            value = (data.hasOwnerFraction ?? 0) * 100;

            break;

          case DataInsightChartType.PageViewsByEntities:
            value = data.pageViews;

            break;

          default:
            break;
        }

        return {
          timestamp: timestamp,
          timestampValue: data.timestamp,
          [data.entityType ?? data.serviceName ?? '']: value,
        };
      }

      return;
    })
    .filter(Boolean);

  return { filteredData, entities, timestamps };
};

/**
 *
 * @param rawData raw chart data
 * @param dataInsightChartType chart type
 * @returns required graph data by entity type
 */
export const getGraphDataByEntityType = (
  rawData: DataInsightChartResult['data'] = [],
  dataInsightChartType: DataInsightChartType
) => {
  const isPercentageGraph = checkIsPercentageGraph(dataInsightChartType);

  const { filteredData, entities, timestamps } = getGraphFilteredData(
    rawData,
    dataInsightChartType
  );

  const graphData = prepareGraphData(timestamps, filteredData);
  const latestData = last(graphData) as Record<string, number>;
  const oldData = first(graphData);
  const latestPercentage = toNumber(
    isPercentageGraph
      ? getLatestPercentage(rawData, dataInsightChartType)
      : getLatestCount(latestData)
  );
  const oldestPercentage = toNumber(
    isPercentageGraph
      ? getOldestPercentage(rawData, dataInsightChartType)
      : getLatestCount(oldData)
  );

  const relativePercentage = latestPercentage - oldestPercentage;

  return {
    data: graphData,
    entities,
    total: isPercentageGraph
      ? getLatestPercentage(rawData, dataInsightChartType)
      : getLatestCount(latestData),
    relativePercentage: isPercentageGraph
      ? relativePercentage
      : (relativePercentage / oldestPercentage) * 100,
    latestData,
    isPercentageGraph,
  };
};

/**
 *
 * @param rawData raw chart data
 * @returns required graph data by tier type
 */
export const getGraphDataByTierType = (rawData: TotalEntitiesByTier[]) => {
  const tiers: string[] = [];
  const timestamps: string[] = [];

  const filteredData = rawData.map((data) => {
    if (data.timestamp && data.entityTier) {
      const tiering = data.entityTier;
      const timestamp = customFormatDateTime(data.timestamp, 'MMM dd');
      if (!tiers.includes(tiering)) {
        tiers.push(tiering);
      }

      if (!timestamps.includes(timestamp)) {
        timestamps.push(timestamp);
      }

      return {
        timestampValue: data.timestamp,
        timestamp: timestamp,
        [tiering]: ((data?.entityCountFraction || 0) * 100).toFixed(2),
      };
    }

    return;
  });

  const graphData = prepareGraphData(timestamps, filteredData);
  const latestData = getLatestCount(omit(last(graphData), 'NoTier'));
  const oldestData = getLatestCount(omit(first(graphData), 'NoTier'));
  const relativePercentage = latestData - oldestData;

  return {
    data: graphData,
    tiers,
    total: round(latestData, 2),
    relativePercentage,
    latestData: last(graphData) as Record<string, number>,
  };
};

export const getTeamFilter = (
  suggestionValues: ListItem[]
): SearchDropdownOption[] => {
  return suggestionValues.map((suggestion) => ({
    key: suggestion.value,
    label: suggestion.value,
  }));
};

export const getFormattedActiveUsersData = (
  activeUsers: DailyActiveUsers[]
) => {
  const formattedData = activeUsers.map((user) => ({
    ...user,
    timestampValue: user.timestamp,
    timestamp: customFormatDateTime(user.timestamp, 'MMM dd'),
  }));

  const latestCount = Number(last(formattedData)?.activeUsers);
  const oldestCount = Number(first(formattedData)?.activeUsers);

  const relativePercentage = ((latestCount - oldestCount) / oldestCount) * 100;

  return {
    data: formattedData,
    total: latestCount,
    relativePercentage,
  };
};

export const getEntitiesChartSummary = (
  chartResults: (DataInsightChartResult | undefined)[]
) => {
  const updatedSummaryList = ENTITIES_SUMMARY_LIST.map((summary) => {
    // grab the current chart type
    const chartData = chartResults.find(
      (chart) => chart?.chartType === summary.id
    );

    // return default summary if chart data is undefined else calculate the latest count for chartType
    if (isUndefined(chartData)) {
      return summary;
    } else {
      if (chartData.chartType === DataInsightChartType.TotalEntitiesByTier) {
        const { total } = getGraphDataByTierType(chartData.data ?? []);

        return { ...summary, latest: total };
      } else {
        const { total } = getGraphDataByEntityType(
          chartData.data ?? [],
          chartData.chartType
        );

        return { ...summary, latest: total };
      }
    }
  });

  return updatedSummaryList;
};

export const getWebChartSummary = (
  chartResults: (DataInsightChartResult | undefined)[]
) => {
  const updatedSummary = [];

  for (const summary of WEB_SUMMARY_LIST) {
    // grab the current chart type
    const chartData = chartResults.find(
      (chart) => chart?.chartType === summary.id
    );
    // return default summary if chart data is undefined else calculate the latest count for chartType
    if (isUndefined(chartData)) {
      updatedSummary.push(summary);

      continue;
    }

    const { chartType, data } = chartData;

    updatedSummary.push({
      ...summary,
      latest: sumBy(
        data,
        chartType === DataInsightChartType.DailyActiveUsers
          ? 'activeUsers'
          : 'pageViews'
      ),
    });
  }

  return updatedSummary;
};

export const getKpiGraphData = (kpiResults: KpiResult[], kpiList: Kpi[]) => {
  const kpis: string[] = [];
  const timeStamps: string[] = [];

  const formattedData = kpiResults.map((kpiResult) => {
    const timestamp = customFormatDateTime(kpiResult.timestamp, 'MMM dd');
    const kpiFqn = kpiResult.kpiFqn ?? '';
    const currentKpi = kpiList.find((kpi) => kpi.fullyQualifiedName === kpiFqn);
    const kpiTarget = kpiResult.targetResult[0];
    const kpiValue = toNumber(kpiTarget.value);
    if (!timeStamps.includes(timestamp)) {
      timeStamps.push(timestamp);
    }
    if (!kpis.includes(kpiFqn)) {
      kpis.push(kpiFqn);
    }

    return {
      timestampValue: kpiResult.timestamp,
      timestamp,
      [kpiFqn]:
        currentKpi?.metricType === KpiTargetType.Percentage
          ? kpiValue * 100
          : kpiValue,
    };
  });

  return { graphData: prepareGraphData(timeStamps, formattedData), kpis };
};

export const getDisabledDates: RangePickerProps['disabledDate'] = (current) => {
  // Can not select days before today

  return current && current.isBefore(moment().subtract(1, 'day'));
};

export const getKpiTargetValueByMetricType = (
  metricType: KpiTargetType,
  metricValue: number
) => {
  if (metricType === KpiTargetType.Percentage) {
    return metricValue / 100;
  }

  return metricValue;
};

export const getKpiResultFeedback = (day: number, isTargetMet: boolean) => {
  if (day > 0 && isTargetMet) {
    return t('message.kpi-target-achieved-before-time');
  } else if (day <= 0 && !isTargetMet) {
    return t('message.kpi-target-overdue', {
      count: day,
    });
  } else if (isTargetMet) {
    return t('message.kpi-target-achieved');
  } else {
    return t('label.day-left', { day: pluralize(day, 'day') });
  }
};

export const getDataInsightPathWithFqn = (tab = DataInsightTabs.DATA_ASSETS) =>
  ROUTES.DATA_INSIGHT_WITH_TAB.replace(PLACEHOLDER_ROUTE_TAB, tab);

export const getOptionalDataInsightTabFlag = (tab: DataInsightTabs) => {
  return {
    showDataInsightSummary:
      tab === DataInsightTabs.APP_ANALYTICS ||
      tab === DataInsightTabs.DATA_ASSETS,
    showKpiChart:
      tab === DataInsightTabs.KPIS || tab === DataInsightTabs.DATA_ASSETS,
  };
};

export const sortEntityByValue = (
  entities: string[],
  latestData: Record<string, number>
) => {
  const entityValues = entities.map((entity) => ({
    entity,
    value: latestData[entity] ?? 0,
  }));

  // Sort the entities based on their values in descending order
  entityValues.sort((a, b) => b.value - a.value);

  // Extract the sorted entities without their values
  return entityValues.map((entity) => entity.entity);
};

export const getRandomHexColor = () => {
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);

  return `#${randomColor}`;
};
