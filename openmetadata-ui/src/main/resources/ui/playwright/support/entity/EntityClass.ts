/*
 *  Copyright 2024 Collate.
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
import { APIRequestContext, Page } from '@playwright/test';
import { CustomPropertySupportedEntityList } from '../../constant/customProperty';
import {
  CustomProperty,
  createCustomPropertyForEntity,
  setValueForProperty,
  validateValueForProperty,
} from '../../utils/customProperty';
import { assignDomain, removeDomain, updateDomain } from '../../utils/domain';
import {
  addOwner,
  assignGlossaryTerm,
  assignTag,
  assignTier,
  createAnnouncement,
  createInactiveAnnouncement,
  deleteAnnouncement,
  downVote,
  followEntity,
  hardDeleteEntity,
  removeGlossaryTerm,
  removeOwner,
  removeTag,
  removeTier,
  replyAnnouncement,
  softDeleteEntity,
  unFollowEntity,
  upVote,
  updateDescription,
  updateDisplayNameForEntity,
  updateOwner,
  validateFollowedEntityToWidget,
} from '../../utils/entity';
import { Domain } from '../domain/Domain';
import { GlossaryTerm } from '../glossary/GlossaryTerm';
import { ENTITY_PATH, EntityTypeEndpoint } from './Entity.interface';

export class EntityClass {
  type: string;
  endpoint: EntityTypeEndpoint;
  cleanupUser: (apiContext: APIRequestContext) => Promise<void>;

  customPropertyValue: Record<
    string,
    { value: string; newValue: string; property: CustomProperty }
  >;

  constructor(endpoint: EntityTypeEndpoint) {
    this.endpoint = endpoint;
  }

  public getType() {
    return this.type;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async visitEntityPage(_: Page) {
    // Override for entity visit
  }

  async prepareCustomProperty(apiContext: APIRequestContext) {
    // Create custom property only for supported entities
    if (CustomPropertySupportedEntityList.includes(this.endpoint)) {
      const data = await createCustomPropertyForEntity(
        apiContext,
        this.endpoint
      );

      this.customPropertyValue = data.customProperties;
      this.cleanupUser = data.cleanupUser;
    }
  }

  async cleanupCustomProperty(apiContext: APIRequestContext) {
    // Delete custom property only for supported entities
    if (CustomPropertySupportedEntityList.includes(this.endpoint)) {
      await this.cleanupUser(apiContext);
      const entitySchemaResponse = await apiContext.get(
        `/api/v1/metadata/types/name/${ENTITY_PATH[this.endpoint]}`
      );
      const entitySchema = await entitySchemaResponse.json();
      await apiContext.patch(`/api/v1/metadata/types/${entitySchema.id}`, {
        data: [
          {
            op: 'remove',
            path: '/customProperties',
          },
        ],
        headers: {
          'Content-Type': 'application/json-patch+json',
        },
      });
    }
  }

  async domain(
    page: Page,
    domain1: Domain['responseData'],
    domain2: Domain['responseData']
  ) {
    await assignDomain(page, domain1);
    await updateDomain(page, domain2);
    await removeDomain(page);
  }

  async owner(
    page: Page,
    owner1: string,
    owner2: string,
    type: 'Teams' | 'Users' = 'Users'
  ) {
    await addOwner(page, owner1, type, this.endpoint, 'data-assets-header');
    await updateOwner(page, owner2, type, this.endpoint, 'data-assets-header');
    await removeOwner(page, this.endpoint, 'data-assets-header');
  }

  async tier(page: Page, tier1: string, tier2: string) {
    await assignTier(page, tier1);
    await assignTier(page, tier2);
    await removeTier(page);
  }

  async descriptionUpdate(page: Page) {
    const description =
      // eslint-disable-next-line max-len
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus varius quam eu mi ullamcorper, in porttitor magna mollis. Duis a tellus aliquet nunc commodo bibendum. Donec euismod maximus porttitor. Aenean quis lacus ultrices, tincidunt erat ac, dapibus felis.';

    await updateDescription(page, description);
  }

  async tag(page: Page, tag1: string, tag2: string) {
    await assignTag(page, tag1);
    await assignTag(page, tag2, 'Edit');
    await removeTag(page, [tag1, tag2]);

    await page
      .getByTestId('entity-right-panel')
      .getByTestId('tags-container')
      .getByTestId('Add')
      .isVisible();
  }

  async glossaryTerm(
    page: Page,
    glossaryTerm1: GlossaryTerm['responseData'],
    glossaryTerm2: GlossaryTerm['responseData']
  ) {
    await assignGlossaryTerm(page, glossaryTerm1);
    await assignGlossaryTerm(page, glossaryTerm2, 'Edit');
    await removeGlossaryTerm(page, [glossaryTerm1, glossaryTerm2]);

    await page
      .getByTestId('entity-right-panel')
      .getByTestId('glossary-container')
      .getByTestId('Add')
      .isVisible();
  }

  async upVote(page: Page) {
    await upVote(page, this.endpoint);
  }

  async downVote(page: Page) {
    await downVote(page, this.endpoint);
  }

  async followUnfollowEntity(page: Page, entity: string) {
    await followEntity(page, this.endpoint);
    await validateFollowedEntityToWidget(page, entity, true);
    await this.visitEntityPage(page);
    await unFollowEntity(page, this.endpoint);
    await validateFollowedEntityToWidget(page, entity, false);
  }

  async announcement(page: Page, entityFqn: string) {
    await createAnnouncement(page, entityFqn, {
      title: 'Playwright Test Announcement',
      description: 'Playwright Test Announcement Description',
    });
    await replyAnnouncement(page);
    await deleteAnnouncement(page);
  }

  async inactiveAnnouncement(page: Page) {
    await createInactiveAnnouncement(page, {
      title: 'Inactive Playwright announcement',
      description: 'Inactive Playwright announcement description',
    });
    await deleteAnnouncement(page);
  }

  async renameEntity(page: Page, entityName: string) {
    await updateDisplayNameForEntity(
      page,
      `Cypress ${entityName} updated`,
      this.endpoint
    );
  }

  async softDeleteEntity(page: Page, entityName: string, displayName?: string) {
    await softDeleteEntity(
      page,
      entityName,
      this.endpoint,
      displayName ?? entityName
    );
  }

  async hardDeleteEntity(page: Page, entityName: string, displayName?: string) {
    await hardDeleteEntity(page, displayName ?? entityName, this.endpoint);
  }

  async setCustomProperty(
    page: Page,
    propertydetails: CustomProperty,
    value: string
  ) {
    await setValueForProperty({
      page,
      propertyName: propertydetails.name,
      value,
      propertyType: propertydetails.propertyType.name,
      endpoint: this.endpoint,
    });
    await validateValueForProperty({
      page,
      propertyName: propertydetails.name,
      value,
      propertyType: propertydetails.propertyType.name,
    });
  }

  async updateCustomProperty(
    page: Page,
    propertydetails: CustomProperty,
    value: string
  ) {
    await setValueForProperty({
      page,
      propertyName: propertydetails.name,
      value,
      propertyType: propertydetails.propertyType.name,
      endpoint: this.endpoint,
    });
    await validateValueForProperty({
      page,
      propertyName: propertydetails.name,
      value,
      propertyType: propertydetails.propertyType.name,
    });
  }
}
