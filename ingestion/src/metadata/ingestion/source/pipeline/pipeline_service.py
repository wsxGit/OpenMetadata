#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
"""
Base class for ingesting database services
"""
from abc import ABC, abstractmethod
from typing import Any, Iterable, List, Optional, Set

from pydantic import Field
from typing_extensions import Annotated

from metadata.generated.schema.api.data.createPipeline import CreatePipelineRequest
from metadata.generated.schema.api.lineage.addLineage import AddLineageRequest
from metadata.generated.schema.entity.data.pipeline import Pipeline
from metadata.generated.schema.entity.services.pipelineService import (
    PipelineConnection,
    PipelineService,
)
from metadata.generated.schema.metadataIngestion.pipelineServiceMetadataPipeline import (
    PipelineServiceMetadataPipeline,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.ingestion.api.delete import delete_entity_from_source
from metadata.ingestion.api.models import Either
from metadata.ingestion.api.steps import Source
from metadata.ingestion.api.topology_runner import TopologyRunnerMixin
from metadata.ingestion.models.delete_entity import DeleteEntity
from metadata.ingestion.models.ometa_classification import OMetaTagAndClassification
from metadata.ingestion.models.pipeline_status import OMetaPipelineStatus
from metadata.ingestion.models.topology import (
    NodeStage,
    ServiceTopology,
    TopologyContextManager,
    TopologyNode,
)
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.ingestion.source.connections import get_connection, get_test_connection_fn
from metadata.utils import fqn
from metadata.utils.filters import filter_by_pipeline
from metadata.utils.logger import ingestion_logger

logger = ingestion_logger()


class PipelineServiceTopology(ServiceTopology):
    """
    Defines the hierarchy in Pipeline Services.

    We could have a topology validator. We can only consume
    data that has been produced by any parent node.
    """

    root: Annotated[
        TopologyNode, Field(description="Root node for the topology")
    ] = TopologyNode(
        producer="get_services",
        stages=[
            NodeStage(
                type_=PipelineService,
                context="pipeline_service",
                processor="yield_create_request_pipeline_service",
                overwrite=False,
                must_return=True,
                cache_entities=True,
            ),
        ],
        children=["pipeline"],
        post_process=["mark_pipelines_as_deleted"],
    )
    pipeline: Annotated[
        TopologyNode, Field(description="Processing Pipelines Node")
    ] = TopologyNode(
        producer="get_pipeline",
        stages=[
            NodeStage(
                type_=OMetaTagAndClassification,
                context="tags",
                processor="yield_tag",
                nullable=True,
            ),
            NodeStage(
                type_=Pipeline,
                context="pipeline",
                processor="yield_pipeline",
                consumer=["pipeline_service"],
                use_cache=True,
            ),
            NodeStage(
                type_=OMetaPipelineStatus,
                processor="yield_pipeline_status",
                consumer=["pipeline_service"],
                nullable=True,
            ),
            NodeStage(
                type_=AddLineageRequest,
                processor="yield_pipeline_lineage",
                consumer=["pipeline_service"],
                nullable=True,
            ),
        ],
    )


class PipelineServiceSource(TopologyRunnerMixin, Source, ABC):
    """
    Base class for Pipeline Services.
    It implements the topology and context.
    """

    source_config: PipelineServiceMetadataPipeline
    config: WorkflowSource
    # Big union of types we want to fetch dynamically
    service_connection: PipelineConnection.__fields__["config"].annotation

    topology = PipelineServiceTopology()
    context = TopologyContextManager(topology)
    pipeline_source_state: Set = set()

    def __init__(
        self,
        config: WorkflowSource,
        metadata: OpenMetadata,
    ):
        super().__init__()
        self.config = config
        self.metadata = metadata
        self.service_connection = self.config.serviceConnection.root.config
        self.source_config: PipelineServiceMetadataPipeline = (
            self.config.sourceConfig.config
        )

        self.connection = get_connection(self.service_connection)
        # Flag the connection for the test connection
        self.connection_obj = self.connection
        self.client = self.connection
        self.test_connection()

    @property
    def name(self) -> str:
        return self.service_connection.type.name

    @abstractmethod
    def yield_pipeline(
        self, pipeline_details: Any
    ) -> Iterable[Either[CreatePipelineRequest]]:
        """Method to Get Pipeline Entity"""

    @abstractmethod
    def yield_pipeline_lineage_details(
        self, pipeline_details: Any
    ) -> Iterable[Either[AddLineageRequest]]:
        """Get lineage between pipeline and data sources"""

    @abstractmethod
    def get_pipelines_list(self) -> Optional[List[Any]]:
        """Get List of all pipelines"""

    @abstractmethod
    def get_pipeline_name(self, pipeline_details: Any) -> str:
        """Get Pipeline Name"""

    @abstractmethod
    def yield_pipeline_status(
        self, pipeline_details: Any
    ) -> Iterable[Either[OMetaPipelineStatus]]:
        """Get Pipeline Status"""

    def yield_pipeline_lineage(
        self, pipeline_details: Any
    ) -> Iterable[Either[AddLineageRequest]]:
        """Yields lineage if config is enabled"""
        if self.source_config.includeLineage:
            yield from self.yield_pipeline_lineage_details(pipeline_details) or []

    def yield_tag(self, *args, **kwargs) -> Iterable[Either[OMetaTagAndClassification]]:
        """Method to fetch pipeline tags"""

    def close(self):
        """Method to implement any required logic after the ingestion process is completed"""

    def get_services(self) -> Iterable[WorkflowSource]:
        yield self.config

    def yield_create_request_pipeline_service(self, config: WorkflowSource):
        yield Either(
            right=self.metadata.get_create_service_from_source(
                entity=PipelineService, config=config
            )
        )

    def get_pipeline(self) -> Any:
        for pipeline_detail in self.get_pipelines_list():
            pipeline_name = self.get_pipeline_name(pipeline_detail)
            if filter_by_pipeline(
                self.source_config.pipelineFilterPattern,
                pipeline_name,
            ):
                self.status.filter(
                    pipeline_name,
                    "Pipeline Filtered Out",
                )
                continue
            yield pipeline_detail

    def test_connection(self) -> None:
        test_connection_fn = get_test_connection_fn(self.service_connection)
        test_connection_fn(self.metadata, self.connection_obj, self.service_connection)

    def register_record(self, pipeline_request: CreatePipelineRequest) -> None:
        """Mark the pipeline record as scanned and update the pipeline_source_state"""
        pipeline_fqn = fqn.build(
            self.metadata,
            entity_type=Pipeline,
            service_name=pipeline_request.service.root,
            pipeline_name=pipeline_request.name.root,
        )

        self.pipeline_source_state.add(pipeline_fqn)

    def mark_pipelines_as_deleted(self) -> Iterable[Either[DeleteEntity]]:
        """Method to mark the pipelines as deleted"""
        if self.source_config.markDeletedPipelines:
            yield from delete_entity_from_source(
                metadata=self.metadata,
                entity_type=Pipeline,
                entity_source_state=self.pipeline_source_state,
                mark_deleted_entity=self.source_config.markDeletedPipelines,
                params={"service": self.context.get().pipeline_service},
            )

    def get_db_service_names(self) -> List[str]:
        """
        Get the list of db service names
        """
        return (
            self.source_config.lineageInformation.dbServiceNames or []
            if self.source_config.lineageInformation
            else []
        )

    def prepare(self):
        """
        Method to implement any required logic before starting the ingestion process
        """
