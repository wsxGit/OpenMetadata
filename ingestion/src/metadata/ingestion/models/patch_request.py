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
Pydantic definition for storing entities for patching
"""
import json
import logging
import traceback
from typing import Dict, List, Optional, Tuple

import jsonpatch
from pydantic import BaseModel

from metadata.ingestion.api.models import Entity, T
from metadata.ingestion.ometa.mixins.patch_mixin_utils import PatchOperation
from metadata.ingestion.ometa.utils import model_str

logger = logging.getLogger("metadata")


class PatchRequest(BaseModel):
    """
    Store the original and new entities for patch
    """

    original_entity: Entity
    new_entity: Entity


class PatchedEntity(BaseModel):
    """
    Store the new entity after patch request
    """

    new_entity: Optional[Entity] = None


ALLOWED_COLUMN_FIELDS = {
    "name": True,
    "dataType": True,
    "arrayDataType": True,
    "description": True,
    "tags": True,
    "dataLength": True,
    "constraint": True,
    "children": True,
    "ordinalPosition": True,
    "precision": True,
    "scale": True,
    "dataTypeDisplay": True,
    "jsonSchema": True,
}

ALLOWED_TASK_FIELDS = {
    "name": True,
    "displayName": True,
    "sourceUrl": True,
    "downstreamTasks": True,
    "taskType": True,
    "taskSQL": True,
    "startDate": True,
    "endDate": True,
}

ALLOWED_ENTITY_REFERENCE_FIELDS = {"id": True, "type": True}

ALLOWED_CONTAINER_DATAMODEL_FIELDS = {
    "isPartitioned": True,
    "columns": {"__all__": ALLOWED_COLUMN_FIELDS},
}

ALLOWED_COMMON_PATCH_FIELDS = {
    # Common Entity Fields
    "name": True,
    "displayName": True,
    "sourceUrl": True,
    "description": True,
    "owner": True,
    "tags": True,
    "sourceHash": True,
    # Table Entity Fields
    "tableType": True,
    "columns": {"__all__": ALLOWED_COLUMN_FIELDS},
    "tableConstraints": True,
    "tablePartition": True,
    "location": True,
    "schemaDefinition": True,
    "sampleData": True,
    "fileFormat": True,
    # Stored Procedure Fields
    "storedProcedureCode": True,
    "code": True,
    # Dashboard Entity Fields
    "chartType": True,
    "project": True,
    "dashboardType": True,
    "charts": {"__all__": ALLOWED_ENTITY_REFERENCE_FIELDS},
    "dataModels": {"__all__": ALLOWED_ENTITY_REFERENCE_FIELDS},
    # Pipeline Entity Fields
    "concurrency": True,
    "pipelineLocation": True,
    "startDate": True,
    "scheduleInterval": True,
    "tasks": {"__all__": ALLOWED_TASK_FIELDS},
    # Topic Entity Fields
    "messageSchema": True,
    "partitions": True,
    "cleanupPolicies": True,
    "retentionTime": True,
    "replicationFactor": True,
    "maximumMessageSize": True,
    "minimumInSyncReplicas": True,
    "retentionSize": True,
    "topicConfig": True,
    # MlModel Entity Fields
    "algorithm": True,
    "mlFeatures": True,
    "mlHyperParameters": True,
    "target": True,
    "dashboard": ALLOWED_ENTITY_REFERENCE_FIELDS,
    "mlStore": True,
    "server": True,
    # SearchIndex Entity Fields
    "fields": {"__all__": ALLOWED_COLUMN_FIELDS},
    "searchIndexSettings": True,
    # Container Entity Fields
    "parent": ALLOWED_ENTITY_REFERENCE_FIELDS,
    "children": {"__all__": ALLOWED_ENTITY_REFERENCE_FIELDS},
    "dataModel": ALLOWED_CONTAINER_DATAMODEL_FIELDS,
    "prefix": True,
    "numberOfObjects": True,
    "size": True,
    "fileFormats": True,
}

RESTRICT_UPDATE_LIST = ["description", "tags", "owner"]

ARRAY_ENTITY_FIELDS = ["columns", "tasks", "fields"]


PathTuple = Tuple[str]


# For each 'replace to None' operation we will add a Remove operation at the end.
# This helps up prevent sending to the backend lists with None values for instance.
#
# Obs: The `replace to None` operations are created by the jsonpatch library.
#
# Example
# ----
# Initial:
# [
#   {"op": "replace", "path": "/path/1", "value": None},
#   {"op": "add",     "path": "/path/2", "value": "foo"},
# ]
#
# Final:
# [
#   {"op": "replace", "path": "/path/1", "value": None},
#   {"op": "add",     "path": "/path/2", "value": "foo"},
#   {"op": "remove",  "path": "/path/1"},
# ]
class ReplaceWithNoneOpFixer:
    """Responsible for creating the Remove operations that fix every
    Replace to None ones.

    It is important to keep the state of the index drift in order to
    create a working patch.

    Example:

        Initial:
        [
            {"op": "replace", "path": "/path/1", "value": None},
            {"op": "replace", "path": "/path/2", "value": None}
        ]

       Final:
        [
            {"op": "replace", "path": "/path/1", "value": None},
            {"op": "replace", "path": "/path/2", "value": None},
            {"op": "remove",  "path": "/path/1"},
            {"op": "remove",  "path": "/path/1"}
        ]

        Since the first Remove operation is relative to the first replace, there is no drift.
        When the second Remove operation happens however, the first one would have already been done.
        This means that '/path/2' becomes '/path/1'.
    """

    def __init__(self, index_drift_map: Dict[PathTuple, int]):
        self.index_drift_map = index_drift_map

    @classmethod
    def default(cls) -> "ReplaceWithNoneOpFixer":
        """Instantiates the ReplaceWithNoOpFixer with an empty drift map."""
        return cls(index_drift_map={})

    def _fix_index_drift(self, path: List[str]):
        """Modifies the incoming path depending on how many Remove operations we have already
        registered for this path."""

        # We check all the paths for which we already registered a Remove operation
        for drifted_path, drift in self.index_drift_map.items():
            # If any of them matches the start of the current path we update the index.
            if path[: len(drifted_path)] == list(drifted_path):
                try:
                    drift_location = len(drifted_path)
                    path[drift_location] = str(int(path[drift_location]) - drift)
                except ValueError:
                    # Not in a List. No need to fix the Path Index
                    continue
        return path

    def _update_index_drift_map(self, path: List[str]):
        """Update the dirft map with the seen path."""
        path_tuple: PathTuple = tuple(path[:-1])

        self.index_drift_map[path_tuple] = (
            self.index_drift_map.setdefault(path_tuple, 0) + 1
        )

    def _get_remove_operation(self, path: List[str]) -> Dict:
        """Return a JSONPatch Remove operation for the given path."""
        return {"op": PatchOperation.REMOVE.value, "path": "/".join(path)}

    def get_remove_operation(self, path: List[str]):
        """Returns a JSONPatch Remove operation for the given path
        while keeping in the state that we are sending a Remove operation
        for the given path."""
        fixed_path = self._fix_index_drift(path)

        self._update_index_drift_map(fixed_path)

        return self._get_remove_operation(fixed_path)


class JsonPatchUpdater:
    """Reponsible for applying any custom changes to the JSONPatch generated by the jsonpatch library."""

    def __init__(
        self,
        restrict_update_fields: List,
        replace_with_none_op_fixer: ReplaceWithNoneOpFixer,
    ):
        self.restrict_update_fields = restrict_update_fields
        self.replace_with_none_op_fixer = replace_with_none_op_fixer

    @classmethod
    def from_restrict_update_fields(
        cls, restrict_update_fields: List
    ) -> "JsonPatchUpdater":
        """Instantiates a JsonPatchUpdater based on the restric_update_fields"""
        return cls(
            restrict_update_fields=restrict_update_fields,
            replace_with_none_op_fixer=ReplaceWithNoneOpFixer.default(),
        )

    def _determine_restricted_operation(self, patch_ops: Dict) -> bool:
        """
        Only retain add operation for restrict_update_fields fields
        """
        path = patch_ops.get("path")
        ops = patch_ops.get("op")
        for field in self.restrict_update_fields or []:
            if field in path and ops != PatchOperation.ADD.value:
                return False
        return True

    def _is_replace_with_none_operation(self, patch_ops: dict) -> bool:
        """Check if the Operation is a Replace operation to a None value."""
        return (patch_ops.get("op") == PatchOperation.REPLACE.value) and (
            patch_ops.get("value") is None
        )

    def _get_remove_operation_for_replace_with_none(self, path: str) -> Dict:
        """Returns the Remove operation for the given Path. Used to fix the Replace to None operations."""
        return self.replace_with_none_op_fixer.get_remove_operation(path.split("/"))

    def update(self, patch: jsonpatch.JsonPatch) -> List:
        """Given a JSONPatch generated by the jsonpatch library, updates it based on our custom needs.
        1. Remove any restricted operations
        2. Fix any 'Replace to None' operation by adding a 'Remove' operation at the end.
        """
        patch_ops_list = []
        remove_ops_list = []

        for patch_ops in patch.patch or []:
            if self._determine_restricted_operation(patch_ops=patch_ops):
                patch_ops_list.append(patch_ops)

                if self._is_replace_with_none_operation(patch_ops):
                    remove_ops_list.append(
                        self._get_remove_operation_for_replace_with_none(
                            patch_ops["path"]
                        )
                    )

        patch_ops_list.extend(remove_ops_list)

        return patch_ops_list


def build_patch(
    source: T,
    destination: T,
    allowed_fields: Optional[Dict] = None,
    restrict_update_fields: Optional[List] = None,
    array_entity_fields: Optional[List] = None,
    remove_change_description: bool = True,
) -> Optional[jsonpatch.JsonPatch]:
    """
    Given an Entity type and Source entity and Destination entity,
    generate a JSON Patch and apply it.

    Args
        source: Source payload which is current state of the source in OpenMetadata
        destination: payload with changes applied to the source.
        allowed_fields: List of field names to filter from source and destination models
        restrict_update_fields: List of field names which will only support add operation

    Returns
        Updated Entity
    """
    try:
        # remove change descriptions from entities
        if remove_change_description:
            source = _remove_change_description(source)
            destination = _remove_change_description(destination)

        if array_entity_fields:
            _sort_array_entity_fields(
                source=source,
                destination=destination,
                array_entity_fields=array_entity_fields,
            )

        # Get the difference between source and destination
        if allowed_fields:
            patch = jsonpatch.make_patch(
                json.loads(
                    source.model_dump_json(
                        exclude_unset=True,
                        exclude_none=True,
                        include=allowed_fields,
                    )
                ),
                json.loads(
                    destination.model_dump_json(
                        exclude_unset=True,
                        exclude_none=True,
                        include=allowed_fields,
                    )
                ),
            )
        else:
            patch: jsonpatch.JsonPatch = jsonpatch.make_patch(
                json.loads(
                    source.model_dump_json(exclude_unset=True, exclude_none=True)
                ),
                json.loads(
                    destination.model_dump_json(exclude_unset=True, exclude_none=True)
                ),
            )
        if not patch:
            return None

        # For a user editable fields like descriptions, tags we only want to support "add" operation in patch
        # we will remove the other operations.
        if restrict_update_fields:
            updated_operations = JsonPatchUpdater.from_restrict_update_fields(
                restrict_update_fields
            ).update(patch)
            patch.patch = updated_operations

        return patch
    except Exception:
        logger.debug(traceback.format_exc())
        logger.warning("Couldn't build patch for Entity.")
        return None


def _sort_array_entity_fields(
    source: T,
    destination: T,
    array_entity_fields: Optional[List] = None,
):
    """
    Sort the array entity fields to make sure the order is consistent
    """
    for field in array_entity_fields or []:
        if hasattr(destination, field) and hasattr(source, field):
            destination_attributes = getattr(destination, field)
            source_attributes = getattr(source, field)

            # Create a dictionary of destination attributes for easy lookup
            destination_dict = {
                model_str(attr.name): attr for attr in destination_attributes
            }

            updated_attributes = []
            for source_attr in source_attributes or []:
                # Update the destination attribute with the source attribute
                destination_attr = destination_dict.get(model_str(source_attr.name))
                if destination_attr:
                    updated_attributes.append(
                        source_attr.copy(update=destination_attr.__dict__)
                    )
                    # Remove the updated attribute from the destination dictionary
                    del destination_dict[model_str(source_attr.name)]
                else:
                    updated_attributes.append(None)

            # Combine the updated attributes with the remaining destination attributes
            final_attributes = updated_attributes + list(destination_dict.values())
            setattr(destination, field, final_attributes)


def _remove_change_description(entity: T) -> T:
    """
    Remove change description if applies.
    We never want to patch that, and we won't have that information
    from the source. It's fully handled in the server.
    """
    if getattr(entity, "changeDescription"):
        entity.changeDescription = None

    return entity
