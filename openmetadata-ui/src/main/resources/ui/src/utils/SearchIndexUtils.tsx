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

import { uniqueId } from 'lodash';
import { TabSpecificField } from '../enums/entity.enum';
import { SearchIndexField } from '../generated/entity/data/searchIndex';
import { sortTagsCaseInsensitive } from './CommonUtils';

// eslint-disable-next-line max-len
export const defaultFields = `${TabSpecificField.FIELDS},${TabSpecificField.FOLLOWERS},${TabSpecificField.TAGS},${TabSpecificField.OWNER},${TabSpecificField.DOMAIN},${TabSpecificField.VOTES},${TabSpecificField.DATA_PRODUCTS},${TabSpecificField.EXTENSION}`;

export const makeRow = (column: SearchIndexField) => {
  return {
    description: column.description ?? '',
    // Sorting tags as the response of PATCH request does not return the sorted order
    // of tags, but is stored in sorted manner in the database
    // which leads to wrong PATCH payload sent after further tags removal
    tags: sortTagsCaseInsensitive(column.tags ?? []),
    key: column?.name,
    ...column,
  };
};

export const makeData = (
  columns: SearchIndexField[] = []
): Array<SearchIndexField & { id: string }> => {
  return columns.map((column) => ({
    ...makeRow(column),
    id: uniqueId(column.name),
    children: column.children ? makeData(column.children) : undefined,
  }));
};
