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
"""Metabase source module"""

import traceback
from typing import Any, Iterable, List, Optional

from metadata.generated.schema.api.data.createChart import CreateChartRequest
from metadata.generated.schema.api.data.createDashboard import CreateDashboardRequest
from metadata.generated.schema.api.lineage.addLineage import AddLineageRequest
from metadata.generated.schema.entity.data.chart import Chart
from metadata.generated.schema.entity.data.dashboard import (
    Dashboard as LineageDashboard,
)
from metadata.generated.schema.entity.services.connections.dashboard.metabaseConnection import (
    MetabaseConnection,
)
from metadata.generated.schema.entity.services.connections.metadata.openMetadataConnection import (
    OpenMetadataConnection,
)
from metadata.generated.schema.entity.services.databaseService import DatabaseService
from metadata.generated.schema.entity.services.ingestionPipelines.status import (
    StackTraceError,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.generated.schema.type.basic import (
    EntityName,
    FullyQualifiedEntityName,
    Markdown,
    SourceUrl,
)
from metadata.ingestion.api.models import Either
from metadata.ingestion.api.steps import InvalidSourceException
from metadata.ingestion.lineage.models import ConnectionTypeDialectMapper
from metadata.ingestion.lineage.parser import LineageParser
from metadata.ingestion.lineage.sql_lineage import search_table_entities
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.ingestion.source.dashboard.dashboard_service import DashboardServiceSource
from metadata.ingestion.source.dashboard.metabase.models import (
    MetabaseChart,
    MetabaseCollection,
    MetabaseDashboard,
    MetabaseDashboardDetails,
)
from metadata.utils import fqn
from metadata.utils.filters import filter_by_chart
from metadata.utils.helpers import (
    clean_uri,
    get_standard_chart_type,
    replace_special_with,
)
from metadata.utils.logger import ingestion_logger

logger = ingestion_logger()


class MetabaseSource(DashboardServiceSource):
    """
    Metabase Source Class
    """

    config: WorkflowSource
    metadata_config: OpenMetadataConnection

    @classmethod
    def create(
        cls, config_dict, metadata: OpenMetadata, pipeline_name: Optional[str] = None
    ):
        config = WorkflowSource.model_validate(config_dict)
        connection: MetabaseConnection = config.serviceConnection.root.config
        if not isinstance(connection, MetabaseConnection):
            raise InvalidSourceException(
                f"Expected MetabaseConnection, but got {connection}"
            )
        return cls(config, metadata)

    def __init__(
        self,
        config: WorkflowSource,
        metadata: OpenMetadata,
    ):
        super().__init__(config, metadata)
        self.collections: List[MetabaseCollection] = []

    def prepare(self):
        self.collections = self.client.get_collections_list()
        return super().prepare()

    def get_dashboards_list(self) -> Optional[List[MetabaseDashboard]]:
        """
        Get List of all dashboards
        """
        return self.client.get_dashboards_list(self.collections)

    def get_dashboard_name(self, dashboard: MetabaseDashboard) -> str:
        """
        Get Dashboard Name
        """
        return dashboard.name

    def get_dashboard_details(self, dashboard: MetabaseDashboard) -> dict:
        """
        Get Dashboard Details
        """
        return self.client.get_dashboard_details(dashboard.id)

    def get_project_name(self, dashboard_details: Any) -> Optional[str]:
        """
        Method to get the project name by searching the dataset using id in the workspace dict
        """
        try:
            if dashboard_details.collection_id:
                collection_name = next(
                    (
                        collection.name
                        for collection in self.collections
                        if collection.id == dashboard_details.collection_id
                    ),
                    None,
                )
                return collection_name
        except Exception as exc:  # pylint: disable=broad-except
            logger.debug(traceback.format_exc())
            logger.warning(
                f"Error fetching the collection details for [{dashboard_details.collection_id}]: {exc}"
            )
        return None

    def yield_dashboard(
        self, dashboard_details: MetabaseDashboardDetails
    ) -> Iterable[Either[CreateDashboardRequest]]:
        """
        Method to Get Dashboard Entity
        """
        try:
            dashboard_url = (
                f"{clean_uri(self.service_connection.hostPort)}/dashboard/{dashboard_details.id}-"
                f"{replace_special_with(raw=dashboard_details.name.lower(), replacement='-')}"
            )
            dashboard_request = CreateDashboardRequest(
                name=EntityName(str(dashboard_details.id)),
                sourceUrl=SourceUrl(dashboard_url),
                displayName=dashboard_details.name,
                description=Markdown(dashboard_details.description)
                if dashboard_details.description
                else None,
                project=self.context.get().project_name,
                charts=[
                    FullyQualifiedEntityName(
                        fqn.build(
                            self.metadata,
                            entity_type=Chart,
                            service_name=self.context.get().dashboard_service,
                            chart_name=chart,
                        )
                    )
                    for chart in self.context.get().charts or []
                ],
                service=self.context.get().dashboard_service,
                owner=self.get_owner_ref(dashboard_details=dashboard_details),
            )
            yield Either(right=dashboard_request)
            self.register_record(dashboard_request=dashboard_request)
        except Exception as exc:  # pylint: disable=broad-except
            yield Either(
                left=StackTraceError(
                    name=dashboard_details.name,
                    error=f"Error creating dashboard [{dashboard_details.name}]: {exc}",
                    stackTrace=traceback.format_exc(),
                )
            )

    def yield_dashboard_chart(
        self, dashboard_details: MetabaseDashboardDetails
    ) -> Iterable[Either[CreateChartRequest]]:
        """Get chart method

        Args:
            dashboard_details:
        Returns:
            Iterable[CreateChartRequest]
        """
        charts = dashboard_details.dashcards
        for chart in charts:
            try:
                chart_details = chart.card
                if not chart_details.id or not chart_details.name:
                    continue
                chart_url = (
                    f"{clean_uri(self.service_connection.hostPort)}/question/{chart_details.id}-"
                    f"{replace_special_with(raw=chart_details.name.lower(), replacement='-')}"
                )
                if filter_by_chart(
                    self.source_config.chartFilterPattern, chart_details.name
                ):
                    self.status.filter(chart_details.name, "Chart Pattern not allowed")
                    continue
                yield Either(
                    right=CreateChartRequest(
                        name=EntityName(chart_details.id),
                        displayName=chart_details.name,
                        description=chart_details.description,
                        chartType=get_standard_chart_type(chart_details.display).value,
                        sourceUrl=SourceUrl(chart_url),
                        service=self.context.get().dashboard_service,
                    )
                )
            except Exception as exc:  # pylint: disable=broad-except
                yield Either(
                    left=StackTraceError(
                        name="Chart",
                        error=f"Error creating chart [{chart}]: {exc}",
                        stackTrace=traceback.format_exc(),
                    )
                )

    def yield_dashboard_lineage_details(
        self,
        dashboard_details: MetabaseDashboardDetails,
        db_service_name: Optional[str],
    ) -> Iterable[Either[AddLineageRequest]]:
        """Get lineage method

        Args:
            dashboard_details
        """
        if not db_service_name:
            return
        chart_list, dashboard_name = (
            dashboard_details.dashcards,
            str(dashboard_details.id),
        )
        for chart in chart_list:
            try:
                chart_details = chart.card
                if (
                    chart_details.dataset_query is None
                    or chart_details.dataset_query.type is None
                ):
                    continue
                if chart_details.dataset_query.type == "native":
                    yield from self._yield_lineage_from_query(
                        chart_details=chart_details,
                        db_service_name=db_service_name,
                        dashboard_name=dashboard_name,
                    ) or []

                # TODO: this method below only gets a single table, but if the chart of type query has a join the other
                # table_ids will be ignored within a nested object
                elif chart_details.dataset_query.type == "query":
                    if not chart_details.table_id:
                        continue
                    yield from self._yield_lineage_from_api(
                        chart_details=chart_details,
                        db_service_name=db_service_name,
                        dashboard_name=dashboard_name,
                    ) or []

            except Exception as exc:  # pylint: disable=broad-except
                yield Either(
                    left=StackTraceError(
                        name="Lineage",
                        error=f"Error adding lineage: {exc}",
                        stackTrace=traceback.format_exc(),
                    )
                )

    def _get_database_service(self, db_service_name: str):
        return self.metadata.get_by_name(DatabaseService, db_service_name)

    def _yield_lineage_from_query(
        self, chart_details: MetabaseChart, db_service_name: str, dashboard_name: str
    ) -> Iterable[Either[AddLineageRequest]]:
        database = self.client.get_database(chart_details.database_id)

        query = None
        if (
            chart_details.dataset_query
            and chart_details.dataset_query.native
            and chart_details.dataset_query.native.query
        ):
            query = chart_details.dataset_query.native.query

        if query is None:
            return

        database_name = database.details.db if database and database.details else None

        db_service = self._get_database_service(db_service_name)

        lineage_parser = LineageParser(
            query,
            ConnectionTypeDialectMapper.dialect_of(db_service.serviceType.value)
            if db_service
            else None,
        )

        for table in lineage_parser.source_tables:
            database_schema_name, table = fqn.split(str(table))[-2:]
            database_schema_name = self.check_database_schema_name(database_schema_name)
            from_entities = search_table_entities(
                metadata=self.metadata,
                database=database_name,
                service_name=db_service_name,
                database_schema=database_schema_name,
                table=table,
            )

            to_fqn = fqn.build(
                self.metadata,
                entity_type=LineageDashboard,
                service_name=self.config.serviceName,
                dashboard_name=dashboard_name,
            )
            to_entity = self.metadata.get_by_name(
                entity=LineageDashboard,
                fqn=to_fqn,
            )

            for from_entity in from_entities:
                yield self._get_add_lineage_request(
                    to_entity=to_entity, from_entity=from_entity
                )

    def _yield_lineage_from_api(
        self, chart_details: MetabaseChart, db_service_name: str, dashboard_name: str
    ) -> Iterable[Either[AddLineageRequest]]:
        table = self.client.get_table(chart_details.table_id)
        table_name = table.name or table.display_name

        if table is None or table_name is None:
            return

        database_name = table.db.details.db if table.db and table.db.details else None
        from_entities = search_table_entities(
            metadata=self.metadata,
            database=database_name,
            service_name=db_service_name,
            database_schema=table.table_schema,
            table=table_name,
        )

        to_fqn = fqn.build(
            self.metadata,
            entity_type=LineageDashboard,
            service_name=self.config.serviceName,
            dashboard_name=dashboard_name,
        )

        to_entity = self.metadata.get_by_name(
            entity=LineageDashboard,
            fqn=to_fqn,
        )

        for from_entity in from_entities:
            yield self._get_add_lineage_request(
                to_entity=to_entity, from_entity=from_entity
            )
