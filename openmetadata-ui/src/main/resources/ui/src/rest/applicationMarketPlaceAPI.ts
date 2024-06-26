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
import { PagingResponse } from 'Models';
import { AppMarketPlaceDefinition } from '../generated/entity/applications/marketplace/appMarketPlaceDefinition';
import { ListParams } from '../interface/API.interface';
import { getEncodedFqn } from '../utils/StringsUtils';
import APIClient from './index';

const BASE_URL = '/apps/marketplace';

export const getMarketPlaceApplicationList = async (params?: ListParams) => {
  const response = await APIClient.get<
    PagingResponse<AppMarketPlaceDefinition[]>
  >(BASE_URL, {
    params,
  });

  return response.data;
};

export const getMarketPlaceApplicationByFqn = async (
  appFqn: string,
  params?: ListParams
) => {
  const url = `/apps/marketplace/name/${getEncodedFqn(appFqn)}`;

  const response = await APIClient.get<AppMarketPlaceDefinition>(url, {
    params,
  });

  return response.data;
};
