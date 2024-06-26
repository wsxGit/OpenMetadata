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

import Icon from '@ant-design/icons/lib/components/Icon';
import { Button } from 'antd';
import classNames from 'classnames';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  getIncomers,
  getOutgoers,
  Handle,
  NodeProps,
  Position,
} from 'reactflow';
import { ReactComponent as IconTimesCircle } from '../../../assets/svg/ic-times-circle.svg';
import { useLineageProvider } from '../../../context/LineageProvider/LineageProvider';
import { EntityLineageNodeType } from '../../../enums/entity.enum';
import { checkUpstreamDownstream } from '../../../utils/EntityLineageUtils';
import './custom-node.less';
import { getCollapseHandle, getExpandHandle } from './CustomNode.utils';
import './entity-lineage.style.less';
import { EdgeTypeEnum } from './EntityLineage.interface';
import LineageNodeLabelV1 from './LineageNodeLabelV1';
import NodeChildren from './NodeChildren/NodeChildren.component';

const CustomNodeV1 = (props: NodeProps) => {
  const { data, type, isConnectable } = props;

  const {
    isEditMode,
    tracedNodes,
    selectedNode,
    nodes,
    edges,
    upstreamDownstreamData,
    onNodeCollapse,
    removeNodeHandler,
    loadChildNodesHandler,
  } = useLineageProvider();

  const { label, isNewNode, node = {}, isRootNode } = data;
  const nodeType = isEditMode ? EntityLineageNodeType.DEFAULT : type;
  const isSelected = selectedNode === node;
  const { id, lineage, fullyQualifiedName } = node;

  const [isTraced, setIsTraced] = useState<boolean>(false);

  const getActiveNode = useCallback(
    (nodeId) => {
      return nodes.find((item) => item.id === nodeId);
    },
    [id, nodes]
  );

  const { hasDownstream, hasUpstream } = useMemo(() => {
    return checkUpstreamDownstream(id, lineage ?? []);
  }, [id, lineage]);

  const { hasOutgoers, hasIncomers, isUpstreamLeafNode, isDownstreamLeafNode } =
    useMemo(() => {
      const activeNode = getActiveNode(id);
      if (!activeNode) {
        return {
          hasOutgoers: false,
          hasIncomers: false,
          isUpstreamLeafNode: false,
          isDownstreamLeafNode: false,
        };
      }
      const outgoers = getOutgoers(activeNode, nodes, edges);
      const incomers = getIncomers(activeNode, nodes, edges);

      return {
        hasOutgoers: outgoers.length > 0,
        hasIncomers: incomers.length > 0,
        isUpstreamLeafNode: incomers.length === 0 && hasUpstream,
        isDownstreamLeafNode: outgoers.length === 0 && hasDownstream,
      };
    }, [id, nodes, edges, hasUpstream, hasDownstream]);

  const { isUpstreamNode, isDownstreamNode } = useMemo(() => {
    return {
      isUpstreamNode: upstreamDownstreamData.upstreamNodes.some(
        (item) => item.fullyQualifiedName === fullyQualifiedName
      ),
      isDownstreamNode: upstreamDownstreamData.downstreamNodes.some(
        (item) => item.fullyQualifiedName === fullyQualifiedName
      ),
    };
  }, [fullyQualifiedName, upstreamDownstreamData]);

  const onExpand = useCallback(
    (direction: EdgeTypeEnum) => {
      loadChildNodesHandler(node, direction);
    },
    [loadChildNodesHandler, node]
  );

  const onCollapse = useCallback(
    (direction = EdgeTypeEnum.DOWN_STREAM) => {
      const node = getActiveNode(id);
      if (node) {
        onNodeCollapse(node, direction);
      }
    },
    [loadChildNodesHandler, props, id]
  );

  const nodeLabel = useMemo(() => {
    if (isNewNode) {
      return label;
    } else {
      return (
        <>
          <LineageNodeLabelV1 node={node} />
          {isSelected && isEditMode && !isRootNode ? (
            <Button
              className="lineage-node-remove-btn bg-body-hover"
              data-testid="lineage-node-remove-btn"
              icon={
                <Icon
                  alt="times-circle"
                  className="align-middle"
                  component={IconTimesCircle}
                  style={{ fontSize: '16px' }}
                />
              }
              type="link"
              onClick={() => removeNodeHandler(props)}
            />
          ) : null}
        </>
      );
    }
  }, [node.id, isNewNode, label, isSelected, isEditMode]);

  const getExpandCollapseHandles = useCallback(() => {
    if (isEditMode) {
      return null;
    }

    return (
      <>
        {hasOutgoers &&
          (isDownstreamNode || isRootNode) &&
          getCollapseHandle(EdgeTypeEnum.DOWN_STREAM, onCollapse)}
        {isDownstreamLeafNode &&
          (isDownstreamNode || isRootNode) &&
          getExpandHandle(EdgeTypeEnum.DOWN_STREAM, () =>
            onExpand(EdgeTypeEnum.DOWN_STREAM)
          )}
        {hasIncomers &&
          (isUpstreamNode || isRootNode) &&
          getCollapseHandle(EdgeTypeEnum.UP_STREAM, () =>
            onCollapse(EdgeTypeEnum.UP_STREAM)
          )}
        {isUpstreamLeafNode &&
          (isUpstreamNode || isRootNode) &&
          getExpandHandle(EdgeTypeEnum.UP_STREAM, () =>
            onExpand(EdgeTypeEnum.UP_STREAM)
          )}
      </>
    );
  }, [
    node.id,
    nodes,
    edges,
    hasOutgoers,
    hasIncomers,
    isUpstreamLeafNode,
    isDownstreamLeafNode,
    isUpstreamNode,
    isDownstreamNode,
    isEditMode,
    isRootNode,
  ]);

  const getHandle = useCallback(() => {
    switch (nodeType) {
      case EntityLineageNodeType.OUTPUT:
        return (
          <>
            <Handle
              className="lineage-node-handle"
              id={id}
              isConnectable={isConnectable}
              position={Position.Left}
              type="target"
            />
            {getExpandCollapseHandles()}
          </>
        );

      case EntityLineageNodeType.INPUT:
        return (
          <>
            <Handle
              className="lineage-node-handle"
              id={id}
              isConnectable={isConnectable}
              position={Position.Right}
              type="source"
            />
            {getExpandCollapseHandles()}
          </>
        );

      case EntityLineageNodeType.NOT_CONNECTED:
        return null;

      default:
        return (
          <>
            <Handle
              className="lineage-node-handle"
              id={id}
              isConnectable={isConnectable}
              position={Position.Left}
              type="target"
            />
            <Handle
              className="lineage-node-handle"
              id={id}
              isConnectable={isConnectable}
              position={Position.Right}
              type="source"
            />
            {getExpandCollapseHandles()}
          </>
        );
    }
  }, [
    node.id,
    nodeType,
    isConnectable,
    isDownstreamLeafNode,
    isUpstreamLeafNode,
    loadChildNodesHandler,
  ]);

  useEffect(() => {
    setIsTraced(tracedNodes.includes(id));
  }, [tracedNodes, id]);

  return (
    <div
      className={classNames(
        'lineage-node p-0',
        isSelected ? 'custom-node-header-active' : 'custom-node-header-normal',
        { 'custom-node-header-tracing': isTraced }
      )}
      data-testid={`lineage-node-${fullyQualifiedName}`}>
      {getHandle()}
      <div className="lineage-node-content">
        <div className="label-container bg-white">{nodeLabel}</div>
        <NodeChildren isConnectable={isConnectable} node={node} />
      </div>
    </div>
  );
};

export default memo(CustomNodeV1);
