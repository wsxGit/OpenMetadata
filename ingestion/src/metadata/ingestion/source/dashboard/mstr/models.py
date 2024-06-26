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
MSTR Models
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class MstrOwner(BaseModel):
    """
    MSTR owner model
    """

    name: str
    id: str


class MstrProject(BaseModel):
    """
    MSTR project model
    """

    acg: int
    id: str
    name: str
    status: int
    alias: str
    description: str
    dateCreated: datetime
    dateModified: datetime
    owner: MstrOwner


class MstrProjectList(BaseModel):
    projects: Optional[List[MstrProject]] = None


class MstrSearchResult(BaseModel):
    """
    Mstr Search Results model
    """

    name: str
    id: str
    type: int
    description: Optional[str] = None
    subtype: int
    dateCreated: str
    dateModified: str
    version: str
    acg: int
    owner: MstrOwner
    extType: int
    viewMedia: int
    certifiedInfo: dict
    templateInfo: dict
    projectId: str


class MstrSearchResultList(BaseModel):
    results: Optional[List[MstrSearchResult]]


class MstrDashboard(BaseModel):
    """
    Mstr Dashboard model
    """

    name: str
    id: str
    type: int
    description: Optional[str] = None
    subtype: int
    dateCreated: str
    dateModified: str
    version: str
    acg: int
    owner: MstrOwner
    extType: int
    viewMedia: int
    certifiedInfo: dict
    templateInfo: dict
    projectId: str
    projectName: str


class MstrDashboardList(BaseModel):
    dashboards: Optional[List[MstrDashboard]] = None


class MstrAttribute(BaseModel):
    id: str
    type: int
    name: str


class MstrMetric(BaseModel):
    id: str
    type: int
    name: str


class MstrVisualization(BaseModel):
    key: str
    name: str
    visualizationType: str


class MstrPage(BaseModel):
    key: str
    name: str
    visualizations: List[MstrVisualization]


class MstrChapter(BaseModel):
    key: str
    name: str
    pages: List[MstrPage]


class MstrAvailableObject(BaseModel):
    id: str
    name: str
    type: str


class MstrDashboardDetails(BaseModel):
    id: str
    name: str
    projectId: str
    projectName: str
    currentChapter: str
    chapters: List[MstrChapter]
