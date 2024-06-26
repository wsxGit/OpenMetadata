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
import { Button, Tooltip } from 'antd';
import classNames from 'classnames';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';
import { ReactComponent as CollapseIcon } from '../../../assets/svg/ic-collapse.svg';
import DocumentTitle from '../DocumentTitle/DocumentTitle';
import PanelContainer from './PanelContainer/PanelContainer';
import './resizable-panels.less';
import { ResizablePanelsProps } from './ResizablePanels.interface';

const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  className,
  orientation = 'vertical',
  firstPanel,
  secondPanel,
  pageTitle,
  hideSecondPanel = false,
  applyDefaultStyle = true,
}) => {
  const { t } = useTranslation();
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  const handleCollapse = () => {
    setIsRightPanelCollapsed((prev) => !prev);
  };
  const panelHeight = applyDefaultStyle ? '64px' : '4px';

  return (
    <>
      {pageTitle && <DocumentTitle title={pageTitle} />}
      <ReflexContainer
        className={classNames(className, 'bg-white resizable-panels-layout')}
        orientation={orientation}
        style={{ height: `calc(100vh - ${panelHeight})` }}>
        <ReflexElement
          propagateDimensions
          className={classNames(firstPanel.className, 'resizable-first-panel', {
            'full-width': hideSecondPanel || isRightPanelCollapsed,
          })}
          data-testid={firstPanel.className}
          flex={firstPanel.flex}
          minSize={firstPanel.minWidth}
          onStopResize={(args) => {
            firstPanel.onStopResize?.(args.component.props.flex);
          }}>
          <PanelContainer overlay={firstPanel.overlay}>
            {firstPanel.children}
          </PanelContainer>
        </ReflexElement>

        <ReflexSplitter
          className={classNames(
            'splitter',
            { hidden: hideSecondPanel },
            { collapsed: isRightPanelCollapsed }
          )}>
          <Tooltip
            placement={isRightPanelCollapsed ? 'left' : 'top'}
            title={
              isRightPanelCollapsed ? t('label.expand') : t('label.collapse')
            }>
            <Button
              className={classNames('collapse-button', {
                collapsed: isRightPanelCollapsed,
              })}
              data-testid="collapse-button"
              type="ghost"
              onClick={handleCollapse}>
              <CollapseIcon className="collapse-icon" />
            </Button>
          </Tooltip>
          {!isRightPanelCollapsed && (
            <div
              className={classNames({
                'panel-grabber-vertical': orientation === 'vertical',
                'panel-grabber-horizontal': orientation === 'horizontal',
              })}>
              <div
                className={classNames('handle-icon', {
                  'handle-icon-vertical ': orientation === 'vertical',
                  'handle-icon-horizontal': orientation === 'horizontal',
                })}
              />
            </div>
          )}
        </ReflexSplitter>

        <ReflexElement
          propagateDimensions
          className={classNames(
            secondPanel.className,
            'resizable-second-panel',
            {
              hidden: hideSecondPanel,
              'right-panel-collapsed': isRightPanelCollapsed,
            }
          )}
          data-testid={secondPanel.className}
          flex={isRightPanelCollapsed ? 0 : secondPanel.flex}
          minSize={isRightPanelCollapsed ? 0 : secondPanel.minWidth}
          onStopResize={(args) => {
            secondPanel.onStopResize?.(args.component.props.flex);
          }}>
          {!hideSecondPanel && (
            <PanelContainer overlay={secondPanel.overlay}>
              {secondPanel.children}
            </PanelContainer>
          )}
        </ReflexElement>
      </ReflexContainer>
    </>
  );
};

export default ResizablePanels;
