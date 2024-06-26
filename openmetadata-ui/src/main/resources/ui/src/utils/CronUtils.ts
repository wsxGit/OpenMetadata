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

import { isEmpty, toNumber } from 'lodash';
import {
  combinations,
  getDayCron,
  getHourCron,
  getMinuteCron,
  getMonthCron,
  getWeekCron,
  getYearCron,
  SELECTED_PERIOD_OPTIONS,
  toDisplay,
} from '../components/common/CronEditor/CronEditor.constant';
import {
  Combination,
  CronType,
  CronValue,
  SelectedYearOption,
  StateValue,
  ToDisplay,
} from '../components/common/CronEditor/CronEditor.interface';
import { AppType } from '../generated/entity/applications/app';

export const getQuartzCronExpression = (state: StateValue) => {
  const {
    selectedPeriod,
    selectedMinOption,
    selectedHourOption,
    selectedDayOption,
    selectedWeekOption,
    selectedMonthOption,
    selectedYearOption,
  } = state;

  switch (selectedPeriod) {
    case 'minute':
      return `0 0/${selectedMinOption.min} * * * ?`;
    case 'hour':
      return `0 ${selectedHourOption.min} * * * ?`;
    case 'day':
      return `0 ${selectedDayOption.min} ${selectedDayOption.hour} * * ?`;
    case 'week':
      return `0 ${selectedWeekOption.min} ${selectedWeekOption.hour} ? * ${
        // Quartz cron format accepts 1-7 or SUN-SAT so need to increment index by 1
        // Ref: https://www.quartz-scheduler.org/api/2.1.7/org/quartz/CronExpression.html
        selectedWeekOption.dow + 1
      }`;
    case 'month':
      return `0 ${selectedMonthOption.min} ${selectedMonthOption.hour} ${selectedMonthOption.dom} * ?`;
    case 'year':
      return `0 ${selectedYearOption.min} ${selectedYearOption.hour} ${selectedYearOption.dom} ${selectedYearOption.mon} ?`;
    default:
      return null;
  }
};

export const getCron = (state: StateValue) => {
  const {
    selectedPeriod,
    selectedMinOption,
    selectedHourOption,
    selectedDayOption,
    selectedWeekOption,
    selectedMonthOption,
    selectedYearOption,
  } = state;

  switch (selectedPeriod) {
    case 'minute':
      return getMinuteCron(selectedMinOption);
    case 'hour':
      return getHourCron(selectedHourOption);
    case 'day':
      return getDayCron(selectedDayOption);
    case 'week':
      return getWeekCron(selectedWeekOption);
    case 'month':
      return getMonthCron(selectedMonthOption);
    case 'year':
      return getYearCron(selectedYearOption);
    default:
      return null;
  }
};

const getCronType = (cronStr: string) => {
  for (const c in combinations) {
    if (combinations[c as keyof Combination].test(cronStr)) {
      return c;
    }
  }

  return undefined;
};

export const getStateValue = (valueStr: string) => {
  const stateVal: StateValue = {
    selectedPeriod: '',
    selectedMinOption: {
      min: 5,
    },
    selectedHourOption: {
      min: 0,
    },
    selectedDayOption: {
      hour: 0,
      min: 0,
    },
    selectedWeekOption: {
      dow: 1,
      hour: 0,
      min: 0,
    },
    selectedMonthOption: {
      dom: 1,
      hour: 0,
      min: 0,
    },
    selectedYearOption: {
      dom: 1,
      mon: 1,
      hour: 0,
      min: 0,
    },
  };
  const cronType = getCronType(valueStr);

  const d = valueStr ? valueStr.split(' ') : [];
  const v: CronValue = {
    min: d[0],
    hour: d[1],
    dom: d[2],
    mon: d[3],
    dow: d[4],
  };

  stateVal.selectedPeriod = cronType || stateVal.selectedPeriod;

  if (!isEmpty(cronType)) {
    const stateIndex =
      SELECTED_PERIOD_OPTIONS[(cronType as CronType) || 'hour'];
    const selectedPeriodObj = stateVal[
      stateIndex as keyof StateValue
    ] as SelectedYearOption;

    const targets = toDisplay[cronType as keyof ToDisplay];

    for (const element of targets) {
      const tgt = element;

      if (tgt === 'time') {
        selectedPeriodObj.hour = toNumber(v.hour);
        selectedPeriodObj.min = toNumber(v.min);
      } else {
        selectedPeriodObj[tgt as keyof SelectedYearOption] = toNumber(
          v[tgt as keyof CronValue]
        );
      }
    }
  }

  return stateVal;
};

export const getCronInitialValue = (appType: AppType, appName: string) => {
  const value = {
    min: 0,
    hour: 0,
  };

  let initialValue = getHourCron(value);

  if (appName === 'DataInsightsReportApplication') {
    initialValue = getWeekCron({ ...value, dow: 0 });
  } else if (appType === AppType.External) {
    initialValue = getDayCron(value);
  }

  return initialValue;
};
