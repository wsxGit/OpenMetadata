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

import { Button, Col, Row, Space, Tabs, TabsProps, Tooltip } from 'antd';
import { AxiosError } from 'axios';
import { compare, Operation } from 'fast-json-patch';
import { isEmpty, isUndefined, toString } from 'lodash';
import {
  PagingWithoutTotal,
  ServicesUpdateRequest,
  ServiceTypes,
} from 'Models';
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import AirflowMessageBanner from '../../components/common/AirflowMessageBanner/AirflowMessageBanner';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../components/common/Loader/Loader';
import { PagingHandlerParams } from '../../components/common/NextPrevious/NextPrevious.interface';
import TabsLabel from '../../components/common/TabsLabel/TabsLabel.component';
import TestConnection from '../../components/common/TestConnection/TestConnection';
import DataModelTable from '../../components/Dashboard/DataModel/DataModels/DataModelsTable';
import { DataAssetsHeader } from '../../components/DataAssets/DataAssetsHeader/DataAssetsHeader.component';
import { EntityName } from '../../components/Modals/EntityNameModal/EntityNameModal.interface';
import PageLayoutV1 from '../../components/PageLayoutV1/PageLayoutV1';
import Ingestion from '../../components/Settings/Services/Ingestion/Ingestion.component';
import ServiceConnectionDetails from '../../components/Settings/Services/ServiceConnectionDetails/ServiceConnectionDetails.component';
import {
  getServiceDetailsPath,
  INITIAL_PAGING_VALUE,
  pagingObject,
} from '../../constants/constants';
import { OPEN_METADATA } from '../../constants/Services.constant';
import { usePermissionProvider } from '../../context/PermissionProvider/PermissionProvider';
import { OperationPermission } from '../../context/PermissionProvider/PermissionProvider.interface';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import {
  EntityTabs,
  EntityType,
  TabSpecificField,
} from '../../enums/entity.enum';
import { ServiceCategory } from '../../enums/service.enum';
import { PipelineType } from '../../generated/api/services/ingestionPipelines/createIngestionPipeline';
import { Tag } from '../../generated/entity/classification/tag';
import { Container } from '../../generated/entity/data/container';
import { Dashboard } from '../../generated/entity/data/dashboard';
import { DashboardDataModel } from '../../generated/entity/data/dashboardDataModel';
import { Database } from '../../generated/entity/data/database';
import { Mlmodel } from '../../generated/entity/data/mlmodel';
import { Pipeline } from '../../generated/entity/data/pipeline';
import { SearchIndex } from '../../generated/entity/data/searchIndex';
import { StoredProcedure } from '../../generated/entity/data/storedProcedure';
import { Topic } from '../../generated/entity/data/topic';
import { DashboardConnection } from '../../generated/entity/services/dashboardService';
import { IngestionPipeline } from '../../generated/entity/services/ingestionPipelines/ingestionPipeline';
import { Include } from '../../generated/type/include';
import { Paging } from '../../generated/type/paging';
import { useAuth } from '../../hooks/authHooks';
import { useAirflowStatus } from '../../hooks/useAirflowStatus';
import { useApplicationStore } from '../../hooks/useApplicationStore';
import { useFqn } from '../../hooks/useFqn';
import { ConfigData, ServicesType } from '../../interface/service.interface';
import {
  getDashboards,
  getDataModels,
  ListDataModelParams,
} from '../../rest/dashboardAPI';
import { getDatabases } from '../../rest/databaseAPI';
import {
  deleteIngestionPipelineById,
  deployIngestionPipelineById,
  enableDisableIngestionPipelineById,
  getIngestionPipelines,
  triggerIngestionPipelineById,
} from '../../rest/ingestionPipelineAPI';
import { fetchAirflowConfig } from '../../rest/miscAPI';
import { getMlModels } from '../../rest/mlModelAPI';
import { getPipelines } from '../../rest/pipelineAPI';
import { getSearchIndexes } from '../../rest/SearchIndexAPI';
import {
  getServiceByFQN,
  patchService,
  restoreService,
} from '../../rest/serviceAPI';
import { getContainers } from '../../rest/storageAPI';
import { getTopics } from '../../rest/topicsAPI';
import {
  getEntityMissingError,
  sortTagsCaseInsensitive,
} from '../../utils/CommonUtils';
import entityUtilClassBase from '../../utils/EntityUtilClassBase';
import { getEntityName } from '../../utils/EntityUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import {
  getEditConnectionPath,
  getServiceVersionPath,
} from '../../utils/RouterUtils';
import {
  getCountLabel,
  getEntityTypeFromServiceCategory,
  getResourceEntityFromServiceCategory,
  shouldTestConnection,
} from '../../utils/ServiceUtils';
import { updateTierTag } from '../../utils/TagsUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import ServiceMainTabContent from './ServiceMainTabContent';

export type ServicePageData =
  | Database
  | Topic
  | Dashboard
  | Mlmodel
  | Pipeline
  | Container
  | DashboardDataModel
  | SearchIndex
  | StoredProcedure;

const ServiceDetailsPage: FunctionComponent = () => {
  const { t } = useTranslation();
  const { currentUser } = useApplicationStore();
  const { isAirflowAvailable } = useAirflowStatus();
  const { serviceCategory, tab } = useParams<{
    serviceCategory: ServiceTypes;
    tab: string;
  }>();

  const { fqn: decodedServiceFQN } = useFqn();

  const isMetadataService = useMemo(
    () => serviceCategory === ServiceCategory.METADATA_SERVICES,
    [serviceCategory]
  );

  const activeTab = useMemo(() => {
    if (tab) {
      return tab;
    }
    if (isMetadataService) {
      return EntityTabs.INGESTIONS;
    }

    return getCountLabel(serviceCategory).toLowerCase();
  }, [tab, serviceCategory, isMetadataService]);

  const isOpenMetadataService = useMemo(
    () => decodedServiceFQN === OPEN_METADATA,
    [decodedServiceFQN]
  );

  const { getEntityPermissionByFqn } = usePermissionProvider();
  const history = useHistory();

  const { isAdminUser } = useAuth();
  const [serviceDetails, setServiceDetails] = useState<ServicesType>(
    {} as ServicesType
  );
  const [data, setData] = useState<Array<ServicePageData>>([]);
  const [isLoading, setIsLoading] = useState(!isOpenMetadataService);
  const [isIngestionPipelineLoading, setIsIngestionPipelineLoading] =
    useState(false);
  const [isServiceLoading, setIsServiceLoading] = useState(true);
  const [dataModelPaging, setDataModelPaging] = useState<Paging>(pagingObject);
  const [paging, setPaging] = useState<Paging>(pagingObject);
  const [ingestionPipelines, setIngestionPipelines] = useState<
    IngestionPipeline[]
  >([]);
  const [ingestionPaging, setIngestionPaging] = useState<Paging>({} as Paging);
  const [showDeleted, setShowDeleted] = useState<boolean>(false);
  const [airflowEndpoint, setAirflowEndpoint] = useState<string>();
  const [connectionDetails, setConnectionDetails] = useState<ConfigData>();
  const [servicePermission, setServicePermission] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);
  const [currentPage, setCurrentPage] = useState(INITIAL_PAGING_VALUE);

  const extraDropdownContent = useMemo(
    () =>
      entityUtilClassBase.getManageExtraOptions(
        serviceCategory === 'databaseServices'
          ? EntityType.DATABASE_SERVICE
          : EntityType.ALL,
        decodedServiceFQN,
        servicePermission
      ),
    [servicePermission, decodedServiceFQN, serviceCategory]
  );

  const handleShowDeleted = useCallback((value: boolean) => {
    setShowDeleted(value);
    setCurrentPage(INITIAL_PAGING_VALUE);
  }, []);

  const allowTestConn = useMemo(() => {
    return shouldTestConnection(serviceCategory);
  }, [serviceCategory]);

  const { version: currentVersion, deleted } = useMemo(
    () => serviceDetails,
    [serviceDetails]
  );

  const fetchServicePermission = async () => {
    setIsLoading(true);
    try {
      const response = await getEntityPermissionByFqn(
        getResourceEntityFromServiceCategory(serviceCategory),
        decodedServiceFQN
      );
      setServicePermission(response);
    } catch (error) {
      // Error
    } finally {
      setIsLoading(false);
    }
  };

  const isTestingDisabled = useMemo(
    () =>
      !servicePermission.EditAll ||
      (isMetadataService && decodedServiceFQN === OPEN_METADATA) ||
      isUndefined(connectionDetails),
    [
      servicePermission,
      serviceCategory,
      decodedServiceFQN,
      connectionDetails,
      isMetadataService,
    ]
  );

  const goToEditConnection = useCallback(() => {
    history.push(
      getEditConnectionPath(serviceCategory ?? '', decodedServiceFQN ?? '')
    );
  }, [serviceCategory, decodedServiceFQN]);

  const activeTabHandler = useCallback(
    (key: string) => {
      if (key !== activeTab) {
        history.push({
          pathname: getServiceDetailsPath(
            decodedServiceFQN,
            serviceCategory,
            key
          ),
        });
      }
    },
    [activeTab, decodedServiceFQN, serviceCategory]
  );

  const getAirflowEndpoint = useCallback(async () => {
    try {
      const response = await fetchAirflowConfig();

      setAirflowEndpoint(response.apiEndpoint ?? '');
    } catch (error) {
      // Error
    }
  }, []);

  const getAllIngestionWorkflows = useCallback(
    async (paging?: Omit<Paging, 'total'>, limit?: number) => {
      try {
        setIsIngestionPipelineLoading(true);
        const response = await getIngestionPipelines({
          arrQueryFields: ['owner', 'pipelineStatuses'],
          serviceFilter: decodedServiceFQN,
          serviceType: getEntityTypeFromServiceCategory(serviceCategory),
          paging,
          pipelineType: [
            PipelineType.Metadata,
            PipelineType.Usage,
            PipelineType.Lineage,
            PipelineType.Profiler,
            PipelineType.Dbt,
          ],
          limit,
        });

        if (response.data) {
          setIngestionPipelines(response.data);
          setIngestionPaging(response.paging);
        } else {
          setIngestionPaging({} as Paging);
        }
      } catch (error) {
        // Error
      } finally {
        setIsIngestionPipelineLoading(false);
      }
    },
    [decodedServiceFQN, paging]
  );

  const updateCurrentSelectedIngestion = useCallback(
    (
      id: string,
      data: IngestionPipeline | undefined,
      updateKey: keyof IngestionPipeline,
      isDeleted = false
    ) => {
      const rowIndex = ingestionPipelines.findIndex((row) => row.id === id);

      const updatedRow = !isUndefined(data)
        ? { ...ingestionPipelines[rowIndex], [updateKey]: data[updateKey] }
        : null;

      const updatedData = isDeleted
        ? ingestionPipelines.filter((_, index) => index !== rowIndex)
        : undefined;

      const ingestionPipelinesList = updatedRow
        ? Object.assign([...ingestionPipelines], { [rowIndex]: updatedRow })
        : [...ingestionPipelines];

      setIngestionPipelines(updatedData ?? ingestionPipelinesList);
    },
    [ingestionPipelines]
  );

  const triggerIngestionById = useCallback(
    async (id: string, displayName: string) => {
      try {
        const data = await triggerIngestionPipelineById(id);
        showSuccessToast(t('message.pipeline-trigger-success-message'));

        updateCurrentSelectedIngestion(id, data, 'pipelineStatuses');
      } catch (err) {
        showErrorToast(
          t('server.ingestion-workflow-operation-error', {
            operation: t('label.triggering-lowercase'),
            displayName,
          })
        );
      } finally {
        setIsLoading(false);
      }
    },
    [updateCurrentSelectedIngestion]
  );

  const deployIngestion = useCallback(
    async (id: string) => {
      try {
        const response = await deployIngestionPipelineById(id);
        if (response.data) {
          setTimeout(() => {
            updateCurrentSelectedIngestion(
              id,
              response.data,
              'fullyQualifiedName'
            );

            setIsLoading(false);
          }, 500);
        }
      } catch (error) {
        showErrorToast(
          t('server.entity-updating-error', {
            entity: t('label.ingestion-workflow-lowercase'),
          })
        );
      }
    },
    [updateCurrentSelectedIngestion]
  );

  const handleEnableDisableIngestion = useCallback(
    async (id: string) => {
      try {
        const response = await enableDisableIngestionPipelineById(id);
        if (response.data) {
          updateCurrentSelectedIngestion(id, response.data, 'enabled');
        }
      } catch (error) {
        showErrorToast(error as AxiosError, t('server.unexpected-response'));
      }
    },
    [updateCurrentSelectedIngestion]
  );

  const deleteIngestionById = useCallback(
    async (id: string, displayName: string) => {
      try {
        await deleteIngestionPipelineById(id);
        setIngestionPipelines((pipelines) =>
          pipelines.filter((ing) => ing.id !== id)
        );
        /**
         * update the paging total count to reflect on tab count
         */
        setIngestionPaging((prevData) => ({
          ...prevData,
          total: prevData.total > 0 ? prevData.total - 1 : 0,
        }));
      } catch (error) {
        showErrorToast(
          error as AxiosError,
          t('server.ingestion-workflow-operation-error', {
            operation: t('label.deleting-lowercase'),
            displayName,
          })
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const include = useMemo(
    () => (showDeleted ? Include.Deleted : Include.NonDeleted),
    [showDeleted]
  );

  const fetchDatabases = useCallback(
    async (paging?: PagingWithoutTotal) => {
      const { data, paging: resPaging } = await getDatabases(
        decodedServiceFQN,
        'owner,tags,usageSummary',
        paging,
        include
      );

      setData(data);
      setPaging(resPaging);
    },
    [decodedServiceFQN, include]
  );

  const fetchTopics = useCallback(
    async (paging?: PagingWithoutTotal) => {
      const { data, paging: resPaging } = await getTopics(
        decodedServiceFQN,
        'owner,tags',
        paging,
        include
      );
      setData(data);
      setPaging(resPaging);
    },
    [decodedServiceFQN, include]
  );

  const fetchDashboards = useCallback(
    async (paging?: PagingWithoutTotal) => {
      const { data, paging: resPaging } = await getDashboards(
        decodedServiceFQN,
        'owner,usageSummary,tags',
        paging,
        include
      );
      setData(data);
      setPaging(resPaging);
    },
    [decodedServiceFQN, include]
  );

  // Fetch Data Model count to show it in tab label
  const fetchDashboardsDataModel = useCallback(
    async (params?: ListDataModelParams) => {
      try {
        setIsServiceLoading(true);
        const { paging: resPaging } = await getDataModels({
          service: decodedServiceFQN,
          fields: 'owner,tags,followers',
          include,
          ...params,
        });
        setDataModelPaging(resPaging);
      } catch (error) {
        showErrorToast(error as AxiosError);
        setPaging(pagingObject);
      }
    },
    [decodedServiceFQN, include]
  );

  const fetchPipeLines = useCallback(
    async (paging?: PagingWithoutTotal) => {
      const { data, paging: resPaging } = await getPipelines(
        decodedServiceFQN,
        'owner,tags',
        paging,
        include
      );
      setData(data);
      setPaging(resPaging);
    },
    [decodedServiceFQN, include]
  );

  const fetchMlModal = useCallback(
    async (paging?: PagingWithoutTotal) => {
      const { data, paging: resPaging } = await getMlModels(
        decodedServiceFQN,
        'owner,tags',
        paging,
        include
      );
      setData(data);
      setPaging(resPaging);
    },
    [decodedServiceFQN, include]
  );

  const fetchContainers = useCallback(
    async (paging?: PagingWithoutTotal) => {
      const response = await getContainers({
        service: decodedServiceFQN,
        fields: 'owner,tags',
        paging,
        root: true,
        include,
      });

      setData(response.data);
      setPaging(response.paging);
    },
    [decodedServiceFQN, include]
  );

  const fetchSearchIndexes = useCallback(
    async (paging?: PagingWithoutTotal) => {
      const response = await getSearchIndexes({
        service: decodedServiceFQN,
        fields: 'owner,tags',
        paging,
        root: true,
        include,
      });

      setData(response.data);
      setPaging(response.paging);
    },
    [decodedServiceFQN, include]
  );

  const getOtherDetails = useCallback(
    async (paging?: PagingWithoutTotal) => {
      try {
        setIsServiceLoading(true);
        switch (serviceCategory) {
          case ServiceCategory.DATABASE_SERVICES: {
            await fetchDatabases(paging);

            break;
          }
          case ServiceCategory.MESSAGING_SERVICES: {
            await fetchTopics(paging);

            break;
          }
          case ServiceCategory.DASHBOARD_SERVICES: {
            await fetchDashboards(paging);

            break;
          }
          case ServiceCategory.PIPELINE_SERVICES: {
            await fetchPipeLines(paging);

            break;
          }
          case ServiceCategory.ML_MODEL_SERVICES: {
            await fetchMlModal(paging);

            break;
          }
          case ServiceCategory.STORAGE_SERVICES: {
            await fetchContainers(paging);

            break;
          }
          case ServiceCategory.SEARCH_SERVICES: {
            await fetchSearchIndexes(paging);

            break;
          }
          default:
            break;
        }
      } catch (error) {
        setData([]);
        setPaging(pagingObject);
      } finally {
        setIsServiceLoading(false);
      }
    },
    [
      serviceCategory,
      fetchDatabases,
      fetchTopics,
      fetchDashboards,
      fetchPipeLines,
      fetchMlModal,
      fetchContainers,
      fetchSearchIndexes,
    ]
  );

  const fetchServiceDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getServiceByFQN(
        serviceCategory,
        decodedServiceFQN,
        {
          fields: `${TabSpecificField.OWNER},${TabSpecificField.TAGS},${
            isMetadataService ? '' : TabSpecificField.DATA_PRODUCTS
          },${isMetadataService ? '' : 'domain'}`,
          include: Include.All,
        }
      );
      setServiceDetails(response);
      setConnectionDetails(response.connection?.config as DashboardConnection);
    } catch (error) {
      // Error
    } finally {
      setIsLoading(false);
    }
  }, [serviceCategory, decodedServiceFQN, isMetadataService]);

  useEffect(() => {
    getOtherDetails();
  }, [activeTab, showDeleted, deleted]);

  useEffect(() => {
    // fetch count for data modal tab, its need only when its dashboard page and data modal tab is not active
    if (serviceCategory === ServiceCategory.DASHBOARD_SERVICES) {
      fetchDashboardsDataModel({ limit: 0 });
    }
  }, []);

  useEffect(() => {
    if (servicePermission.ViewAll || servicePermission.ViewBasic) {
      fetchServiceDetails();
    }
  }, [decodedServiceFQN, serviceCategory, servicePermission]);

  const handleUpdateDisplayName = useCallback(
    async (data: EntityName) => {
      if (isEmpty(serviceDetails)) {
        return;
      }

      const updatedData: ServicesType = {
        ...serviceDetails,
        displayName: data.displayName,
      };
      const jsonPatch = compare(serviceDetails, updatedData);

      try {
        const response = await patchService(
          serviceCategory,
          serviceDetails.id,
          jsonPatch
        );
        setServiceDetails((pre) => ({
          ...pre,
          displayName: response.displayName,
        }));
      } catch (error) {
        showErrorToast(error as AxiosError);
      }
    },
    [serviceDetails, serviceCategory]
  );

  const handleDescriptionUpdate = async (updatedHTML: string) => {
    if (
      serviceDetails.description !== updatedHTML &&
      !isEmpty(serviceDetails)
    ) {
      const updatedData: ServicesType = {
        ...serviceDetails,
        description: updatedHTML,
      };

      const jsonPatch = compare(serviceDetails, updatedData);

      try {
        const response = await patchService(
          serviceCategory,
          serviceDetails.id,
          jsonPatch
        );
        setServiceDetails(response);
      } catch (error) {
        showErrorToast(error as AxiosError);
      }
    }
  };

  const handleUpdateOwner = useCallback(
    async (owner: ServicesType['owner']) => {
      const updatedData = {
        ...serviceDetails,
        owner,
      } as ServicesUpdateRequest;

      const jsonPatch = compare(serviceDetails, updatedData);
      try {
        const res = await patchService(
          serviceCategory,
          serviceDetails?.id ?? '',
          jsonPatch
        );
        setServiceDetails(res);
      } catch (error) {
        showErrorToast(
          error as AxiosError,
          t('server.entity-updating-error', {
            entity: t('label.owner-lowercase'),
          })
        );
      }
    },
    [serviceDetails, serviceCategory]
  );

  const saveUpdatedServiceData = useCallback(
    async (updatedData: ServicesType) => {
      try {
        let jsonPatch: Operation[] = [];
        if (serviceDetails) {
          jsonPatch = compare(serviceDetails, updatedData);
        }

        const response = await patchService(
          serviceCategory,
          serviceDetails.id ?? '',
          jsonPatch
        );

        setServiceDetails({
          ...response,
          tags: sortTagsCaseInsensitive(response.tags ?? []),
        });
      } catch (err) {
        showErrorToast(err as AxiosError);
      }
    },
    [serviceDetails, serviceCategory]
  );

  const handleUpdateTier = useCallback(
    async (newTier?: Tag) => {
      const tierTag = updateTierTag(serviceDetails?.tags ?? [], newTier);
      const updatedServiceDetails = {
        ...serviceDetails,
        tags: tierTag,
      };

      return saveUpdatedServiceData(updatedServiceDetails);
    },
    [saveUpdatedServiceData, serviceDetails]
  );

  const afterDomainUpdateAction = useCallback((data) => {
    const updatedData = data as ServicesType;

    setServiceDetails((data) => ({
      ...(data ?? updatedData),
      version: updatedData.version,
    }));
  }, []);

  const ingestionTab = useMemo(
    () => (
      <Row>
        <Col className="p-x-lg" span={24}>
          <Ingestion
            isRequiredDetailsAvailable
            airflowEndpoint={airflowEndpoint ?? ''}
            deleteIngestion={deleteIngestionById}
            deployIngestion={deployIngestion}
            handleEnableDisableIngestion={handleEnableDisableIngestion}
            ingestionList={ingestionPipelines}
            isAirflowAvailable={isAirflowAvailable}
            isLoading={isIngestionPipelineLoading}
            paging={ingestionPaging}
            permissions={servicePermission}
            serviceCategory={serviceCategory as ServiceCategory}
            serviceDetails={serviceDetails}
            serviceName={decodedServiceFQN}
            triggerIngestion={triggerIngestionById}
            onIngestionWorkflowsUpdate={getAllIngestionWorkflows}
          />
        </Col>
      </Row>
    ),
    [
      isAirflowAvailable,
      isIngestionPipelineLoading,
      airflowEndpoint,
      serviceDetails,
      deleteIngestionById,
      deployIngestion,
      handleEnableDisableIngestion,
      ingestionPipelines,
      ingestionPaging,
      servicePermission,
      serviceCategory,
      decodedServiceFQN,
      triggerIngestionById,
      getAllIngestionWorkflows,
    ]
  );

  const testConnectionTab = useMemo(() => {
    return (
      <Row>
        <Col className="p-x-lg" span={24}>
          <Row className="my-4">
            <Col span={12}>
              <AirflowMessageBanner />
            </Col>
            <Col span={12}>
              <Space className="w-full justify-end">
                <Tooltip
                  title={
                    servicePermission.EditAll
                      ? t('label.edit-entity', {
                          entity: t('label.connection'),
                        })
                      : t('message.no-permission-for-action')
                  }>
                  <Button
                    ghost
                    data-testid="edit-connection-button"
                    disabled={!servicePermission.EditAll}
                    type="primary"
                    onClick={goToEditConnection}>
                    {t('label.edit-entity', {
                      entity: t('label.connection'),
                    })}
                  </Button>
                </Tooltip>
                {allowTestConn && isAirflowAvailable && (
                  <Tooltip
                    title={
                      servicePermission.EditAll
                        ? t('label.test-entity', {
                            entity: t('label.connection'),
                          })
                        : t('message.no-permission-for-action')
                    }>
                    <TestConnection
                      connectionType={serviceDetails?.serviceType ?? ''}
                      getData={() => connectionDetails}
                      isTestingDisabled={isTestingDisabled}
                      serviceCategory={serviceCategory as ServiceCategory}
                      serviceName={serviceDetails?.name}
                      // validation is not required as we have all the data available and not in edit mode
                      shouldValidateForm={false}
                      showDetails={false}
                    />
                  </Tooltip>
                )}
              </Space>
            </Col>
          </Row>
        </Col>
        <Col className="p-x-lg" span={24}>
          <ServiceConnectionDetails
            connectionDetails={connectionDetails ?? {}}
            serviceCategory={serviceCategory}
            serviceFQN={serviceDetails?.serviceType || ''}
          />
        </Col>
      </Row>
    );
  }, [
    servicePermission.EditAll,
    allowTestConn,
    isAirflowAvailable,
    goToEditConnection,
    serviceDetails,
    connectionDetails,
    isTestingDisabled,
    serviceCategory,
  ]);

  useEffect(() => {
    if (!isOpenMetadataService) {
      fetchServicePermission();
    }
  }, [decodedServiceFQN, serviceCategory]);

  useEffect(() => {
    if (isAirflowAvailable && !isOpenMetadataService) {
      getAllIngestionWorkflows();
      getAirflowEndpoint();
    }
  }, [isAirflowAvailable]);

  const entityType = useMemo(
    () => getEntityTypeFromServiceCategory(serviceCategory),
    [serviceCategory]
  );

  const pagingHandler = useCallback(
    ({ cursorType, currentPage }: PagingHandlerParams) => {
      if (cursorType) {
        getOtherDetails({
          [cursorType]: paging[cursorType],
        });
        setCurrentPage(currentPage);
      }
    },
    [paging, getOtherDetails]
  );

  const handleToggleDelete = (version?: number) => {
    setServiceDetails((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        deleted: !prev?.deleted,
        ...(version ? { version } : {}),
      };
    });
  };

  const afterDeleteAction = useCallback(
    (isSoftDelete?: boolean, version?: number) =>
      isSoftDelete ? handleToggleDelete(version) : history.goBack(),
    [handleToggleDelete]
  );

  const handleRestoreService = useCallback(async () => {
    try {
      const { version: newVersion } = await restoreService(
        serviceCategory,
        serviceDetails.id
      );
      showSuccessToast(
        t('message.restore-entities-success', {
          entity: t('label.service'),
        }),
        2000
      );
      handleToggleDelete(newVersion);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.restore-entities-error', {
          entity: t('label.service'),
        })
      );
    }
  }, [serviceCategory, serviceDetails]);

  const tabs: TabsProps['items'] = useMemo(() => {
    const tabs = [];
    const userOwnsService = currentUser?.id === serviceDetails?.owner?.id;

    const userInOwnerTeam = Boolean(
      currentUser?.teams?.some((team) => team.id === serviceDetails?.owner?.id)
    );

    const showIngestionTab = userInOwnerTeam || userOwnsService || isAdminUser;

    if (!isMetadataService) {
      tabs.push({
        name: getCountLabel(serviceCategory),
        key: getCountLabel(serviceCategory).toLowerCase(),
        count: paging.total,
        children: (
          <ServiceMainTabContent
            currentPage={currentPage}
            data={data}
            isServiceLoading={isServiceLoading}
            paging={paging}
            pagingHandler={pagingHandler}
            saveUpdatedServiceData={saveUpdatedServiceData}
            serviceDetails={serviceDetails}
            serviceName={serviceCategory}
            servicePermission={servicePermission}
            showDeleted={showDeleted}
            onDescriptionUpdate={handleDescriptionUpdate}
            onShowDeletedChange={handleShowDeleted}
          />
        ),
      });
    }

    if (serviceCategory === ServiceCategory.DASHBOARD_SERVICES) {
      tabs.push({
        name: t('label.data-model'),
        key: EntityTabs.DATA_Model,
        count: dataModelPaging.total,
        children: <DataModelTable />,
      });
    }

    tabs.push(
      {
        name: t('label.ingestion-plural'),
        key: EntityTabs.INGESTIONS,
        isHidden: !showIngestionTab,
        count: ingestionPaging.total,
        children: ingestionTab,
      },
      {
        name: t('label.connection'),
        isHidden: !servicePermission.EditAll,
        key: EntityTabs.CONNECTION,
        children: testConnectionTab,
      }
    );

    return tabs
      .filter((tab) => !tab.isHidden)
      .map((tab) => ({
        label: (
          <TabsLabel
            count={tab.count}
            id={tab.key}
            isActive={activeTab === tab.key}
            name={tab.name}
          />
        ),
        key: tab.key,
        children: tab.children,
      }));
  }, [
    serviceDetails,
    isAdminUser,
    serviceCategory,
    paging,
    servicePermission,
    handleDescriptionUpdate,
    showDeleted,
    handleShowDeleted,
    data,
    isServiceLoading,
    getOtherDetails,
    saveUpdatedServiceData,
    dataModelPaging,
    ingestionPaging,
    ingestionTab,
    testConnectionTab,
    activeTab,
    isMetadataService,
  ]);

  const versionHandler = () => {
    currentVersion &&
      history.push(
        getServiceVersionPath(
          serviceCategory,
          decodedServiceFQN,
          toString(currentVersion)
        )
      );
  };

  if (isLoading) {
    return <Loader />;
  }

  if (!(servicePermission.ViewAll || servicePermission.ViewBasic)) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  return (
    <PageLayoutV1
      pageTitle={t('label.entity-detail-plural', {
        entity: getEntityName(serviceDetails),
      })}>
      {isEmpty(serviceDetails) ? (
        <ErrorPlaceHolder className="m-0">
          {getEntityMissingError(serviceCategory as string, decodedServiceFQN)}
        </ErrorPlaceHolder>
      ) : (
        <Row data-testid="service-page" gutter={[0, 12]}>
          <Col className="p-x-lg" span={24}>
            <DataAssetsHeader
              isRecursiveDelete
              afterDeleteAction={afterDeleteAction}
              afterDomainUpdateAction={afterDomainUpdateAction}
              dataAsset={serviceDetails}
              entityType={entityType}
              extraDropdownContent={extraDropdownContent}
              permissions={servicePermission}
              showDomain={!isMetadataService}
              onDisplayNameUpdate={handleUpdateDisplayName}
              onOwnerUpdate={handleUpdateOwner}
              onRestoreDataAsset={handleRestoreService}
              onTierUpdate={handleUpdateTier}
              onVersionClick={versionHandler}
            />
          </Col>

          <Col span={24}>
            <Tabs
              activeKey={activeTab}
              className="entity-details-page-tabs"
              data-testid="tabs"
              items={tabs}
              onChange={activeTabHandler}
            />
          </Col>
        </Row>
      )}
    </PageLayoutV1>
  );
};

export default ServiceDetailsPage;
