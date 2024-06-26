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
DataLake connector to fetch metadata from a files stored s3, gcs and Hdfs
"""
import json
import os
import traceback
from typing import Any, Iterable, Optional, Tuple, Union

from metadata.generated.schema.api.data.createDatabase import CreateDatabaseRequest
from metadata.generated.schema.api.data.createDatabaseSchema import (
    CreateDatabaseSchemaRequest,
)
from metadata.generated.schema.api.data.createQuery import CreateQueryRequest
from metadata.generated.schema.api.data.createStoredProcedure import (
    CreateStoredProcedureRequest,
)
from metadata.generated.schema.api.data.createTable import CreateTableRequest
from metadata.generated.schema.api.lineage.addLineage import AddLineageRequest
from metadata.generated.schema.entity.data.database import Database
from metadata.generated.schema.entity.data.databaseSchema import DatabaseSchema
from metadata.generated.schema.entity.data.table import Table, TableType
from metadata.generated.schema.entity.services.connections.database.datalake.azureConfig import (
    AzureConfig,
)
from metadata.generated.schema.entity.services.connections.database.datalake.gcsConfig import (
    GCSConfig,
)
from metadata.generated.schema.entity.services.connections.database.datalake.s3Config import (
    S3Config,
)
from metadata.generated.schema.entity.services.connections.database.datalakeConnection import (
    DatalakeConnection,
)
from metadata.generated.schema.entity.services.ingestionPipelines.status import (
    StackTraceError,
)
from metadata.generated.schema.metadataIngestion.databaseServiceMetadataPipeline import (
    DatabaseServiceMetadataPipeline,
)
from metadata.generated.schema.metadataIngestion.storage.containerMetadataConfig import (
    StorageContainerConfig,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.generated.schema.security.credentials.gcpValues import (
    GcpCredentialsValues,
)
from metadata.generated.schema.type.basic import EntityName, FullyQualifiedEntityName
from metadata.ingestion.api.models import Either
from metadata.ingestion.api.steps import InvalidSourceException
from metadata.ingestion.models.ometa_classification import OMetaTagAndClassification
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.ingestion.source.connections import get_connection
from metadata.ingestion.source.database.database_service import DatabaseServiceSource
from metadata.ingestion.source.database.datalake.connection import (
    set_gcs_datalake_client,
)
from metadata.ingestion.source.database.stored_procedures_mixin import QueryByProcedure
from metadata.ingestion.source.storage.storage_service import (
    OPENMETADATA_TEMPLATE_FILE_NAME,
)
from metadata.readers.dataframe.models import DatalakeTableSchemaWrapper
from metadata.readers.file.base import ReadException
from metadata.readers.file.config_source_factory import get_reader
from metadata.utils import fqn
from metadata.utils.constants import DEFAULT_DATABASE
from metadata.utils.credentials import GOOGLE_CREDENTIALS
from metadata.utils.datalake.datalake_utils import (
    DataFrameColumnParser,
    fetch_dataframe,
    get_file_format_type,
)
from metadata.utils.filters import filter_by_database, filter_by_schema, filter_by_table
from metadata.utils.logger import ingestion_logger
from metadata.utils.s3_utils import list_s3_objects

logger = ingestion_logger()

OBJECT_FILTERED_OUT_MESSAGE = "Object Filtered Out"


class DatalakeSource(DatabaseServiceSource):
    """
    Implements the necessary methods to extract
    Database metadata from Datalake Source
    """

    def __init__(self, config: WorkflowSource, metadata: OpenMetadata):
        super().__init__()
        self.config = config
        self.source_config: DatabaseServiceMetadataPipeline = (
            self.config.sourceConfig.config
        )
        self.metadata = metadata
        self.service_connection = self.config.serviceConnection.root.config
        self.temp_credentials_file_path = []
        self.connection = get_connection(self.service_connection)
        if GOOGLE_CREDENTIALS in os.environ:
            self.temp_credentials_file_path.append(os.environ[GOOGLE_CREDENTIALS])
        self.client = self.connection.client
        self.table_constraints = None
        self.database_source_state = set()
        self.config_source = self.service_connection.configSource
        self.connection_obj = self.connection
        self.test_connection()
        self.reader = get_reader(config_source=self.config_source, client=self.client)

    @classmethod
    def create(
        cls, config_dict, metadata: OpenMetadata, pipeline_name: Optional[str] = None
    ):
        config: WorkflowSource = WorkflowSource.model_validate(config_dict)
        connection: DatalakeConnection = config.serviceConnection.root.config
        if not isinstance(connection, DatalakeConnection):
            raise InvalidSourceException(
                f"Expected DatalakeConnection, but got {connection}"
            )
        return cls(config, metadata)

    def get_database_names(self) -> Iterable[str]:
        """
        Default case with a single database.

        It might come informed - or not - from the source.

        Sources with multiple databases should overwrite this and
        apply the necessary filters.
        """
        if isinstance(self.config_source, GCSConfig):
            project_id_list = (
                self.service_connection.configSource.securityConfig.gcpConfig.projectId.root
            )
            if not isinstance(
                project_id_list,
                list,
            ):
                project_id_list = [project_id_list]
            for project_id in project_id_list:
                database_fqn = fqn.build(
                    self.metadata,
                    entity_type=Database,
                    service_name=self.context.get().database_service,
                    database_name=project_id,
                )
                if filter_by_database(
                    self.source_config.databaseFilterPattern,
                    database_fqn
                    if self.source_config.useFqnForFiltering
                    else project_id,
                ):
                    self.status.filter(database_fqn, "Database Filtered out")
                else:
                    try:
                        self.client = set_gcs_datalake_client(
                            config=self.config_source, project_id=project_id
                        )
                        if GOOGLE_CREDENTIALS in os.environ:
                            self.temp_credentials_file_path.append(
                                os.environ[GOOGLE_CREDENTIALS]
                            )
                        yield project_id
                    except Exception as exc:
                        logger.debug(traceback.format_exc())
                        logger.error(
                            f"Error trying to connect to database {project_id}: {exc}"
                        )
        else:
            database_name = self.service_connection.databaseName or DEFAULT_DATABASE
            yield database_name

    def yield_database(
        self, database_name: str
    ) -> Iterable[Either[CreateDatabaseRequest]]:
        """
        From topology.
        Prepare a database request and pass it to the sink
        """
        if isinstance(self.config_source, GCSConfig):
            database_name = self.client.project
        yield Either(
            right=CreateDatabaseRequest(
                name=EntityName(database_name),
                service=FullyQualifiedEntityName(self.context.get().database_service),
            )
        )

    def fetch_gcs_bucket_names(self):
        """
        Fetch Google cloud storage buckets
        """
        try:
            # List all the buckets in the project
            for bucket in self.client.list_buckets():
                # Build a fully qualified name (FQN) for each bucket
                schema_fqn = fqn.build(
                    self.metadata,
                    entity_type=DatabaseSchema,
                    service_name=self.context.get().database_service,
                    database_name=self.context.get().database,
                    schema_name=bucket.name,
                )

                # Check if the bucket matches a certain filter pattern
                if filter_by_schema(
                    self.config.sourceConfig.config.schemaFilterPattern,
                    schema_fqn
                    if self.config.sourceConfig.config.useFqnForFiltering
                    else bucket.name,
                ):
                    # If it does not match, the bucket is filtered out
                    self.status.filter(schema_fqn, "Bucket Filtered Out")
                    continue

                # If it does match, the bucket name is yielded
                yield bucket.name
        except Exception as exc:
            yield Either(
                left=StackTraceError(
                    name="Bucket",
                    error=f"Unexpected exception to yield bucket: {exc}",
                    stackTrace=traceback.format_exc(),
                )
            )

    def fetch_s3_bucket_names(self):
        for bucket in self.client.list_buckets()["Buckets"]:
            schema_fqn = fqn.build(
                self.metadata,
                entity_type=DatabaseSchema,
                service_name=self.context.get().database_service,
                database_name=self.context.get().database,
                schema_name=bucket["Name"],
            )
            if filter_by_schema(
                self.config.sourceConfig.config.schemaFilterPattern,
                schema_fqn
                if self.config.sourceConfig.config.useFqnForFiltering
                else bucket["Name"],
            ):
                self.status.filter(schema_fqn, "Bucket Filtered Out")
                continue
            yield bucket["Name"]

    def get_database_schema_names(self) -> Iterable[str]:
        """
        return schema names
        """
        bucket_name = self.service_connection.bucketName
        if isinstance(self.config_source, GCSConfig):
            if bucket_name:
                yield bucket_name
            else:
                yield from self.fetch_gcs_bucket_names()

        if isinstance(self.config_source, S3Config):
            if bucket_name:
                yield bucket_name
            else:
                yield from self.fetch_s3_bucket_names()

        if isinstance(self.config_source, AzureConfig):
            yield from self.get_container_names()

    def get_container_names(self) -> Iterable[str]:
        """
        To get schema names
        """
        prefix = (
            self.service_connection.bucketName
            if self.service_connection.bucketName
            else ""
        )
        schema_names = self.client.list_containers(name_starts_with=prefix)
        for schema in schema_names:
            schema_fqn = fqn.build(
                self.metadata,
                entity_type=DatabaseSchema,
                service_name=self.context.get().database_service,
                database_name=self.context.get().database,
                schema_name=schema["name"],
            )
            if filter_by_schema(
                self.config.sourceConfig.config.schemaFilterPattern,
                schema_fqn
                if self.config.sourceConfig.config.useFqnForFiltering
                else schema["name"],
            ):
                self.status.filter(schema_fqn, "Container Filtered Out")
                continue

            yield schema["name"]

    def yield_database_schema(
        self, schema_name: str
    ) -> Iterable[Either[CreateDatabaseSchemaRequest]]:
        """
        From topology.
        Prepare a database schema request and pass it to the sink
        """
        yield Either(
            right=CreateDatabaseSchemaRequest(
                name=EntityName(schema_name),
                database=FullyQualifiedEntityName(
                    fqn.build(
                        metadata=self.metadata,
                        entity_type=Database,
                        service_name=self.context.get().database_service,
                        database_name=self.context.get().database,
                    )
                ),
            )
        )

    def get_tables_name_and_type(  # pylint: disable=too-many-branches
        self,
    ) -> Iterable[Tuple[str, TableType]]:
        """
        Handle table and views.

        Fetches them up using the context information and
        the inspector set when preparing the db.

        :return: tables or views, depending on config
        """
        bucket_name = self.context.get().database_schema
        prefix = self.service_connection.prefix
        try:
            metadata_config_response = self.reader.read(
                path=OPENMETADATA_TEMPLATE_FILE_NAME,
                bucket_name=bucket_name,
                verbose=False,
            )
            content = json.loads(metadata_config_response)
            metadata_entry = StorageContainerConfig.model_validate(content)
        except ReadException:
            metadata_entry = None
        if self.source_config.includeTables:
            if isinstance(self.config_source, GCSConfig):
                bucket = self.client.get_bucket(bucket_name)
                for key in bucket.list_blobs(prefix=prefix):
                    table_name = self.standardize_table_name(bucket_name, key.name)
                    # adding this condition as the gcp blobs also contains directory, which we can filter out
                    if self.filter_dl_table(table_name):
                        continue
                    file_extension = get_file_format_type(
                        key_name=key.name, metadata_entry=metadata_entry
                    )
                    if table_name.endswith("/") or not file_extension:
                        logger.debug(
                            f"Object filtered due to unsupported file type: {key.name}"
                        )
                        continue

                    yield table_name, TableType.Regular, file_extension
            if isinstance(self.config_source, S3Config):
                kwargs = {"Bucket": bucket_name}
                if prefix:
                    kwargs["Prefix"] = prefix if prefix.endswith("/") else f"{prefix}/"
                for key in list_s3_objects(self.client, **kwargs):
                    table_name = self.standardize_table_name(bucket_name, key["Key"])
                    if self.filter_dl_table(table_name):
                        continue
                    file_extension = get_file_format_type(
                        key_name=key["Key"], metadata_entry=metadata_entry
                    )
                    if not file_extension:
                        logger.debug(
                            f"Object filtered due to unsupported file type: {key['Key']}"
                        )
                        continue

                    yield table_name, TableType.Regular, file_extension
            if isinstance(self.config_source, AzureConfig):
                container_client = self.client.get_container_client(bucket_name)

                for file in container_client.list_blobs(
                    name_starts_with=prefix or None
                ):
                    table_name = self.standardize_table_name(bucket_name, file.name)
                    if self.filter_dl_table(table_name):
                        continue
                    file_extension = get_file_format_type(
                        key_name=file.name, metadata_entry=metadata_entry
                    )
                    if not file_extension:
                        logger.debug(
                            f"Object filtered due to unsupported file type: {file.name}"
                        )
                        continue
                    yield table_name, TableType.Regular, file_extension

    def yield_table(
        self, table_name_and_type: Tuple[str, TableType]
    ) -> Iterable[Either[CreateTableRequest]]:
        """
        From topology.
        Prepare a table request and pass it to the sink
        """
        table_name, table_type, table_extension = table_name_and_type
        schema_name = self.context.get().database_schema
        try:
            table_constraints = None
            data_frame, raw_data = fetch_dataframe(
                config_source=self.config_source,
                client=self.client,
                file_fqn=DatalakeTableSchemaWrapper(
                    key=table_name,
                    bucket_name=schema_name,
                    file_extension=table_extension,
                ),
                fetch_raw_data=True,
            )
            if data_frame:
                column_parser = DataFrameColumnParser.create(
                    data_frame[0], table_extension, raw_data=raw_data
                )
                columns = column_parser.get_columns()
            else:
                # If no data_frame (due to unsupported type), ignore
                columns = None
            if columns:
                table_request = CreateTableRequest(
                    name=table_name,
                    tableType=table_type,
                    columns=columns,
                    tableConstraints=table_constraints if table_constraints else None,
                    databaseSchema=FullyQualifiedEntityName(
                        fqn.build(
                            metadata=self.metadata,
                            entity_type=DatabaseSchema,
                            service_name=self.context.get().database_service,
                            database_name=self.context.get().database,
                            schema_name=schema_name,
                        )
                    ),
                    fileFormat=table_extension.value if table_extension else None,
                )
                yield Either(right=table_request)
                self.register_record(table_request=table_request)
        except Exception as exc:
            yield Either(
                left=StackTraceError(
                    name="Table",
                    error=f"Unexpected exception to yield table [{table_name}]: {exc}",
                    stackTrace=traceback.format_exc(),
                )
            )

    def yield_view_lineage(self) -> Iterable[Either[AddLineageRequest]]:
        yield from []

    def yield_tag(
        self, schema_name: str
    ) -> Iterable[Either[OMetaTagAndClassification]]:
        """We don't bring tag information"""

    def get_stored_procedures(self) -> Iterable[Any]:
        """Not implemented"""

    def yield_stored_procedure(
        self, stored_procedure: Any
    ) -> Iterable[Either[CreateStoredProcedureRequest]]:
        """Not implemented"""

    def get_stored_procedure_queries(self) -> Iterable[QueryByProcedure]:
        """Not Implemented"""

    def yield_procedure_lineage_and_queries(
        self,
    ) -> Iterable[Either[Union[AddLineageRequest, CreateQueryRequest]]]:
        """Not Implemented"""
        yield from []

    def standardize_table_name(
        self, schema: str, table: str  # pylint: disable=unused-argument
    ) -> str:
        return table

    def filter_dl_table(self, table_name: str):
        """Filters Datalake Tables based on filterPattern"""
        table_fqn = fqn.build(
            self.metadata,
            entity_type=Table,
            service_name=self.context.get().database_service,
            database_name=self.context.get().database,
            schema_name=self.context.get().database_schema,
            table_name=table_name,
            skip_es_search=True,
        )

        if filter_by_table(
            self.config.sourceConfig.config.tableFilterPattern,
            table_fqn
            if self.config.sourceConfig.config.useFqnForFiltering
            else table_name,
        ):
            self.status.filter(
                table_fqn,
                OBJECT_FILTERED_OUT_MESSAGE,
            )
            return True
        return False

    def close(self):
        if isinstance(self.config_source, AzureConfig):
            self.client.close()
        if isinstance(self.config_source, GCSConfig):
            os.environ.pop("GOOGLE_CLOUD_PROJECT", "")
            if isinstance(self.service_connection, GcpCredentialsValues) and (
                GOOGLE_CREDENTIALS in os.environ
            ):
                del os.environ[GOOGLE_CREDENTIALS]
                for temp_file_path in self.temp_credentials_file_path:
                    if os.path.exists(temp_file_path):
                        os.remove(temp_file_path)
