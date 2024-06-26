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
import { MetricChartType } from '../components/Database/Profiler/ProfilerDashboard/profilerDashboard.interface';
import { ColumnProfile } from '../generated/entity/data/table';

export interface ColumnMetricsInterface {
  countMetrics: MetricChartType;
  proportionMetrics: MetricChartType;
  mathMetrics: MetricChartType;
  sumMetrics: MetricChartType;
  quartileMetrics: MetricChartType;
}
export interface CalculateColumnProfilerMetricsInterface
  extends ColumnMetricsInterface {
  columnProfilerData: ColumnProfile[];
}
