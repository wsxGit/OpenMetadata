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

import re
from collections import namedtuple
from typing import Generator, Iterable, Optional

from pydantic import ValidationError

from metadata.data_insight.processor.reports.data_processor import DataProcessor
from metadata.generated.schema.analytics.reportData import ReportData, ReportDataType
from metadata.generated.schema.analytics.reportDataType.webAnalyticEntityViewReportData import (
    WebAnalyticEntityViewReportData,
)
from metadata.generated.schema.analytics.reportDataType.webAnalyticUserActivityReportData import (
    WebAnalyticUserActivityReportData,
)
from metadata.generated.schema.analytics.webAnalyticEventData import (
    WebAnalyticEventData,
)
from metadata.generated.schema.entity.data import (
    chart,
    dashboard,
    database,
    databaseSchema,
    mlmodel,
    pipeline,
    table,
    topic,
)
from metadata.generated.schema.entity.teams.user import User
from metadata.ingestion.api.status import Status
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.utils.helpers import get_entity_tier_from_tags
from metadata.utils.logger import data_insight_logger
from metadata.utils.time_utils import (
    get_beginning_of_day_timestamp_mill,
    get_end_of_day_timestamp_mill,
)

logger = data_insight_logger()

LIMIT = 1000
ENTITIES = {
    "chart": chart.Chart,
    "dashboard": dashboard.Dashboard,
    "database": database.Database,
    "databaseSchema": databaseSchema.DatabaseSchema,
    "mlmodel": mlmodel.MlModel,
    "pipeline": pipeline.Pipeline,
    "table": table.Table,
    "topic": topic.Topic,
}

CACHED_EVENTS = []
START_TS = str(get_beginning_of_day_timestamp_mill(days=1))
END_TS = str(get_end_of_day_timestamp_mill(days=1))


class WebAnalyticEntityViewReportDataProcessor(DataProcessor):
    """Processor class used as a bridge to refine the data"""

    _data_processor_type = ReportDataType.webAnalyticEntityViewReportData.value

    def __init__(self, metadata: OpenMetadata):
        super().__init__(metadata)
        self.pre_hook = self._pre_hook_fn

    @property
    def name(self) -> str:
        return "Web Analytics Processor"

    def _pre_hook_fn(self):
        """Start our generator function"""
        # pylint: disable=attribute-defined-outside-init
        self.refine_entity_event = self._refine_entity_event()
        next(self.refine_entity_event)

    def _refine_entity_event(self) -> Generator[dict, WebAnalyticEventData, None]:
        """Coroutine to process entity web analytic event

        Yields:
            Generator[dict, WebAnalyticEventData, None]: _description_
        """
        refined_data = {}
        EntityObj = namedtuple("EntityObj", ["entity_type", "fqn"])

        while True:
            event = yield refined_data
            split_url = [url for url in event.eventData.url.root.split("/") if url]  # type: ignore

            if not split_url or split_url[0] not in ENTITIES:
                continue

            entity_obj = EntityObj(split_url[0], split_url[1])
            entity_type = entity_obj.entity_type
            re_pattern = re.compile(
                f"(.*{re.escape(entity_type)}/{re.escape(entity_obj.fqn)})"
            )

            if (
                entity_obj.fqn in refined_data
                and not refined_data[entity_obj.fqn]["entityHref"]
            ):
                # if we've seen the entity previously but were not able to get
                # the URL we'll try again from the new event.
                try:
                    entity_href = re.search(
                        re_pattern, event.eventData.fullUrl.root
                    ).group(1)
                    refined_data[entity_obj.fqn]["entityHref"] = entity_href
                except IndexError:
                    logger.debug(f"Could not find entity Href for {entity_obj.fqn}")

            if entity_obj.fqn not in refined_data:
                try:
                    entity = self.metadata.get_by_name(
                        ENTITIES[entity_obj.entity_type],
                        fqn=entity_obj.fqn,
                        fields=["*"],
                    )
                except ValidationError as exc:
                    entity = None
                    logger.warning("%s Entity failed to be parsed", entity_obj.fqn)
                    logger.debug(exc)

                if not entity:
                    # If a user visits an entity and then deletes this entity, we will try to get the entity
                    # object as we will have a reference to it in the web analytics events.
                    continue

                try:
                    tags = (
                        [tag.tagFQN.root for tag in entity.tags]
                        if entity.tags
                        else None
                    )
                    entity_tier = get_entity_tier_from_tags(entity.tags)
                except AttributeError as exc:
                    entity_tier = None
                    tags = None
                    logger.warning(
                        f"Attribute not supported for entity type {entity.__class__.__name__} -- {exc}"
                    )

                try:
                    owner = entity.owner.name if entity.owner else None
                    owner_id = str(entity.owner.id.root) if entity.owner else None
                except AttributeError as exc:
                    owner = None
                    owner_id = None
                    logger.warning(
                        f"Attribute not supported for entity type {entity.__class__.__name__} -- {exc}"
                    )
                    self.processor_status.warning(
                        entity.__class__.__name__,
                        "`tags` attribute not supported for entity type",
                    )

                try:
                    entity_href = re.search(
                        re_pattern, event.eventData.fullUrl.root
                    ).group(1)
                except IndexError:
                    entity_href = None

                if (
                    owner_id is not None
                    and event.eventData is not None
                    and owner_id == str(event.eventData.userId.root)
                ):  # type: ignore
                    # we won't count views if the owner is the one visiting
                    # the entity
                    continue

                refined_data[split_url[1]] = {
                    "entityType": ENTITIES[entity_type].__name__,
                    "entityTier": entity_tier,
                    "entityFqn": entity_obj.fqn,
                    "entityHref": entity_href,
                    "tagsFQN": tags,
                    "owner": owner,
                    "ownerId": owner_id,
                    "views": 1,
                }

            else:
                refined_data[split_url[1]]["views"] += 1

            self.processor_status.scanned(ENTITIES[entity_type].__name__)

    def yield_refined_data(self) -> Iterable[ReportData]:
        for data in self._refined_data:
            yield ReportData(
                timestamp=self.timestamp,
                reportDataType=ReportDataType.webAnalyticEntityViewReportData.value,
                data=WebAnalyticEntityViewReportData.model_validate(
                    self._refined_data[data]
                ),
            )  # type: ignore

    def refine(self, entity: WebAnalyticEventData):
        """Aggregates data. It will return a dictionary of the following shape

        {
            "user_id": {
                "<session_id>": [
                    {<event_data>},
                    {<event_data>},
                ],
                "<session_id>": [
                    {<event_data>},
                    {<event_data>},
                ]
            },
            ...
        }
        """
        self._refined_data = self.refine_entity_event.send(entity)

    def get_status(self) -> Status:
        return self.processor_status


class WebAnalyticUserActivityReportDataProcessor(DataProcessor):
    """Data processor for user scoped web analytic events"""

    _data_processor_type = ReportDataType.webAnalyticUserActivityReportData.value

    def __init__(self, metadata: OpenMetadata):
        super().__init__(metadata)
        self.pre_hook = self._pre_hook_fn
        self.post_hook = self._post_hook_fn

    def _pre_hook_fn(self):
        """Start our generator function"""
        # pylint: disable=attribute-defined-outside-init
        self.refine_user_event = self._refine_user_event()
        next(self.refine_user_event)

    def _post_hook_fn(self):
        """Post hook function"""
        for user_id in self._refined_data:
            session_metrics = self._compute_session_metrics(
                self._refined_data[user_id].pop("sessions")
            )
            self._refined_data[user_id] = {
                **self._refined_data[user_id],
                **session_metrics,
            }

    @staticmethod
    def _compute_session_metrics(sessions: dict[str, list]):
        """Compute the total session duration in seconds"""
        total_sessions = len(sessions)
        total_session_duration_seconds = 0
        for _, value in sessions.items():
            total_session_duration_seconds += (max(value) - min(value)) / 1000

        return {
            "totalSessions": total_sessions,
            "totalSessionDuration": int(total_session_duration_seconds),
        }

    def _get_user_details(self, user_id: str) -> dict:
        """Get user details from user id

        Returns:
            dict: _description_
        """

        try:
            user_entity: Optional[User] = self.metadata.get_by_id(
                User,
                user_id,
                fields=["teams"],
            )
        except Exception as exc:
            logger.warning(f"Could not get user details - {exc}")
            return {}

        if not user_entity:
            return {}

        teams = user_entity.teams
        return {
            "user_name": user_entity.name.root,
            "team": teams.root[0].name if teams else None,
        }

    def _refine_user_event(self) -> Generator[dict, WebAnalyticEventData, None]:
        """Coroutine to process user event from web analytic event

        Yields:
            Generator[dict, WebAnalyticEventData, None]: _description_
        """
        user_details = {}

        while True:
            event = yield self._refined_data

            user_id = str(event.eventData.userId.root)  # type: ignore
            session_id = str(event.eventData.sessionId.root)  # type: ignore
            timestamp = event.timestamp.root  # type: ignore

            if not user_details.get(user_id):
                user_details_data = self._get_user_details(user_id)
                user_details[user_id] = user_details_data

            if not self._refined_data.get(user_id):
                self._refined_data[user_id] = {
                    "userName": user_details[user_id].get("user_name"),
                    "userId": user_id,
                    "team": user_details[user_id].get("team"),
                    "sessions": {
                        session_id: [timestamp],
                    },
                    "totalPageView": 1,
                    "totalSessions": 1,
                    "lastSession": timestamp,
                }

            else:
                user_data = self._refined_data[user_id]
                if user_data["sessions"].get(session_id):
                    user_data["sessions"][session_id].append(timestamp)
                else:
                    user_data["sessions"][session_id] = [timestamp]
                    user_data["totalSessions"] += 1

                user_data["totalPageView"] += 1

                if timestamp > user_data["lastSession"]:
                    user_data["lastSession"] = timestamp

            self.processor_status.scanned(user_id)

    def fetch_data(self) -> Iterable[WebAnalyticEventData]:
        if CACHED_EVENTS:
            yield from CACHED_EVENTS
        else:
            CACHED_EVENTS.extend(
                self.metadata.list_entities(
                    entity=WebAnalyticEventData,
                    params={
                        "startTs": START_TS,
                        "endTs": END_TS,
                        "eventType": "PageView",
                    },
                ).entities
            )
            yield from CACHED_EVENTS

    def yield_refined_data(self) -> Iterable[ReportData]:
        """Yield refined data"""
        for user_id in self._refined_data:
            yield ReportData(
                timestamp=self.timestamp,
                reportDataType=ReportDataType.webAnalyticUserActivityReportData.value,
                data=WebAnalyticUserActivityReportData.model_validate(
                    self._refined_data[user_id]
                ),
            )  # type: ignore

    def refine(self, entity: WebAnalyticEventData) -> None:
        """Refine data"""
        self._refined_data = self.refine_user_event.send(entity)

    def get_status(self) -> Status:
        return self.processor_status
