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
This module defines the CLI commands for OpenMetadata
"""
import argparse
import logging
from enum import Enum
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from metadata.__version__ import get_metadata_version
from metadata.cli.app import run_app
from metadata.cli.dataquality import run_test
from metadata.cli.ingest import run_ingest
from metadata.cli.insight import run_insight
from metadata.cli.lineage import run_lineage
from metadata.cli.profile import run_profiler
from metadata.cli.usage import run_usage
from metadata.utils.logger import cli_logger, set_loggers_level

logger = cli_logger()


class MetadataCommands(Enum):
    INGEST = "ingest"
    USAGE = "usage"
    PROFILE = "profile"
    TEST = "test"
    WEBHOOK = "webhook"
    INSIGHT = "insight"
    LINEAGE = "lineage"
    APP = "app"


RUN_PATH_METHODS = {
    MetadataCommands.INGEST.value: run_ingest,
    MetadataCommands.USAGE.value: run_usage,
    MetadataCommands.LINEAGE.value: run_lineage,
    MetadataCommands.INSIGHT.value: run_insight,
    MetadataCommands.PROFILE.value: run_profiler,
    MetadataCommands.TEST.value: run_test,
    MetadataCommands.APP.value: run_app,
}


def create_common_config_parser_args(parser: argparse.ArgumentParser):
    parser.add_argument(
        "-c",
        "--config",
        help="path to the config file",
        type=Path,
        required=True,
    )


def webhook_args(parser: argparse.ArgumentParser):
    """
    Additional Parser Arguments for Webhook
    """
    parser.add_argument(
        "-H", "--host", help="Webserver Host", type=str, default="0.0.0.0"
    )
    parser.add_argument("-p", "--port", help="Webserver Port", type=int, default=8000)


def add_metadata_args(parser: argparse.ArgumentParser):
    """
    Additional Parser Arguments for Metadata
    """
    parser.add_argument(
        "-v", "--version", action="version", version=get_metadata_version()
    )

    parser.add_argument(
        "-l",
        "--log-level",
        choices=["INFO", "DEBUG", "WARNING", "ERROR", "CRITICAL"],
        help="Set Log Level",
    )


def get_parser(args=None):
    """
    Parser method that returns parsed_args
    """
    parser = argparse.ArgumentParser(prog="metadata", description="Ingestion Framework")
    sub_parser = parser.add_subparsers(dest="command")

    create_common_config_parser_args(
        sub_parser.add_parser(MetadataCommands.INGEST.value, help="Ingestion Workflow")
    )
    create_common_config_parser_args(
        sub_parser.add_parser(MetadataCommands.LINEAGE.value, help="Lineage Workflow")
    )
    create_common_config_parser_args(
        sub_parser.add_parser(
            MetadataCommands.USAGE.value,
            help="Workflow to check the query logs of a database service.",
        )
    )
    create_common_config_parser_args(
        sub_parser.add_parser(
            MetadataCommands.PROFILE.value,
            help="Workflow for profiling Table sources into Metadata",
        )
    )
    create_common_config_parser_args(
        sub_parser.add_parser(
            MetadataCommands.TEST.value, help="Workflow for running test suites"
        )
    )
    create_common_config_parser_args(
        sub_parser.add_parser(
            MetadataCommands.APP.value,
            help="Workflow for running external applications",
        )
    )
    webhook_args(
        sub_parser.add_parser(
            MetadataCommands.WEBHOOK.value,
            help="Simple Webserver to test webhook metadata events",
        )
    )
    create_common_config_parser_args(
        sub_parser.add_parser(
            MetadataCommands.INSIGHT.value, help="Data Insights Workflow"
        )
    )

    add_metadata_args(parser)
    parser.add_argument("--debug", help="Debug Mode", action="store_true")
    return parser.parse_args(args)


def metadata(args=None):
    """
    This method implements parsing of the arguments passed from CLI
    """
    contains_args = vars(get_parser(args))
    metadata_workflow = contains_args.get("command")
    config_file = contains_args.get("config")
    path = None
    if config_file:
        path = Path(config_file).expanduser()
    if contains_args.get("debug"):
        set_loggers_level(logging.DEBUG)
    elif contains_args.get("log_level"):
        set_loggers_level(contains_args.get("log_level"))
    else:
        set_loggers_level(logging.INFO)

    if metadata_workflow in RUN_PATH_METHODS:
        RUN_PATH_METHODS[metadata_workflow](path)

    if metadata_workflow == MetadataCommands.WEBHOOK.value:

        class WebhookHandler(BaseHTTPRequestHandler):
            def do_GET(self):  # pylint: disable=invalid-name
                self.send_response(200)
                self.send_header("Content-type", "text/html")
                self.end_headers()
                self.wfile.write(bytes("Hello, World! Here is a GET response", "utf8"))

            def do_POST(self):  # pylint: disable=invalid-name
                content_len = int(self.headers.get("Content-Length"))
                post_body = self.rfile.read(content_len)
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                logger.info(post_body)

        logger.info(
            f"Starting server at {contains_args.get('host')}:{contains_args.get('port')}"
        )
        with HTTPServer(
            (contains_args.get("host"), contains_args.get("port")), WebhookHandler
        ) as server:
            server.serve_forever()
