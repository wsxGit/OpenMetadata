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
Processor class used to compute refined report data
"""

from __future__ import annotations

import abc
from datetime import datetime
from typing import Callable, Iterable, Optional

from metadata.generated.schema.analytics.reportData import ReportData
from metadata.generated.schema.type.basic import Timestamp
from metadata.ingestion.api.status import Status
from metadata.ingestion.ometa.ometa_api import OpenMetadata


class DataProcessor(abc.ABC):
    """_summary_

    Attributes:
        _data_processor_type: used to instantiate the correct class object
        subclasses: dictionary mapping _data_processor_type to object
    """

    _data_processor_type: Optional[str] = None
    subclasses = {}

    def __init_subclass__(cls, *args, **kwargs) -> None:
        """Hook to map subclass objects to data processor type"""
        super().__init_subclass__(*args, **kwargs)
        cls.subclasses[cls._data_processor_type] = cls

    def __init__(self, metadata: OpenMetadata):
        self.metadata = metadata
        self.timestamp = Timestamp(int(datetime.now().timestamp() * 1000))
        self.processor_status = Status()
        self._refined_data = {}
        self.post_hook: Optional[Callable] = None
        self.pre_hook: Optional[Callable] = None
        self.clean_up_cache: bool = False

    @classmethod
    def create(cls, _data_processor_type, metadata: OpenMetadata):
        if _data_processor_type not in cls.subclasses:
            raise NotImplementedError
        return cls.subclasses[_data_processor_type](metadata)

    @property
    def refined_data(self) -> Iterable:
        return self._refined_data

    @abc.abstractmethod
    def refine(self, entity) -> None:
        raise NotImplementedError

    @abc.abstractmethod
    def yield_refined_data(self) -> Iterable[ReportData]:
        raise NotImplementedError

    @abc.abstractmethod
    def get_status(self) -> Status:
        raise NotImplementedError
