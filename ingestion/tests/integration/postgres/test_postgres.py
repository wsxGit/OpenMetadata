import sys

import pytest

from metadata.generated.schema.api.services.createDatabaseService import (
    CreateDatabaseServiceRequest,
)
from metadata.generated.schema.entity.data.table import Table
from metadata.generated.schema.entity.services.connections.database.common.basicAuth import (
    BasicAuth,
)
from metadata.generated.schema.entity.services.connections.database.postgresConnection import (
    PostgresConnection,
)
from metadata.generated.schema.entity.services.databaseService import (
    DatabaseConnection,
    DatabaseService,
    DatabaseServiceType,
)
from metadata.generated.schema.metadataIngestion.databaseServiceProfilerPipeline import (
    DatabaseServiceProfilerPipeline,
)
from metadata.generated.schema.metadataIngestion.databaseServiceQueryLineagePipeline import (
    DatabaseServiceQueryLineagePipeline,
)
from metadata.generated.schema.metadataIngestion.databaseServiceQueryUsagePipeline import (
    DatabaseUsageConfigType,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    LogLevels,
    OpenMetadataWorkflowConfig,
    Processor,
    Sink,
    Source,
    SourceConfig,
    WorkflowConfig,
)
from metadata.ingestion.lineage.sql_lineage import search_cache
from metadata.ingestion.models.custom_pydantic import CustomSecretStr
from metadata.ingestion.ometa.client import APIError
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.workflow.metadata import MetadataWorkflow
from metadata.workflow.profiler import ProfilerWorkflow
from metadata.workflow.usage import UsageWorkflow

if not sys.version_info >= (3, 9):
    pytest.skip("requires python 3.9+", allow_module_level=True)


@pytest.fixture(scope="module")
def db_service(metadata, postgres_container):
    service = CreateDatabaseServiceRequest(
        name="docker_test_db",
        serviceType=DatabaseServiceType.Postgres,
        connection=DatabaseConnection(
            config=PostgresConnection(
                username=postgres_container.username,
                authType=BasicAuth(password=postgres_container.password),
                hostPort="localhost:"
                + postgres_container.get_exposed_port(postgres_container.port),
                database="dvdrental",
            )
        ),
    )
    service_entity = metadata.create_or_update(data=service)
    service_entity.connection.config.authType.password = CustomSecretStr(
        postgres_container.password
    )
    yield service_entity
    try:
        metadata.delete(
            DatabaseService, service_entity.id, recursive=True, hard_delete=True
        )
    except APIError as error:
        if error.status_code == 404:
            pass
        else:
            raise


@pytest.fixture(scope="module")
def ingest_metadata(db_service, metadata: OpenMetadata):
    workflow_config = OpenMetadataWorkflowConfig(
        source=Source(
            type=db_service.connection.config.type.value.lower(),
            serviceName=db_service.fullyQualifiedName.root,
            serviceConnection=db_service.connection,
            sourceConfig=SourceConfig(config={}),
        ),
        sink=Sink(
            type="metadata-rest",
            config={},
        ),
        workflowConfig=WorkflowConfig(openMetadataServerConfig=metadata.config),
    )
    metadata_ingestion = MetadataWorkflow.create(workflow_config)
    metadata_ingestion.execute()
    return


@pytest.fixture(scope="module")
def ingest_lineage(db_service, ingest_metadata, metadata: OpenMetadata):
    workflow_config = OpenMetadataWorkflowConfig(
        source=Source(
            type="postgres-lineage",
            serviceName=db_service.fullyQualifiedName.root,
            serviceConnection=db_service.connection,
            sourceConfig=SourceConfig(config=DatabaseServiceQueryLineagePipeline()),
        ),
        sink=Sink(
            type="metadata-rest",
            config={},
        ),
        workflowConfig=WorkflowConfig(openMetadataServerConfig=metadata.config),
    )
    metadata_ingestion = MetadataWorkflow.create(workflow_config)
    metadata_ingestion.execute()
    return


@pytest.fixture(scope="module")
def run_profiler_workflow(ingest_metadata, db_service, metadata):
    workflow_config = OpenMetadataWorkflowConfig(
        source=Source(
            type=db_service.connection.config.type.value.lower(),
            serviceName=db_service.fullyQualifiedName.root,
            serviceConnection=db_service.connection,
            sourceConfig=SourceConfig(config=DatabaseServiceProfilerPipeline()),
        ),
        processor=Processor(
            type="orm-profiler",
            config={},
        ),
        sink=Sink(
            type="metadata-rest",
            config={},
        ),
        workflowConfig=WorkflowConfig(
            loggerLevel=LogLevels.DEBUG, openMetadataServerConfig=metadata.config
        ),
    )
    metadata_ingestion = ProfilerWorkflow.create(workflow_config.dict())
    search_cache.clear()
    metadata_ingestion.execute()
    return


@pytest.fixture(scope="module")
def ingest_query_usage(ingest_metadata, db_service, metadata):
    workflow_config = {
        "source": {
            "type": "postgres-usage",
            "serviceName": db_service.fullyQualifiedName.root,
            "serviceConnection": db_service.connection.dict(),
            "sourceConfig": {
                "config": {"type": DatabaseUsageConfigType.DatabaseUsage.value}
            },
        },
        "processor": {"type": "query-parser", "config": {}},
        "stage": {
            "type": "table-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "bulkSink": {
            "type": "metadata-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "sink": {"type": "metadata-rest", "config": {}},
        "workflowConfig": {
            "loggerLevel": "DEBUG",
            "openMetadataServerConfig": metadata.config.dict(),
        },
    }
    workflow = UsageWorkflow.create(workflow_config)
    search_cache.clear()
    workflow.execute()
    workflow.raise_from_status()
    return


@pytest.fixture(scope="module")
def db_fqn(db_service: DatabaseService):
    return ".".join(
        [
            db_service.fullyQualifiedName.root,
            db_service.connection.config.database,
        ]
    )


def test_query_usage(
    ingest_query_usage,
    db_service,
    metadata,
    db_fqn,
):
    table = metadata.get_by_name(Table, ".".join([db_fqn, "public", "actor"]))
    queries = metadata.get_entity_queries(table.id)
    # TODO this should be retruning 2 queries but in CI sometimes it returns 1 *shrug*
    assert 1 <= len(queries) <= 2


def test_profiler(run_profiler_workflow):
    pass


def test_lineage(ingest_lineage):
    pass


def run_usage_workflow(db_service, metadata):
    workflow_config = {
        "source": {
            "type": "postgres-usage",
            "serviceName": db_service.fullyQualifiedName.root,
            "serviceConnection": db_service.connection.dict(),
            "sourceConfig": {
                "config": {"type": DatabaseUsageConfigType.DatabaseUsage.value}
            },
        },
        "processor": {"type": "query-parser", "config": {}},
        "stage": {
            "type": "table-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "bulkSink": {
            "type": "metadata-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "sink": {"type": "metadata-rest", "config": {}},
        "workflowConfig": {
            "loggerLevel": "DEBUG",
            "openMetadataServerConfig": metadata.config.dict(),
        },
    }
    workflow = UsageWorkflow.create(workflow_config)
    search_cache.clear()
    workflow.execute()
    workflow.raise_from_status()


@pytest.mark.xfail(
    reason="'metadata.ingestion.lineage.sql_lineage.search_cache' gets corrupted with invalid data."
    " See issue https://github.com/open-metadata/OpenMetadata/issues/16408"
)
def test_usage_delete_usage(db_service, ingest_lineage, metadata):
    workflow_config = {
        "source": {
            "type": "postgres-usage",
            "serviceName": db_service.fullyQualifiedName.root,
            "serviceConnection": db_service.connection.dict(),
            "sourceConfig": {
                "config": {"type": DatabaseUsageConfigType.DatabaseUsage.value}
            },
        },
        "processor": {"type": "query-parser", "config": {}},
        "stage": {
            "type": "table-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "bulkSink": {
            "type": "metadata-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "sink": {"type": "metadata-rest", "config": {}},
        "workflowConfig": {
            "loggerLevel": "DEBUG",
            "openMetadataServerConfig": metadata.config.dict(),
        },
    }
    workflow = UsageWorkflow.create(workflow_config)
    search_cache.clear()
    workflow.execute()
    workflow.raise_from_status()
    run_usage_workflow(db_service, metadata)
    metadata.delete(DatabaseService, db_service.id, hard_delete=True, recursive=True)
    workflow_config = OpenMetadataWorkflowConfig(
        source=Source(
            type=db_service.connection.config.type.value.lower(),
            serviceName=db_service.fullyQualifiedName.root,
            serviceConnection=db_service.connection,
            sourceConfig=SourceConfig(config={}),
        ),
        sink=Sink(
            type="metadata-rest",
            config={},
        ),
        workflowConfig=WorkflowConfig(openMetadataServerConfig=metadata.config),
    )
    metadata_ingestion = MetadataWorkflow.create(workflow_config)
    metadata_ingestion.execute()
    metadata_ingestion.raise_from_status()
    run_usage_workflow(db_service, metadata)
