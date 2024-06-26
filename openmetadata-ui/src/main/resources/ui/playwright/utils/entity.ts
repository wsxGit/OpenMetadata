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
import { expect, Page } from '@playwright/test';
import { lowerCase } from 'lodash';
import {
  customFormatDateTime,
  getCurrentMillis,
  getEpochMillisForFutureDays,
} from '../../src/utils/date-time/DateTimeUtils';
import {
  ENTITIES_WITHOUT_FOLLOWING_BUTTON,
  LIST_OF_FIELDS_TO_EDIT_NOT_TO_BE_PRESENT,
  LIST_OF_FIELDS_TO_EDIT_TO_BE_DISABLED,
} from '../constant/delete';
import { EntityTypeEndpoint } from '../support/entity/Entity.interface';
import { redirectToHomePage } from './common';

export const visitEntityPage = async (data: {
  page: Page;
  searchTerm: string;
  dataTestId: string;
}) => {
  const { page, searchTerm, dataTestId } = data;
  const waitForSearchResponse = page.waitForResponse(
    '/api/v1/search/query?q=*index=dataAsset*'
  );
  await page.getByTestId('searchBox').fill(searchTerm);
  await waitForSearchResponse;
  await page.getByTestId(dataTestId).getByTestId('data-name').click();
  await page.getByTestId('searchBox').clear();
};

export const addOwner = async (
  page: Page,
  owner: string,
  type: 'Teams' | 'Users' = 'Users',
  endpoint: EntityTypeEndpoint,
  dataTestId?: string
) => {
  await page.getByTestId('edit-owner').click();
  if (type === 'Users') {
    const userListResponse = page.waitForResponse(
      '/api/v1/users?limit=*&isBot=false*'
    );
    await page.getByRole('tab', { name: type }).click();
    await userListResponse;
  }
  await page.waitForSelector('[data-testid="loader"]', { state: 'detached' });

  const ownerSearchBar = await page
    .getByTestId(`owner-select-${lowerCase(type)}-search-bar`)
    .isVisible();

  if (!ownerSearchBar) {
    await page.getByRole('tab', { name: type }).click();
  }

  await page
    .getByTestId(`owner-select-${lowerCase(type)}-search-bar`)
    .fill(owner);
  await page.waitForResponse(
    `/api/v1/search/query?q=*${encodeURIComponent(owner)}*`
  );
  const patchRequest = page.waitForResponse(`/api/v1/${endpoint}/*`);
  await page.getByRole('listitem', { name: owner }).click();
  await patchRequest;

  await expect(page.getByTestId(dataTestId ?? 'owner-link')).toContainText(
    owner
  );
};

export const updateOwner = async (
  page: Page,
  owner: string,
  type: 'Teams' | 'Users' = 'Users',
  endpoint: EntityTypeEndpoint,
  dataTestId?: string
) => {
  await page.getByTestId('edit-owner').click();
  await page.getByRole('tab', { name: type }).click();
  await page.waitForSelector('[data-testid="loader"]', { state: 'detached' });
  await page
    .getByTestId(`owner-select-${lowerCase(type)}-search-bar`)
    .fill(owner);
  await page.waitForResponse(
    `/api/v1/search/query?q=*${encodeURIComponent(owner)}*`
  );

  const patchRequest = page.waitForResponse(`/api/v1/${endpoint}/*`);
  await page.getByRole('listitem', { name: owner }).click();
  await patchRequest;

  await expect(page.getByTestId(dataTestId ?? 'owner-link')).toContainText(
    owner
  );
};

export const removeOwner = async (
  page: Page,
  endpoint: EntityTypeEndpoint,
  dataTestId?: string
) => {
  await page.getByTestId('edit-owner').click();
  await page.waitForSelector('[data-testid="loader"]', { state: 'detached' });

  await expect(page.getByTestId('remove-owner').locator('svg')).toBeVisible();

  const patchRequest = page.waitForResponse(`/api/v1/${endpoint}/*`);
  await page.getByTestId('remove-owner').locator('svg').click();
  await patchRequest;

  await expect(page.getByTestId(dataTestId ?? 'owner-link')).toContainText(
    'No Owner'
  );
};

export const assignTier = async (page: Page, tier: string) => {
  await page.getByTestId('edit-tier').click();
  await page.waitForSelector('[data-testid="loader"]', { state: 'detached' });
  await page.getByTestId(`radio-btn-${tier}`).click();
  await page.getByTestId('Tier').click();

  await expect(page.getByTestId('Tier')).toContainText(tier);
};

export const removeTier = async (page: Page) => {
  await page.getByTestId('edit-tier').click();
  await page.waitForSelector('[data-testid="loader"]', { state: 'detached' });
  await page.getByTestId('clear-tier').click();
  await page.getByTestId('Tier').click();

  await expect(page.getByTestId('Tier')).toContainText('No Tier');
};

export const updateDescription = async (page: Page, description: string) => {
  await page.getByTestId('edit-description').click();
  await page.locator('.ProseMirror').first().click();
  await page.locator('.ProseMirror').first().clear();
  await page.locator('.ProseMirror').first().fill(description);
  await page.getByTestId('save').click();

  await expect(
    page.getByTestId('asset-description-container').getByRole('paragraph')
  ).toContainText(description);
};

export const assignTag = async (
  page: Page,
  tag: string,
  action: 'Add' | 'Edit' = 'Add'
) => {
  await page
    .getByTestId('entity-right-panel')
    .getByTestId('tags-container')
    .getByTestId(action === 'Add' ? 'add-tag' : 'edit-button')
    .click();

  await page.locator('#tagsForm_tags').fill(tag);
  await page.waitForResponse(
    `/api/v1/search/query?q=*${encodeURIComponent(tag)}*`
  );
  await page.getByTestId(`tag-${tag}`).click();

  await expect(page.getByTestId('saveAssociatedTag')).toBeEnabled();

  await page.getByTestId('saveAssociatedTag').click();

  await expect(
    page
      .getByTestId('entity-right-panel')
      .getByTestId('tags-container')
      .getByTestId(`tag-${tag}`)
  ).toBeVisible();
};

export const removeTag = async (page: Page, tags: string[]) => {
  for (const tag of tags) {
    await page
      .getByTestId('entity-right-panel')
      .getByTestId('tags-container')
      .getByTestId('edit-button')
      .click();

    await page
      .getByTestId(`selected-tag-${tag}`)
      .getByTestId('remove-tags')
      .locator('svg')
      .click();

    const patchRequest = page.waitForRequest(
      (request) => request.method() === 'PATCH'
    );

    await expect(page.getByTestId('saveAssociatedTag')).toBeEnabled();

    await page.getByTestId('saveAssociatedTag').click();
    await patchRequest;

    expect(
      page
        .getByTestId('entity-right-panel')
        .getByTestId('tags-container')
        .getByTestId(`tag-${tag}`)
    ).not.toBeVisible();
  }
};

type GlossaryTermOption = {
  displayName: string;
  name: string;
  fullyQualifiedName: string;
};

export const assignGlossaryTerm = async (
  page: Page,
  glossaryTerm: GlossaryTermOption,
  action: 'Add' | 'Edit' = 'Add'
) => {
  await page
    .getByTestId('entity-right-panel')
    .getByTestId('glossary-container')
    .getByTestId(action === 'Add' ? 'add-tag' : 'edit-button')
    .click();

  await page.locator('#tagsForm_tags').fill(glossaryTerm.displayName);
  await page.waitForResponse(
    `/api/v1/search/query?q=*${encodeURIComponent(glossaryTerm.displayName)}*`
  );
  await page.getByTestId(`tag-${glossaryTerm.fullyQualifiedName}`).click();

  await expect(page.getByTestId('saveAssociatedTag')).toBeEnabled();

  await page.getByTestId('saveAssociatedTag').click();

  await expect(
    page
      .getByTestId('entity-right-panel')
      .getByTestId('glossary-container')
      .getByTestId(`tag-${glossaryTerm.fullyQualifiedName}`)
  ).toBeVisible();
};

export const removeGlossaryTerm = async (
  page: Page,
  glossaryTerms: GlossaryTermOption[]
) => {
  for (const tag of glossaryTerms) {
    await page
      .getByTestId('entity-right-panel')
      .getByTestId('glossary-container')
      .getByTestId('edit-button')
      .click();

    await page
      .getByTestId('glossary-container')
      .getByTestId(new RegExp(tag.name))
      .getByTestId('remove-tags')
      .locator('svg')
      .click();

    const patchRequest = page.waitForRequest(
      (request) => request.method() === 'PATCH'
    );

    await expect(page.getByTestId('saveAssociatedTag')).toBeEnabled();

    await page.getByTestId('saveAssociatedTag').click();
    await patchRequest;

    expect(
      page
        .getByTestId('entity-right-panel')
        .getByTestId('glossary-container')
        .getByTestId(`tag-${tag.fullyQualifiedName}`)
    ).not.toBeVisible();
  }
};

export const upVote = async (page: Page, endPoint: string) => {
  await page.getByTestId('up-vote-btn').click();
  await page.waitForResponse(`/api/v1/${endPoint}/*/vote`);

  await expect(page.getByTestId('up-vote-count')).toContainText('1');
};

export const downVote = async (page: Page, endPoint: string) => {
  await page.getByTestId('down-vote-btn').click();
  await page.waitForResponse(`/api/v1/${endPoint}/*/vote`);

  await expect(page.getByTestId('down-vote-count')).toContainText('1');
};

export const followEntity = async (
  page: Page,
  endpoint: EntityTypeEndpoint
) => {
  const followResponse = page.waitForResponse(
    `/api/v1/${endpoint}/*/followers`
  );
  await page.getByTestId('entity-follow-button').click();
  await followResponse;

  await expect(page.getByTestId('entity-follow-button')).toContainText('1');
};

export const unFollowEntity = async (
  page: Page,
  endpoint: EntityTypeEndpoint
) => {
  const unFollowResponse = page.waitForResponse(
    `/api/v1/${endpoint}/*/followers/*`
  );
  await page.getByTestId('entity-follow-button').click();
  await unFollowResponse;

  await expect(page.getByTestId('entity-follow-button')).toContainText('0');
};

export const validateFollowedEntityToWidget = async (
  page: Page,
  entity: string,
  isFollowing: boolean
) => {
  await redirectToHomePage(page);

  if (isFollowing) {
    await page.getByTestId('following-widget').isVisible();

    await page.getByTestId(`following-${entity}`).isVisible();
  } else {
    await page.getByTestId('following-widget').isVisible();

    await expect(page.getByTestId(`following-${entity}`)).not.toBeVisible();
  }
};

const announcementForm = async (
  page: Page,
  data: {
    title: string;
    startDate: string;
    endDate: string;
    description: string;
  }
) => {
  await page.fill('#title', data.title);

  await page.click('#startTime');
  await page.fill('#startTime', `${data.startDate}`);
  await page.press('#startTime', 'Enter');

  await page.click('#endTime');
  await page.fill('#endTime', `${data.endDate}`);
  await page.press('#startTime', 'Enter');

  await page.fill(
    '.toastui-editor-md-container > .toastui-editor > .ProseMirror',
    data.description
  );

  await page.locator('#announcement-submit').scrollIntoViewIfNeeded();
  await page.click('#announcement-submit');
  await page.waitForResponse('/api/v1/feed?entityLink=*type=Announcement*');
  await page.click('.Toastify__close-button');
};

export const createAnnouncement = async (
  page: Page,
  entityFqn: string,
  data: { title: string; description: string }
) => {
  await page.getByTestId('manage-button').click();
  await page.getByTestId('announcement-button').click();
  const startDate = customFormatDateTime(getCurrentMillis(), 'yyyy-MM-dd');
  const endDate = customFormatDateTime(
    getEpochMillisForFutureDays(5),
    'yyyy-MM-dd'
  );

  await expect(page.getByTestId('announcement-error')).toContainText(
    'No Announcements, Click on add announcement to add one.'
  );

  await page.getByTestId('add-announcement').click();

  await expect(page.locator('.ant-modal-header')).toContainText(
    'Make an announcement'
  );

  await announcementForm(page, { ...data, startDate, endDate });

  await page.reload();
  await page.getByTestId('announcement-card').isVisible();

  await expect(page.getByTestId('announcement-card')).toContainText(data.title);

  // TODO: Review redirection flow for announcement @Ashish8689
  // await redirectToHomePage(page);

  // await page
  //   .getByTestId('announcement-container')
  //   .getByTestId(`announcement-${entityFqn}`)
  //   .locator(`[data-testid="entity-link"] span`)
  //   .first()
  //   .scrollIntoViewIfNeeded();

  // await page
  //   .getByTestId('announcement-container')
  //   .getByTestId(`announcement-${entityFqn}`)
  //   .locator(`[data-testid="entity-link"] span`)
  //   .first()
  //   .click();

  // await page.getByTestId('announcement-card').isVisible();

  // await expect(page.getByTestId('announcement-card')).toContainText(data.title);
};

export const replyAnnouncement = async (page: Page) => {
  await page.click('[data-testid="announcement-card"]');

  await page.hover(
    '[data-testid="announcement-card"] [data-testid="main-message"]'
  );

  await page.waitForSelector('.ant-popover', { state: 'visible' });

  await expect(page.getByTestId('add-reply').locator('svg')).toBeVisible();

  await page.getByTestId('add-reply').locator('svg').click();

  await expect(page.locator('.ql-editor')).toBeVisible();

  const sendButtonIsDisabled = await page
    .locator('[data-testid="send-button"]')
    .isEnabled();

  expect(sendButtonIsDisabled).toBe(false);

  await page.fill('[data-testid="editor-wrapper"] .ql-editor', 'Reply message');
  await page.click('[data-testid="send-button"]');

  await expect(
    page.locator('[data-testid="replies"] [data-testid="viewer-container"]')
  ).toHaveText('Reply message');
  await expect(page.locator('[data-testid="show-reply-thread"]')).toHaveText(
    '1 replies'
  );

  // Edit the reply message
  await page.hover('[data-testid="replies"] > [data-testid="main-message"]');
  await page.waitForSelector('.ant-popover', { state: 'visible' });
  await page.click('[data-testid="edit-message"]');

  await page.fill(
    '[data-testid="editor-wrapper"] .ql-editor',
    'Reply message edited'
  );

  await page.click('[data-testid="save-button"]');

  await expect(
    page.locator('[data-testid="replies"] [data-testid="viewer-container"]')
  ).toHaveText('Reply message edited');

  await page.reload();
};

export const deleteAnnouncement = async (page: Page) => {
  await page.getByTestId('manage-button').click();
  await page.getByTestId('announcement-button').click();

  await page.hover(
    '[data-testid="announcement-card"] [data-testid="main-message"]'
  );

  await page.waitForSelector('.ant-popover', { state: 'visible' });

  await page.click('[data-testid="delete-message"]');
  const modalText = await page.textContent('.ant-modal-body');

  expect(modalText).toContain(
    'Are you sure you want to permanently delete this message?'
  );

  const getFeed = page.waitForResponse('/api/v1/feed/*');
  await page.click('[data-testid="save-button"]');
  await getFeed;
};

export const createInactiveAnnouncement = async (
  page: Page,
  data: { title: string; description: string }
) => {
  await page.getByTestId('manage-button').click();
  await page.getByTestId('announcement-button').click();
  const startDate = customFormatDateTime(
    getEpochMillisForFutureDays(6),
    'yyyy-MM-dd'
  );
  const endDate = customFormatDateTime(
    getEpochMillisForFutureDays(11),
    'yyyy-MM-dd'
  );

  await page.getByTestId('add-announcement').click();

  await expect(page.locator('.ant-modal-header')).toContainText(
    'Make an announcement'
  );

  await announcementForm(page, { ...data, startDate, endDate });
  await page.getByTestId('inActive-announcements').isVisible();
  await page.reload();
};

export const updateDisplayNameForEntity = async (
  page: Page,
  displayName: string,
  endPoint: string
) => {
  await page.click('[data-testid="manage-button"]');
  await page.click('[data-testid="rename-button"]');

  const nameInputIsDisabled = await page.locator('#name').isEnabled();

  expect(nameInputIsDisabled).toBe(false);

  await expect(page.locator('#displayName')).toBeVisible();

  await page.locator('#displayName').clear();

  await page.fill('#displayName', displayName);
  const updateNameResponse = page.waitForResponse(`/api/v1/${endPoint}/*`);
  await page.click('[data-testid="save-button"]');
  await updateNameResponse;

  await expect(
    page.locator('[data-testid="entity-header-display-name"]')
  ).toHaveText(displayName);
};

export const checkForEditActions = async ({ entityType, deleted, page }) => {
  for (const {
    containerSelector,
    elementSelector,
  } of LIST_OF_FIELDS_TO_EDIT_TO_BE_DISABLED) {
    if (
      elementSelector === '[data-testid="entity-follow-button"]' &&
      ENTITIES_WITHOUT_FOLLOWING_BUTTON.includes(entityType)
    ) {
      continue;
    }

    if (entityType.startsWith('services/')) {
      continue;
    }

    const isDisabled = await page
      .locator(`${containerSelector} ${elementSelector}`)
      .isEnabled();

    expect(isDisabled).toBe(!deleted);
  }

  for (const {
    containerSelector,
    elementSelector,
  } of LIST_OF_FIELDS_TO_EDIT_NOT_TO_BE_PRESENT) {
    if (!deleted) {
      await expect(
        page.locator(`${containerSelector} ${elementSelector}`)
      ).toBeVisible();
    } else {
      const exists = await page
        .locator(`${containerSelector} ${elementSelector}`)
        .isVisible();

      expect(exists).toBe(false);
    }
  }
};

export const checkLineageTabActions = async (page: Page, deleted?: boolean) => {
  // Click the lineage tab
  const lineageApi = page.waitForResponse('/api/v1/lineage/getLineage?fqn=*');
  await page.click('[data-testid="lineage"]');

  // Ensure the response has been received and check the status code
  await lineageApi;

  // Check the presence or absence of the edit-lineage element based on the deleted flag
  if (deleted) {
    await expect(
      page.locator('[data-testid="edit-lineage"]')
    ).not.toBeVisible();
  } else {
    await expect(page.locator('[data-testid="edit-lineage"]')).toBeVisible();
  }
};

export const checkForTableSpecificFields = async (
  page: Page,
  deleted?: boolean
) => {
  const queryDataUrl = `/api/v1/search/query?q=*index=query_search_index*`;

  const queryApi = page.waitForResponse(queryDataUrl);
  // Click the table queries tab
  await page.click('[data-testid="table_queries"]');

  if (!deleted) {
    await queryApi;
    // Check if the add-query button is enabled
    const addQueryButton = page.locator('[data-testid="add-query-btn"]');

    await expect(addQueryButton).toBeEnabled();
  } else {
    // Check for the no data placeholder message
    const noDataPlaceholder = page
      .getByTestId('no-queries')
      .getByTestId('no-data-placeholder');

    await expect(noDataPlaceholder).toContainText(
      'Queries data is not available for deleted entities.'
    );
  }

  // Click the profiler tab
  await page.click('[data-testid="profiler"]');

  // Check the visibility of profiler buttons based on the deleted flag
  const addTableTestButton = page.locator(
    '[data-testid="profiler-add-table-test-btn"]'
  );
  const settingButton = page.locator('[data-testid="profiler-setting-btn"]');

  if (!deleted) {
    await expect(addTableTestButton).toBeVisible();
    await expect(settingButton).toBeVisible();
  } else {
    await expect(addTableTestButton).not.toBeVisible();
    await expect(settingButton).not.toBeVisible();
  }
};

export const deletedEntityCommonChecks = async ({
  page,
  endPoint,
  deleted,
}: {
  page: Page;
  endPoint: EntityTypeEndpoint;
  deleted?: boolean;
}) => {
  const isTableEntity = endPoint === EntityTypeEndpoint.Table;

  // Go to first tab before starts validating
  await page.click('.ant-tabs-tab:nth-child(1)');

  // Check if all the edit actions are available for the entity
  await checkForEditActions({
    page,
    entityType: endPoint,
    deleted,
  });

  if (isTableEntity) {
    await checkLineageTabActions(page, deleted);
  }

  if (isTableEntity) {
    await checkForTableSpecificFields(page, deleted);
  }

  await page.click('[data-testid="manage-button"]');

  if (deleted) {
    // only two menu options (restore and delete) should be present
    await expect(
      page.locator(
        '[data-testid="manage-dropdown-list-container"] [data-testid="announcement-button"]'
      )
    ).toBeHidden();
    await expect(
      page.locator(
        '[data-testid="manage-dropdown-list-container"] [data-testid="rename-button"]'
      )
    ).toBeHidden();
    await expect(
      page.locator(
        '[data-testid="manage-dropdown-list-container"] [data-testid="profiler-setting-button"]'
      )
    ).toBeHidden();
    await expect(
      page.locator(
        '[data-testid="manage-dropdown-list-container"] [data-testid="restore-button"]'
      )
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-testid="manage-dropdown-list-container"] [data-testid="delete-button"]'
      )
    ).toBeVisible();
  } else {
    await expect(
      page.locator(
        '[data-testid="manage-dropdown-list-container"] [data-testid="announcement-button"]'
      )
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-testid="manage-dropdown-list-container"] [data-testid="rename-button"]'
      )
    ).toBeVisible();

    if (
      [EntityTypeEndpoint.Database, EntityTypeEndpoint.DatabaseSchema].includes(
        endPoint
      )
    ) {
      await expect(
        page.locator(
          '[data-testid="manage-dropdown-list-container"] [data-testid="profiler-setting-button"]'
        )
      ).toBeVisible();
    }

    await expect(
      page.locator(
        '[data-testid="manage-dropdown-list-container"] [data-testid="delete-button"]'
      )
    ).toBeVisible();
  }

  await page.click('body');
};

export const restoreEntity = async (page: Page) => {
  await expect(page.locator('[data-testid="deleted-badge"]')).toBeVisible();

  await page.click('[data-testid="manage-button"]');
  await page.click('[data-testid="restore-button"]');
  await page.click('button:has-text("Restore")');

  await expect(page.locator('.Toastify__toast-body')).toHaveText(
    /restored successfully/
  );

  await page.click('.Toastify__close-button');

  const exists = await page
    .locator('[data-testid="deleted-badge"]')
    .isVisible();

  expect(exists).toBe(false);
};

export const softDeleteEntity = async (
  page: Page,
  entityName: string,
  endPoint: EntityTypeEndpoint,
  displayName: string
) => {
  await deletedEntityCommonChecks({
    page,
    endPoint,
    deleted: false,
  });

  await page.click('body'); // Equivalent to clicking outside

  await page.click('[data-testid="manage-button"]');
  await page.click('[data-testid="delete-button"]');

  await page.waitForSelector('[role="dialog"].ant-modal');

  await expect(page.locator('[role="dialog"].ant-modal')).toBeVisible();
  await expect(page.locator('.ant-modal-title')).toContainText(displayName);

  await page.fill('[data-testid="confirmation-text-input"]', 'DELETE');
  const deleteResponse = page.waitForResponse(
    `/api/v1/${endPoint}/*?hardDelete=false&recursive=true`
  );
  await page.click('[data-testid="confirm-button"]');

  await deleteResponse;

  await expect(page.locator('.Toastify__toast-body')).toHaveText(
    /deleted successfully!/
  );

  await page.click('.Toastify__close-button');

  await page.reload();

  const deletedBadge = await page.locator('[data-testid="deleted-badge"]');

  await expect(deletedBadge).toHaveText('Deleted');

  await deletedEntityCommonChecks({
    page,
    endPoint,
    deleted: true,
  });

  await page.click('body'); // Equivalent to clicking outside

  if (endPoint === EntityTypeEndpoint.Table) {
    await page.click('[data-testid="breadcrumb-link"]:last-child');
    const deletedTableResponse = page.waitForResponse(
      '/api/v1/tables?databaseSchema=*'
    );
    await page.click('[data-testid="show-deleted"]');
    await deletedTableResponse;
    const tableCount = await page.locator(
      '[data-testid="table"] [data-testid="count"]'
    );

    await expect(tableCount).toContainText('1');

    await page.click(`[data-testid="${entityName}"]`);
  }

  await restoreEntity(page);
  await page.reload();

  await deletedEntityCommonChecks({
    page,
    endPoint,
    deleted: false,
  });
};

export const hardDeleteEntity = async (
  page: Page,
  entityName: string,
  endPoint: EntityTypeEndpoint
) => {
  await page.click('[data-testid="manage-button"]');
  await page.click('[data-testid="delete-button"]');

  await expect(page.locator('[role="dialog"].ant-modal')).toBeVisible();

  await expect(
    page.locator('[data-testid="delete-modal"] .ant-modal-title')
  ).toHaveText(new RegExp(entityName));

  await page.click('[data-testid="hard-delete-option"]');
  await page.check('[data-testid="hard-delete"]');
  await page.fill('[data-testid="confirmation-text-input"]', 'DELETE');
  const deleteResponse = page.waitForResponse(
    `/api/v1/${endPoint}/*?hardDelete=true&recursive=true`
  );
  await page.click('[data-testid="confirm-button"]');
  await deleteResponse;

  await expect(page.locator('.Toastify__toast-body')).toHaveText(
    /deleted successfully!/
  );

  await page.click('.Toastify__close-button');
};
