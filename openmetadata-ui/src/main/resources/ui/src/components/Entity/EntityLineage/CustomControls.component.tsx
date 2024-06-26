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

import { RightOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Col, Dropdown, Row, Space, Tooltip } from 'antd';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import classNames from 'classnames';
import React, {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as ExitFullScreen } from '../../../assets/svg/exit-full-screen.svg';
import { ReactComponent as FullScreen } from '../../../assets/svg/full-screen.svg';
import { ReactComponent as EditIconColor } from '../../../assets/svg/ic-edit-lineage-colored.svg';
import { ReactComponent as EditIcon } from '../../../assets/svg/ic-edit-lineage.svg';
import { ReactComponent as ExportIcon } from '../../../assets/svg/ic-export.svg';
import { NO_PERMISSION_FOR_ACTION } from '../../../constants/HelperTextUtil';
import { LINEAGE_DEFAULT_QUICK_FILTERS } from '../../../constants/Lineage.constants';
import { useLineageProvider } from '../../../context/LineageProvider/LineageProvider';
import { SearchIndex } from '../../../enums/search.enum';
import { useApplicationStore } from '../../../hooks/useApplicationStore';
import { getAssetsPageQuickFilters } from '../../../utils/AdvancedSearchUtils';
import { getLoadingStatusValue } from '../../../utils/EntityLineageUtils';
import { getQuickFilterQuery } from '../../../utils/Explore.utils';
import { ExploreQuickFilterField } from '../../Explore/ExplorePage.interface';
import ExploreQuickFilters from '../../Explore/ExploreQuickFilters';
import { AssetsOfEntity } from '../../Glossary/GlossaryTerms/tabs/AssetsTabs.interface';
import { ControlProps, LineageConfig } from './EntityLineage.interface';
import LineageConfigModal from './LineageConfigModal';
import LineageSearchSelect from './LineageSearchSelect/LineageSearchSelect';

const CustomControls: FC<ControlProps> = ({
  style,
  className,
  deleted,
  hasEditAccess,
  handleFullScreenViewClick,
  onExitFullScreenViewClick,
}: ControlProps) => {
  const { theme } = useApplicationStore();
  const { t } = useTranslation();
  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const {
    lineageConfig,
    onLineageEditClick,
    loading,
    status,
    isEditMode,
    onLineageConfigUpdate,
    onQueryFilterUpdate,
    onExportClick,
  } = useLineageProvider();
  const [selectedFilter, setSelectedFilter] = useState<string[]>([]);
  const [selectedQuickFilters, setSelectedQuickFilters] = useState<
    ExploreQuickFilterField[]
  >([]);
  const [filters, setFilters] = useState<ExploreQuickFilterField[]>([]);

  const handleMenuClick = ({ key }: { key: string }) => {
    setSelectedFilter((prevSelected) => [...prevSelected, key]);
  };

  const filterMenu: ItemType[] = useMemo(() => {
    return filters.map((filter) => ({
      key: filter.key,
      label: filter.label,
      onClick: handleMenuClick,
    }));
  }, [filters]);

  useEffect(() => {
    const dropdownItems = getAssetsPageQuickFilters(AssetsOfEntity.LINEAGE);

    setFilters(
      dropdownItems.map((item) => ({
        ...item,
        value: [],
      }))
    );

    const defaultFilterValues = dropdownItems
      .filter((item) => LINEAGE_DEFAULT_QUICK_FILTERS.includes(item.key))
      .map((item) => item.key);

    setSelectedFilter(defaultFilterValues);
  }, []);

  const editIcon = useMemo(() => {
    return (
      <span className="anticon">
        {isEditMode ? (
          <EditIcon height="16px" width="16px" />
        ) : (
          <EditIconColor height="16px" width="16px" />
        )}
      </span>
    );
  }, [isEditMode]);

  const handleDialogSave = useCallback(
    (config: LineageConfig) => {
      onLineageConfigUpdate?.(config);
      setDialogVisible(false);
    },
    [onLineageConfigUpdate, setDialogVisible]
  );

  const handleQuickFiltersChange = (data: ExploreQuickFilterField[]) => {
    const quickFilterQuery = getQuickFilterQuery(data);
    onQueryFilterUpdate(JSON.stringify(quickFilterQuery));
  };

  const handleQuickFiltersValueSelect = useCallback(
    (field: ExploreQuickFilterField) => {
      setSelectedQuickFilters((pre) => {
        const data = pre.map((preField) => {
          if (preField.key === field.key) {
            return field;
          } else {
            return preField;
          }
        });

        handleQuickFiltersChange(data);

        return data;
      });
    },
    [setSelectedQuickFilters]
  );

  useEffect(() => {
    const updatedQuickFilters = filters
      .filter((filter) => selectedFilter.includes(filter.key))
      .map((selectedFilterItem) => {
        const originalFilterItem = selectedQuickFilters?.find(
          (filter) => filter.key === selectedFilterItem.key
        );

        return originalFilterItem || selectedFilterItem;
      });

    const newItems = updatedQuickFilters.filter(
      (item) =>
        !selectedQuickFilters.some(
          (existingItem) => item.key === existingItem.key
        )
    );

    if (newItems.length > 0) {
      setSelectedQuickFilters((prevSelected) => [...prevSelected, ...newItems]);
    }
  }, [selectedFilter, selectedQuickFilters, filters]);

  return (
    <>
      <Row
        className={classNames('z-10 w-full', className)}
        gutter={[8, 8]}
        style={style}>
        <Col flex="auto">
          <LineageSearchSelect />
          <Space className="m-l-xs" size={16}>
            <Dropdown
              menu={{
                items: filterMenu,
                selectedKeys: selectedFilter,
              }}
              trigger={['click']}>
              <Button ghost className="expand-btn" type="primary">
                {t('label.advanced')}
                <RightOutlined />
              </Button>
            </Dropdown>
            <ExploreQuickFilters
              independent
              aggregations={{}}
              fields={selectedQuickFilters}
              index={SearchIndex.ALL}
              showDeleted={false}
              onFieldValueSelect={handleQuickFiltersValueSelect}
            />
          </Space>
        </Col>
        <Col flex="250px">
          <Space className="justify-end w-full" size={16}>
            <Tooltip
              title={t('label.export-entity', {
                entity: t('label.lineage'),
              })}>
              <Button
                className="flex-center"
                data-testid="lineage-export"
                disabled={isEditMode}
                icon={
                  <span className="anticon">
                    <ExportIcon
                      color={theme.primaryColor}
                      height={14}
                      width={14}
                    />
                  </span>
                }
                onClick={onExportClick}
              />
            </Tooltip>

            {handleFullScreenViewClick && (
              <Tooltip title={t('label.fit-to-screen')}>
                <Button
                  data-testid="full-screen"
                  icon={
                    <span className="anticon">
                      <FullScreen
                        color={theme.primaryColor}
                        height={16}
                        width={16}
                      />
                    </span>
                  }
                  onClick={handleFullScreenViewClick}
                />
              </Tooltip>
            )}
            {onExitFullScreenViewClick && (
              <Tooltip title={t('label.exit-fit-to-screen')}>
                <Button
                  data-testid="exit-full-screen"
                  icon={
                    <span className="anticon">
                      <ExitFullScreen
                        color={theme.primaryColor}
                        height={16}
                        width={16}
                      />
                    </span>
                  }
                  onClick={onExitFullScreenViewClick}
                />
              </Tooltip>
            )}

            <Tooltip title={t('label.setting-plural')}>
              <Button
                data-testid="lineage-config"
                disabled={isEditMode}
                icon={
                  <SettingOutlined
                    style={{
                      fontSize: '16px',
                      color: theme.primaryColor,
                    }}
                  />
                }
                onClick={() => setDialogVisible(true)}
              />
            </Tooltip>

            {!deleted && (
              <Tooltip
                placement="topRight"
                title={t('label.edit-entity', {
                  entity: t('label.lineage'),
                })}>
                <Button
                  className={classNames(
                    'custom-control-edit-button rounded-full',
                    {
                      active: isEditMode,
                    }
                  )}
                  data-testid="edit-lineage"
                  disabled={!hasEditAccess}
                  icon={getLoadingStatusValue(editIcon, loading, status)}
                  title={
                    hasEditAccess
                      ? t('label.edit-entity', { entity: t('label.lineage') })
                      : NO_PERMISSION_FOR_ACTION
                  }
                  onClick={onLineageEditClick}
                />
              </Tooltip>
            )}
          </Space>
        </Col>
      </Row>
      <LineageConfigModal
        config={lineageConfig}
        visible={dialogVisible}
        onCancel={() => setDialogVisible(false)}
        onSave={handleDialogSave}
      />
    </>
  );
};

export default memo(CustomControls);
