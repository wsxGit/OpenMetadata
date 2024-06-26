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
import { EditorState } from '@tiptap/pm/state';
import { Editor } from '@tiptap/react';
import { FQN_SEPARATOR_CHAR } from '../constants/char.constants';

export const getSelectedText = (state: EditorState) => {
  const { from, to } = state.selection;

  const text = state.doc.textBetween(from, to);

  return text;
};

export const isInViewport = (ele: HTMLElement, container: HTMLElement) => {
  const eleTop = ele.offsetTop;
  const eleBottom = eleTop + ele.clientHeight;

  const containerTop = container.scrollTop;
  const containerBottom = containerTop + container.clientHeight;

  // The element is fully visible in the container
  return eleTop >= containerTop && eleBottom <= containerBottom;
};

export type FormatContentFor = 'server' | 'client';

export const formatContent = (
  htmlString: string,
  formatFor: FormatContentFor
) => {
  // Create a new DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Use querySelectorAll to find all anchor tags with text content starting with "@" or "#"
  const anchorTags = doc.querySelectorAll(
    'a[data-type="mention"], a[data-type="hashtag"]'
  );

  if (formatFor === 'server') {
    anchorTags.forEach((tag) => {
      const href = tag.getAttribute('href');
      const text = tag.textContent;
      const fqn = tag.getAttribute('data-fqn');
      const entityType = tag.getAttribute('data-entityType');

      const entityLink = `<#E${FQN_SEPARATOR_CHAR}${entityType}${FQN_SEPARATOR_CHAR}${fqn}|[${text}](${href})>`;
      tag.textContent = entityLink;
    });
  } else {
    anchorTags.forEach((tag) => {
      const label = tag.getAttribute('data-label');
      const type = tag.getAttribute('data-type');
      const prefix = type === 'mention' ? '@' : '#';

      tag.textContent = `${prefix}${label}`;
    });
  }
  const modifiedHtmlString = doc.body.innerHTML;

  return modifiedHtmlString;
};

export const isHTMLString = (content: string) => {
  try {
    const parser = new DOMParser();
    const parsedDocument = parser.parseFromString(content, 'text/html');

    // since text can be also counted as child node so we will check if length is greater than 1
    return parsedDocument.body.childNodes.length > 1;
  } catch (e) {
    return false;
  }
};

/**
 * Set the content of the editor
 * @param editor The editor instance
 * @param newContent The new content to set
 */
export const setEditorContent = (editor: Editor, newContent: string) => {
  editor.commands.setContent(newContent);

  // Update the editor state to reflect the new content
  const newEditorState = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.state.plugins,
    schema: editor.state.schema,
    selection: editor.state.selection,
    storedMarks: editor.state.storedMarks,
  });
  editor.view.updateState(newEditorState);
};
