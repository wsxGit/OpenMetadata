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
Source connection handler
"""
from functools import partial
from typing import Optional

from databricks.sdk import WorkspaceClient

from metadata.generated.schema.entity.automations.workflow import (
    Workflow as AutomationWorkflow,
)
from metadata.generated.schema.entity.services.connections.database.unityCatalogConnection import (
    UnityCatalogConnection,
)
from metadata.ingestion.connections.test_connections import test_connection_steps
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.ingestion.source.database.unitycatalog.client import UnityCatalogClient
from metadata.ingestion.source.database.unitycatalog.models import DatabricksTable
from metadata.utils.db_utils import get_host_from_host_port
from metadata.utils.logger import ingestion_logger

logger = ingestion_logger()


def get_connection_url(connection: UnityCatalogConnection) -> str:
    url = f"{connection.scheme.value}://token:{connection.token.get_secret_value()}@{connection.hostPort}"
    return url


def get_connection(connection: UnityCatalogConnection) -> WorkspaceClient:
    """
    Create connection
    """

    return WorkspaceClient(
        host=get_host_from_host_port(connection.hostPort),
        token=connection.token.get_secret_value(),
    )


def test_connection(
    metadata: OpenMetadata,
    connection: WorkspaceClient,
    service_connection: UnityCatalogConnection,
    automation_workflow: Optional[AutomationWorkflow] = None,
) -> None:
    """
    Test connection. This can be executed either as part
    of a metadata workflow or during an Automation Workflow
    """
    client = UnityCatalogClient(service_connection)
    table_obj = DatabricksTable()

    def get_catalogs(connection: WorkspaceClient, table_obj: DatabricksTable):
        for catalog in connection.catalogs.list():
            table_obj.catalog_name = catalog.name
            break

    def get_schemas(connection: WorkspaceClient, table_obj: DatabricksTable):
        for catalog in connection.catalogs.list():
            for schema in connection.schemas.list(catalog_name=catalog.name):
                if schema.name:
                    table_obj.schema_name = schema.name
                    table_obj.catalog_name = catalog.name
                    return

    def get_tables(connection: WorkspaceClient, table_obj: DatabricksTable):
        if table_obj.catalog_name and table_obj.schema_name:
            for table in connection.tables.list(
                catalog_name=table_obj.catalog_name, schema_name=table_obj.schema_name
            ):
                table_obj.name = table.name
                break

    test_fn = {
        "CheckAccess": connection.catalogs.list,
        "GetDatabases": partial(get_catalogs, connection, table_obj),
        "GetSchemas": partial(get_schemas, connection, table_obj),
        "GetTables": partial(get_tables, connection, table_obj),
        "GetViews": partial(get_tables, connection, table_obj),
        "GetQueries": client.test_query_api_access,
    }

    test_connection_steps(
        metadata=metadata,
        test_fn=test_fn,
        service_type=service_connection.type.value,
        automation_workflow=automation_workflow,
        timeout_seconds=service_connection.connectionTimeout,
    )
