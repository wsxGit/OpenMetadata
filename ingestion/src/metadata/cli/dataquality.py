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
Data quality utility for the metadata CLI
"""
import sys
import traceback
from pathlib import Path

from metadata.config.common import load_config_file
from metadata.utils.logger import cli_logger
from metadata.workflow.data_quality import TestSuiteWorkflow
from metadata.workflow.workflow_output_handler import (
    WorkflowType,
    print_init_error,
    print_status,
)

logger = cli_logger()


def run_test(config_path: Path) -> None:
    """
    Run the Data Quality Test Suites workflow from a config path
    to a JSON or YAML file
    :param config_path: Path to load JSON config
    """

    workflow_config_dict = None
    try:
        workflow_config_dict = load_config_file(config_path)
        logger.debug(f"Using config: {workflow_config_dict}")
        workflow = TestSuiteWorkflow.create(workflow_config_dict)
    except Exception as exc:
        logger.debug(traceback.format_exc())
        print_init_error(exc, workflow_config_dict, WorkflowType.TEST)
        sys.exit(1)

    workflow.execute()
    workflow.stop()
    print_status(workflow)
    workflow.raise_from_status()
