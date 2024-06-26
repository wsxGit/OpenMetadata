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

import { QueryFilterFieldsEnum } from '../../enums/Explore.enum';
import { QueryFilterInterface } from '../../pages/ExplorePage/ExplorePage.interface';
import {
  getCombinedFields,
  getCombinedQueryFilterObject,
  getQueryFiltersArray,
  getQuickFilterWithDeletedFlag,
} from './ExplorePageUtils';
import {
  mockAdvancedSearchQueryFilters,
  mockCombinedMustFieldArray,
  mockCombinedQueryFilterValue,
  mockESQueryFilters,
  mockQueryFilterArray,
} from './mocks/ExplorePageUtils.mock';

describe('ExplorePageUtils test', () => {
  it('Function getCombinedQueryFilterObject should return proper combined filters for two different query filter objects', () => {
    // Both query filter objects have type as Record<string, unknown>
    // Here unknown will not allow us to directly access the properties
    // That is why I first did typecast it into QueryFilterInterface type to access the properties.
    const combinedQueryFilterObject = getCombinedQueryFilterObject(
      mockESQueryFilters as QueryFilterInterface,
      mockAdvancedSearchQueryFilters as QueryFilterInterface
    );

    expect(combinedQueryFilterObject).toEqual(mockCombinedQueryFilterValue);
  });

  it('Function getCombinedFields should return the value in the correct field given in the input', () => {
    const combinedMustFieldArray = getCombinedFields(
      QueryFilterFieldsEnum.MUST,
      [mockESQueryFilters, mockAdvancedSearchQueryFilters]
    );

    expect(combinedMustFieldArray).toEqual(mockCombinedMustFieldArray);
  });

  it('Function getQueryFiltersArray should return the array for non empty input array', () => {
    const queryFilterArray = getQueryFiltersArray(
      QueryFilterFieldsEnum.MUST,
      mockESQueryFilters
    );

    expect(queryFilterArray).toEqual(mockQueryFilterArray);
  });

  it('Function getQueryFiltersArray should return an empty array for undefined or empty array input', () => {
    const queryFilterArrayEmpty = getQueryFiltersArray(
      QueryFilterFieldsEnum.MUST,
      {} as QueryFilterInterface
    );

    expect(queryFilterArrayEmpty).toEqual([]);
  });

  describe('getQuickFilterWithDeletedFlag', () => {
    const defaultQuery = {
      query: {
        bool: {
          must: [
            {
              match: {
                deleted: true,
              },
            },
          ],
        },
      },
    };

    it('returns default query with added deleted match when quickFilter is an empty string', () => {
      const result = getQuickFilterWithDeletedFlag('', true);

      expect(result).toEqual(defaultQuery);
    });

    it('appends deleted match to existing query structure', () => {
      const quickFilter = JSON.stringify({
        query: {
          bool: {
            must: [
              {
                match: {
                  active: true,
                },
              },
            ],
          },
        },
      });
      const result = getQuickFilterWithDeletedFlag(quickFilter, false);

      expect(result).toEqual({
        query: {
          bool: {
            must: [
              {
                match: {
                  active: true,
                },
              },
              {
                match: {
                  deleted: false,
                },
              },
            ],
          },
        },
      });
    });

    it('handles malformed JSON strings gracefully by returning default query', () => {
      const result = getQuickFilterWithDeletedFlag(
        'this is not a json string',
        true
      );

      expect(result).toEqual(defaultQuery);
    });

    it('returns default query when quickFilter JSON lacks a `query.bool.must` structure', () => {
      const quickFilter = JSON.stringify({
        somethingElse: {
          different: true,
        },
      });
      const result = getQuickFilterWithDeletedFlag(quickFilter, true);

      expect(result).toEqual(defaultQuery);
    });

    it('returns modified query when quickFilter is correct and showDeleted is false', () => {
      const quickFilter = JSON.stringify({
        query: {
          bool: {
            must: [
              {
                match: {
                  active: true,
                },
              },
            ],
          },
        },
      });
      const result = getQuickFilterWithDeletedFlag(quickFilter, false);

      expect(result.query.bool.must).toContainEqual({
        match: {
          deleted: false,
        },
      });
    });
  });
});
