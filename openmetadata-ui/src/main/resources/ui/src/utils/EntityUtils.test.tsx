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
import { getEntityDetailsPath } from '../constants/constants';
import { EntityTabs, EntityType } from '../enums/entity.enum';
import { TestSuite } from '../generated/tests/testCase';
import {
  columnSorter,
  getBreadcrumbForTestSuite,
  getEntityLinkFromType,
  highlightEntityNameAndDescription,
} from './EntityUtils';
import {
  entityWithoutNameAndDescHighlight,
  highlightedEntityDescription,
  highlightedEntityDisplayName,
  mockHighlights,
} from './mocks/EntityUtils.mock';

jest.mock('../constants/constants', () => ({
  getEntityDetailsPath: jest.fn(),
}));

jest.mock('./RouterUtils', () => ({
  getDataQualityPagePath: jest.fn(),
}));

describe('EntityUtils unit tests', () => {
  describe('highlightEntityNameAndDescription method', () => {
    it('highlightEntityNameAndDescription method should return the entity with highlighted name and description', () => {
      const highlightedEntity = highlightEntityNameAndDescription(
        entityWithoutNameAndDescHighlight,
        mockHighlights
      );

      expect(highlightedEntity.displayName).toBe(highlightedEntityDisplayName);
      expect(highlightedEntity.description).toBe(highlightedEntityDescription);
    });
  });

  describe('columnSorter method', () => {
    it('columnSorter method should return 1 if the 2nd column should be come before 1st column', () => {
      const result = columnSorter({ name: 'name2' }, { name: 'name1' });

      expect(result).toBe(1);
    });

    it('columnSorter method should return -1 if the 1st column should be come before 2nd column', () => {
      const result = columnSorter({ name: 'name1' }, { name: 'name2' });

      expect(result).toBe(-1);
    });
  });

  describe('getEntityLinkFromType', () => {
    it('should trigger case for entity type TestSuite', () => {
      const fqn = 'test/testSuite';

      getEntityLinkFromType(fqn, EntityType.TEST_SUITE);

      expect(getEntityDetailsPath).toHaveBeenCalledWith(
        EntityType.TABLE,
        fqn,
        EntityTabs.PROFILER
      );
    });
  });

  describe('getBreadcrumbForTestSuite', () => {
    const testSuiteData: TestSuite = {
      name: 'testSuite',
      executableEntityReference: {
        fullyQualifiedName: 'test/testSuite',
        id: '123',
        type: 'testType',
      },
    };

    it('should get breadcrumb if data is executable', () => {
      const result = getBreadcrumbForTestSuite({
        ...testSuiteData,
        executable: true,
      });

      expect(result).toEqual([
        { name: '', url: undefined },
        { name: 'label.test-suite', url: '' },
      ]);
    });

    it('should get breadcrumb if data is not executable', () => {
      const result = getBreadcrumbForTestSuite(testSuiteData);

      expect(result).toEqual([
        { name: 'label.test-suite-plural', url: undefined },
        { name: 'testSuite', url: '' },
      ]);
    });
  });
});
