import time
from pprint import pprint
from typing import Tuple

import requests
from metadata.utils.logger import log_ansi_encoded_string
from requests.auth import HTTPBasicAuth


HEADER_JSON = {"Content-Type": "application/json"}
BASIC_AUTH = HTTPBasicAuth("admin", "admin")
REQUESTS_TIMEOUT = 60 * 5


def get_last_run_info() -> Tuple[str, str]:
    """
    Make sure we can pick up the latest run info
    """
    max_retries = 15
    retries = 0
    
    while retries < max_retries:
        log_ansi_encoded_string(message="Waiting for DAG Run data...")
        time.sleep(5)
        res = requests.get(
            "http://localhost:8080/api/v1/dags/sample_data/dagRuns", auth=BASIC_AUTH, timeout=REQUESTS_TIMEOUT
        )
        res.raise_for_status()
        runs = res.json()
        dag_runs = runs.get("dag_runs")
        if dag_runs[0].get("dag_run_id"):
            return dag_runs[0].get("dag_run_id"), "success"
        retries += 1
    return None, None


def print_last_run_logs() -> None:
    """
    Show the logs
    """
    logs = requests.get(
        "http://localhost:8080/api/v1/openmetadata/last_dag_logs?dag_id=sample_data&task_id=ingest_using_recipe",
        auth=BASIC_AUTH,
        timeout=REQUESTS_TIMEOUT
    ).text
    pprint(logs)


def main():
    max_retries = 15
    retries = 0

    while retries < max_retries:
        dag_run_id, state = get_last_run_info()
        if state == "success":
            print(f"DAG run: [{dag_run_id}, {state}]")
            print_last_run_logs()
            break
        else:
            print(
                "Waiting for sample data ingestion to be a success. We'll show some logs along the way.",
            )
            print(f"DAG run: [{dag_run_id}, {state}]")
            print_last_run_logs()
            time.sleep(10)
            retries += 1

    if retries == max_retries:
        raise Exception("Max retries exceeded. Sample data ingestion was not successful.")


if __name__ == "__main__":
    main()
