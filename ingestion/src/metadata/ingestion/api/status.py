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
Status output utilities
"""
import pprint
import time
from typing import Any, Dict, List

from pydantic import BaseModel, Field
from typing_extensions import Annotated

from metadata.generated.schema.entity.services.ingestionPipelines.status import (
    StackTraceError,
)
from metadata.ingestion.models.patch_request import PatchedEntity, PatchRequest
from metadata.utils.logger import get_log_name, ingestion_logger

logger = ingestion_logger()


class Status(BaseModel):
    """
    Class to handle status
    """

    source_start_time: float = Field(
        default_factory=lambda: time.time()  # pylint: disable=unnecessary-lambda
    )

    records: Annotated[List[Any], Field(default_factory=list)]
    updated_records: Annotated[List[Any], Field(default_factory=list)]
    warnings: Annotated[List[Any], Field(default_factory=list)]
    filtered: Annotated[List[Dict[str, str]], Field(default_factory=list)]
    failures: Annotated[List[StackTraceError], Field(default_factory=list)]

    def scanned(self, record: Any) -> None:
        """
        Clean up the status results we want to show.

        We allow to not consider specific records that
        are not worth keeping record of.
        """
        if log_name := get_log_name(record):
            if isinstance(record, (PatchRequest, PatchedEntity)):
                self.updated_records.append(log_name)
            else:
                self.records.append(log_name)

    def updated(self, record: Any) -> None:
        if log_name := get_log_name(record):
            self.updated_records.append(log_name)

    def warning(self, key: str, reason: str) -> None:
        self.warnings.append({key: reason})

    def filter(self, key: str, reason: str) -> None:
        self.filtered.append({key: reason})

    def as_string(self) -> str:
        return pprint.pformat(self.__dict__, width=150)

    def failed(self, error: StackTraceError) -> None:
        """
        Add a failure to the list of failures
        """
        logger.warning(error.error)
        logger.debug(error.stackTrace)
        self.failures.append(error)

    def fail_all(self, failures: List[StackTraceError]) -> None:
        """
        Add a list of failures
        Args:
            failures: a list of stack tracer errors
        """
        self.failures.extend(failures)

    def calculate_success(self) -> float:
        source_success = max(
            len(self.records) + len(self.updated_records), 1
        )  # To avoid ZeroDivisionError using minimum value as 1
        source_failed = len(self.failures)
        return round(source_success * 100 / (source_success + source_failed), 2)
