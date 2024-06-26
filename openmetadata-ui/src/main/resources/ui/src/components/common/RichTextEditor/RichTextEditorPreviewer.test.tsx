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

import {
  act,
  findByTestId,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import userEvent from '@testing-library/user-event';
import { PreviewerProp } from './RichTextEditor.interface';
import RichTextEditorPreviewer from './RichTextEditorPreviewer';

const mockDescription =
  // eslint-disable-next-line max-len
  '**Headings**\n\n# H1\n## H2\n### H3\n\n***\n**Bold**\n\n**bold text**\n\n\n***\n**Italic**\n\n*italic*\n\n***\n**BlockQuote**\n\n> blockquote\n\n***\n**Ordered List**\n\n1. First item\n2. Second item\n3. Third item\n\n\n***\n**Unordered List**\n\n- First item\n- Second item\n- Third item\n\n\n***\n**Code**\n\n`code`\n\n\n***\n**Horizontal Rule**\n\n---\n\n\n***\n**Link**\n[title](https://www.example.com)\n\n\n***\n**Image**\n\n![alt text](https://github.com/open-metadata/OpenMetadata/blob/main/docs/.gitbook/assets/openmetadata-banner.png?raw=true)\n\n\n***\n**Table**\n\n| Syntax | Description |\n| ----------- | ----------- |\n| Header | Title |\n| Paragraph | Text |\n***\n\n**Fenced Code Block**\n\n```\n{\n  "firstName": "John",\n  "lastName": "Smith",\n  "age": 25\n}\n```\n\n\n***\n**Strikethrough**\n~~The world is flat.~~\n';

const mockCodeBlockMarkdown =
  // eslint-disable-next-line max-len
  "```\nIFERROR ( \n    IF (\n        SUM ( 'Запасы'[СЗ, руб2] ) <> BLANK (),\n        CALCULATE (\n            DIVIDE ( SUM ( 'Запасы'[СЗ, руб2] ), [Количество дней в периоде_new] ),\n            FILTER ( 'Место отгрузки', [Код предприятия] <> \"7001\" ),\n            FILTER ( 'Запасы', [Код типа запаса] <> \"E\" )\n        ),\n        BLANK ()\n    ),\n    0\n)\n```";

const mockProp: PreviewerProp = {
  markdown: mockDescription,
  className: '',
  maxLength: 300,
  enableSeeMoreVariant: true,
  isDescriptionExpanded: false,
};

describe('Test RichTextEditor Previewer Component', () => {
  it('Should render RichTextEditorViewer Component', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const viewerContainer = await findByTestId(container, 'viewer-container');

    expect(viewerContainer).toBeInTheDocument();

    const markdownParser = await findByTestId(container, 'markdown-parser');

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render bold markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    const boldMarkdown = markdownParser.querySelectorAll('strong');

    expect(boldMarkdown).toHaveLength(boldMarkdown.length);

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render strikethrough markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    expect(markdownParser.querySelector('del')).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('del')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render headings markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    const heading1 = markdownParser.querySelector('h1');
    const heading2 = markdownParser.querySelector('h2');
    const heading3 = markdownParser.querySelector('h3');

    expect(heading1).not.toBeInTheDocument();
    expect(heading2).not.toBeInTheDocument();
    expect(heading3).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('h1')).toBeInTheDocument();
    expect(markdownParser.querySelector('h2')).toBeInTheDocument();
    expect(markdownParser.querySelector('h3')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render italic markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    const italicMarkdown = markdownParser.querySelector('em');

    expect(italicMarkdown).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('em')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render blockquote markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    const blockquoteMarkdown = markdownParser.querySelector('blockquote');

    expect(blockquoteMarkdown).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('blockquote')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render ordered list markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    const orderedList = markdownParser.querySelector('ol');

    expect(orderedList).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('ol')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render unordered list markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    const unorderedList = markdownParser.querySelector('ul');

    expect(unorderedList).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('ul')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render code markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    const code = markdownParser.querySelector('code');

    expect(code).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('code')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render code block markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    expect(markdownParser.querySelector('pre')).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('pre')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render horizontal rule markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    const horizontalRule = markdownParser.querySelector('hr');

    expect(horizontalRule).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('hr')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render link markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    const link = markdownParser.querySelector('a');

    expect(link).toBeNull();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('a')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render image markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    expect(markdownParser.querySelector('img')).toBeNull();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('img')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render table markdown content', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const markdownParser = await findByTestId(container, 'markdown-parser');

    expect(markdownParser.querySelector('table')).not.toBeInTheDocument();

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();

    act(() => {
      fireEvent.click(readMoreButton);
    });

    expect(markdownParser.querySelector('table')).toBeInTheDocument();

    expect(markdownParser).toBeInTheDocument();
  });

  it('Should render read more button if enableSeeMoreVariant is true and max length is less than content length', () => {
    render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    expect(screen.getByTestId('read-more-button')).toBeInTheDocument();
  });

  it('Read more toggling should work', async () => {
    render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const readMoreButton = screen.getByTestId('read-more-button');

    await act(async () => {
      userEvent.click(readMoreButton);
    });

    const readLessButton = screen.getByTestId('read-less-button');

    expect(readLessButton).toBeInTheDocument();

    await act(async () => {
      userEvent.click(readLessButton);
    });

    expect(screen.getByTestId('read-more-button')).toBeInTheDocument();
  });

  it('Should render the whole content if enableSeeMoreVariant is false', () => {
    const markdown = 'This is a simple paragraph text';

    render(
      <RichTextEditorPreviewer
        {...mockProp}
        enableSeeMoreVariant={false}
        markdown={markdown}
      />,
      {
        wrapper: MemoryRouter,
      }
    );

    expect(screen.getByText(markdown)).toBeInTheDocument();
    expect(screen.queryByTestId('read-more-button')).toBeNull();
  });

  it('Should render the clipped content if enableSeeMoreVariant is true', () => {
    const markdown = 'This is a simple paragraph text';

    render(
      <RichTextEditorPreviewer
        {...mockProp}
        enableSeeMoreVariant
        markdown={markdown}
        maxLength={20}
      />,
      {
        wrapper: MemoryRouter,
      }
    );

    expect(screen.getByText('This is a simple...')).toBeInTheDocument();
    expect(screen.queryByTestId('read-more-button')).toBeInTheDocument();
  });

  it('Should not clipped content if enableSeeMoreVariant is true and markdown length is less than max length', () => {
    const markdown = 'This is a simple paragraph text';

    render(
      <RichTextEditorPreviewer
        {...mockProp}
        enableSeeMoreVariant
        markdown={markdown}
      />,
      {
        wrapper: MemoryRouter,
      }
    );

    expect(screen.getByText(markdown)).toBeInTheDocument();
    expect(screen.queryByTestId('read-more-button')).toBeNull();
  });

  it('Should render code block with copy button', async () => {
    const { container } = render(
      <RichTextEditorPreviewer
        {...mockProp}
        markdown={mockCodeBlockMarkdown}
      />,
      {
        wrapper: MemoryRouter,
      }
    );

    const markdownParser = await findByTestId(container, 'markdown-parser');

    expect(markdownParser.querySelector('pre')).toBeInTheDocument();

    expect(screen.getByTestId('code-block-copy-icon')).toBeInTheDocument();
  });

  it('Should render read less button if isDescriptionExpanded is true', async () => {
    const { container } = render(
      <RichTextEditorPreviewer {...mockProp} isDescriptionExpanded />,
      {
        wrapper: MemoryRouter,
      }
    );

    const readLessButton = await findByTestId(container, 'read-less-button');

    expect(readLessButton).toBeInTheDocument();
  });

  it('Should render read more button if isDescriptionExpanded is false', async () => {
    const { container } = render(<RichTextEditorPreviewer {...mockProp} />, {
      wrapper: MemoryRouter,
    });

    const readMoreButton = await findByTestId(container, 'read-more-button');

    expect(readMoreButton).toBeInTheDocument();
  });
});
