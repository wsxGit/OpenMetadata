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
Client to interact with databricks apis
"""
import json
import traceback

from metadata.ingestion.source.database.databricks.client import (
    API_TIMEOUT,
    DatabricksClient,
)
from metadata.ingestion.source.database.unitycatalog.models import (
    LineageColumnStreams,
    LineageTableStreams,
)
from metadata.utils.logger import ingestion_logger

logger = ingestion_logger()
TABLE_LINEAGE_PATH = "/lineage-tracking/table-lineage/get"
COLUMN_LINEAGE_PATH = "/lineage-tracking/column-lineage/get"


class UnityCatalogClient(DatabricksClient):
    """
    UnityCatalogClient creates a Databricks connection based on DatabricksCredentials.
    """

    def get_table_lineage(self, table_name: str) -> LineageTableStreams:
        """
        Method returns table lineage details
        """
        try:
            data = {
                "table_name": table_name,
            }

            response = self.client.get(
                f"{self.base_url}{TABLE_LINEAGE_PATH}",
                headers=self.headers,
                data=json.dumps(data),
                timeout=API_TIMEOUT,
            ).json()
            if response:
                return LineageTableStreams(**response)

        except Exception as exc:
            logger.debug(traceback.format_exc())
            logger.error(exc)

        return LineageTableStreams()

    def get_column_lineage(
        self, table_name: str, column_name: str
    ) -> LineageColumnStreams:
        """
        Method returns table lineage details
        """
        try:
            data = {
                "table_name": table_name,
                "column_name": column_name,
            }

            response = self.client.get(
                f"{self.base_url}{COLUMN_LINEAGE_PATH}",
                headers=self.headers,
                data=json.dumps(data),
                timeout=API_TIMEOUT,
            ).json()

            if response:
                return LineageColumnStreams(**response)

        except Exception as exc:
            logger.debug(traceback.format_exc())
            logger.error(exc)

        return LineageColumnStreams()
