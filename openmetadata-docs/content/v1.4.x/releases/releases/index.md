---
title: All Releases
slug: /releases/all-releases
---

# Releases

{% note %}

The OpenMetadata community is on a monthly release cadence. At every 4-5 weeks we will be releasing a new
version. To see what's coming in next releases, please check our [Roadmap](/releases/roadmap) section.

{% /note %}

{% partial file="/v1.4/releases/latest.md" /%}

# 1.3.4 Release 🎉

{% note noteType="Tip" %}
**2024, May 12th**
{% /note %}

- Fixes reindex issues related to the `changeDescription` payload of some entities
- Adds Cypress tests to validate reindex app execution

# 1.3.3 Release 🎉

{% note noteType="Tip" %}
**2024, April 19th**
{% /note %}

- Fix Application installation
- Fix JWT Filter validation against personal token
- Add Databricks SSL python dependencies
- Fix postgres app migrations
- Improve App UI preview

**Full Changelog**: [link](https://github.com/open-metadata/OpenMetadata/compare/1.3.2-release...1.3.3-release)

# 1.3.2 Release

{% inlineCalloutContainer %}
{% inlineCallout
color="violet-70"
icon="celebration"
bold="Upgrade OpenMetadata"
href="/deployment/upgrade" %}
Learn how to upgrade your OpenMetadata instance to 1.3.3!
{% /inlineCallout %}
{% /inlineCalloutContainer %}

You can find the GitHub release [here](https://github.com/open-metadata/OpenMetadata/releases/tag/1.3.2-release).

## MetaPilot (Collate)
- New MetaPilot application shipped in preview mode. Try it out in the [Sandbox](https://sandbox.open-metadata.org/)!
- Get automatically generated descriptions with GenAI. Now it’s easier than ever to document your data assets.
- Chat with the MetaPilot and get SQL queries to help you extract relevant information from your data assets.
- Let the MetaPilot help you understand and improve the queries used on your tables.

## Authentication Flow
- Added generic support for OIDC Authentication. This is SSO provider-agnostic.
- You can now integrate Confidential Clients to manage the server authentication.
- Now, the session renewal happens automatically in the backend.

## Data Quality
- Pagination support was added for the Data Quality tab for data assets.
- Fixed an issue with execution summary timeout issue for the data quality test.

## Connectors
- New Bigtable connector.
- Now, users can configure the external sample data storage path.
- Added lineage support for Snowflake materialized view and masking policies.
- Fixed session invalidation on Databricks during long-running queries.
- Fixed Ingestion Pipeline list for services with the same name.
- Fixed an issue with ingesting lineage when data models are ingested from Tableau.
- Fixed metrics computations for empty tables.
- Improve PATCH generation for array fields.

## Other Changes
- Avoid creating duplicated queries.
- Speed up the server start time by moving the Secrets Manager Migration to the migration container.
- Fixed the issue with the date filter for the Incident Manager.
- Fixed the issue with the Team filter for Data Insights.
- Fixed an issue with Azure SSO related to the MSAL version.
- Fixed an issue with search indexing.
- Fixed the missing input field for conversation source for alerts and notifications.
- Filter dashboards by a project on the Explore page.
---

**Full Changelog**: [link](https://github.com/open-metadata/OpenMetadata/compare/1.3.1-release...1.3.2-release)

# 1.3.1 Release 🎉

{% note noteType="Tip" %}
**2024, February 29th**

You can find the GitHub release [here](https://github.com/open-metadata/OpenMetadata/releases/tag/1.3.1-release).
{% /note %}


## Knowledge Center (Collate)
- Supports drag and drop for the hierarchy of knowledge articles.
- Enhanced the layout and loading experience of the knowledge page.

## Lineage
- When adding a new node in Lineage, the Display Name is supported in search.
- Fixed the issues with displaying lineage from Metabase.

## Glossary
- Improved the automation of performance tests for Glossary.
- Performance improvements to display a large Glossary.

## Data Insights
- Data Insights report has been improved.
- The cost Analysis report has been optimized.

## Notifications
- The format for Slack notifications has been improved.

## Custom Properties
- Added enum type support for custom properties.

## Connectors
- Now BigQuery connector supports Primary, Foreign, and Unique Constraints. It fetches the column description for views.
- Captures the SQL query that powers a Tableau DataModel.
- Azure Key Vault is supported as a Secrets Manager.
- Fixed an issue with ingestion from Sagemaker, Oracle, LDAP, DB2, dbt, Kafka, Metabase, and Databricks.
- Fixed Looker projects and optional project filter patterns.
- Fixed issues with ingestion pipelines.
- Fixed an issue with the service display name after ingestion.

## Other Changes
- The functionality for mutually exclusive tags has been disabled.
- PodGC set up for Argo workflows to delete the pods from the Kubernetes environment on a successful run of the pods.
- Fixed the issue with the display of the personal access token.
- Fixed the mentions in comments for Announcements.
- Fixed the issue with setting a Group as a Domain Owner.
- Fixed the issue with the tooltip in the data quality graph.
- Fixed an issue about notifying the Reviewer of a Glossary Term.
- Fixed the issues with testing the email settings.
- Fixed an issue with adding tags.



# 1.3.0 Release

{% note noteType="Tip" %} 
**2024, February 5th**

[OpenMetadata 1.3 Release - Intuitive Lineage UI, Data Observability Alerts, Data Quality Incident Manager, Custom Metrics for Profiler, Knowledge Center Improvements, and lots more](https://blog.open-metadata.org/openmetadata-release-1-3-ac801834ee80)
{% /note %}

You can find the GitHub release [here](https://github.com/open-metadata/OpenMetadata/releases/tag/1.3.0-release).

{%  youtube videoId="cVYP1HFXeRM" start="0:00" end="4:49" width="560px" height="315px" /%}

## Lineage

{%  youtube videoId="grwhvTWylbw" start="0:00" end="1:43" width="560px" height="315px" /%}

- Revamped the lineage UI for an intuitive and comprehensive view of data flow and transformations.
- Organized nodes for better visibility with pagination support.
- Improved the display of circular dependencies.
- Nodes display the service icons, highlight dbt models, and show Data Quality results.
- Lineage can be filtered to search by Ownership, Domain, Service, Service Type, Tier, and Classification Tags.
- Supports search by Column and traces lineage even when the columns are renamed.
- Enhanced user control with collapsible sub-graphs.
- Supports editing the SQL queries for lineage edges from the UI.
- Performance improvements for faster load of large graphs.

## Data Observability Alerts

{%  youtube videoId="qc-3sZ_eU5Y" start="0:00" end="2:04" width="560px" height="315px" /%}

- Data observability alerts have been distinguished from other general-purpose notifications, making it easy to get to the crucial alerts quickly.
- Sends alerts for schema changes and test case failures for the data assets that you follow.
- The overall flow has been simplified to let you easily create alerts for schema changes in your data.
- You can now get Data Quality alerts for specific Test Suites.
- Users will be alerted for all the changes to the data assets that they own.

## Incident Manager

{%  youtube videoId="wz5vc1Al-b8" start="0:00" end="2:19" width="560px" height="315px" /%}

- Introduced Incidents Manager to improve the data quality resolution flow.
- Incidents Manager summarizes all the test case results with information about the failure severity and resolution flow.
- Supports assigning a resolution task to the users in OpenMetadata.
- Tasks are created when a data quality test has been assigned to an Assignee or a Reviewer.
- Resolved test failure also displays the comments posted on the resolution.
- The Resolved Tab displays information on the Test case name, Execution date, Reason, Comments, and information on who Resolved the issue.

## Knowledge Center (Collate)

{%  youtube videoId="atwTGm1hixg" start="0:00" end="1:22" width="560px" height="315px" /%}

- Supports hierarchical pages to structure the articles.
- You can easily associate knowledge articles with data assets.
- The data assets page displays the related articles.
- The block editor supports callouts to add notes, warnings, tables, and task lists.
- Quicklinks are no longer separate pages; they redirect to external links.
- Data assets can be associated with Quicklinks.
- Added Search support for Knowledge articles to filter by Owner or Tags.
- Supports preview for articles and Quicklinks.

## Custom Metrics for Profiler

{%  youtube videoId="1sx5aQKMSBI" start="0:00" end="1:52" width="560px" height="315px" /%}

- Supports custom metrics for the data profiler with custom SQL to keep track of your business metrics.
- Custom metrics can be created at Table and Column levels.

## Profiler and Data Quality
- The Profiler has been improved to support sample data ingestion without computing other metrics.
- Admins can configure the profiler to fetch up to 10,000 rows of sample data.
- Sample data can be stored in S3 buckets.
- Refined the default time range on the test case results page, adjusting it from the Last 3 days to the Last 30 days for a more encompassing view.

## Connectors
- New Google Cloud Storage for storage services. (Collate)
- New Alation connector to migrate metadata into Collate. (Collate)
- New Iceberg, SAS Viya, and Doris connectors.
- Introduced the Spark Lineage Agent to extract metadata and end-to-end lineage from Spark jobs.
- MSSQL and Oracle now support Stored Procedures.
- We now exclude system indices from the Elasticsearch connector by default.
- Added support for DB2 IBM I Series.
- Pipeline services now get owner information.
- Performance improvements for the Tableau Connector.
- We now support metadata tag extraction from Databricks.
- Supports the attribute Table Owner for metadata ingestion from Postgres.
- We now extract table descriptions when ingesting metadata from Salesforce.

## Glossary
- Supports soft delete for the default glossaries in OpenMetadata.
- Supports the creation of tasks to request tags or a description.
- Only the Owner can edit the Glossary term.
- Version history displays the Username instead of the User ID.

## Localization

{%  youtube videoId="MCjK6fZg3pw" start="0:00" end="0:36" width="560px" height="315px" /%}

- Now supports RTL UI for the Hebrew language.
- New Dutch language translation.

## Settings UI

{%  youtube videoId="qE07HNFXyu8" start="0:00" end="0:48" width="560px" height="315px" /%}

- The Settings page UI has been revamped.

## Data Insights
- Cost Analysis expanded to support BigQuery & Redshift. (Collate)
- Improved the Data Insights Report sent via email.

## Other Changes
- Announcements can be notified over email, Slack, or Teams.
- Alerts are sent to a user when they are mentioned in a task or activity feed.
- We have improved the display of search results for column matches. When searching for columns, the matched results will be displayed and highlighted in the Preview pane.
- Table Type filter has been added in the Advanced Search, so that users can exclude the temporary or staging tables from search.
- Now it is easy to filter the Data assets without a Owner.
- Database and Schema were added to the Explore menu to enhance data discovery.
- Custom properties are displayed on the right of the data asset details page.
- We now display the Domain on the Users page.
- Supports the sorting of data assets by popularity based on the number of followers and thumbs up as signals.
- OpenMetadata can now handle metric history for ML models.
- When configuring the Email settings, the Username and Password fields can be left blank.
- We now support a test email button on the Email SMTP page.

# 1.2.0 Release

{% note noteType="Tip" %} 
**2023, October 26th**

[OpenMetadata 1.2 Release - Domains, Data Products, Search Index, Stored Procedures, Glossary Approval Workflow, Customizable Landing Page, Applications, Knowledge Center, Cost Analysis, and lots more](https://blog.open-metadata.org/openmetadata-release-1-2-531f0e3c6d9a)
{% /note %}

{%  youtube videoId="Mu7eq6OVtxk" start="0:00" end="3:29" width="560px" height="315px" /%}

## Domains and Data Products

{%  youtube videoId="t-9G3vaSdjI" start="0:00" end="1:21" width="560px" height="315px" /%}

{%  youtube videoId="6NgI_G38D0A" start="0:00" end="0:54" width="560px" height="315px" /%}

- Added support for Domains and Data Products.
- Assets can be added to a Domain, and users can scope their discovery experience to one Domain.
- Assets can also be added as Data Products in a Domain.

## Search Index
- Elasticsearch or Opensearch connectors can now bring in the search index metadata into OpenMetadata.
- The connector will populate the index’s mapping, settings, and sample data.

## Stored Procedures
- Added support for Stored Procedures.
- Snowflake, Redshift, and BigQuery connectors are updated to bring stored procedure metadata into OpenMetadata.
- The metadata workflow will bring the Stored Procedures and parse their executions to extract lineage information.

## Glossary Approval Workflow & Glossary Styling

{%  youtube videoId="PgTcKQtpAks" start="0:00" end="2:51" width="560px" height="315px" /%}

- Introduced a glossary approval workflow. An approval workflow is created if Reviewers are added to a glossary.
- A task is added for reviewers to approve or reject the glossary term. The terms will show up in Draft status.
- Only the reviewers can approve or reject the term.
- Conversations are supported to discuss further about the terms.
- If no reviewer is added, then the glossary terms are approved by default.
- Introduced styling for glossary terms. Now you can add icons and color code the glossary terms for easy identification.
- Color coding helps to visually differentiate and identify the data assets, when glossary terms are added to them.

## OpenMetadata Browser Extension
- Updated the Chrome browser extension for OpenMetadata with the new UI.
- Added support for Databases, Database Schemas, Tables, Dashboards, Charts,  Pipelines, and Topics.

## Build Automation Applications

{%  youtube videoId="pUS9-RevqsU" start="0:00" end="0:57" width="560px" height="315px" /%}

- Added Applications into OpenMetadata, giving users a unique view of processes that can be scheduled and run in the platform.
- Search Indexing and Data Insights Report have been converted into Applications.
- UI displays all the available applications, which Admins can add or schedule.
- We will continue to add new Applications in upcoming releases.

## Lineage
- Performance improvements made for lineage based on the new release of SQLfluff.
- Added support for `UPDATE … FROM Snowflake` queries
- Added column-level lineage support for `SELECT *` queries

## Connectors
- Greenplum connector is now supported.
- Couchbase connector is now supported.
- Azure Data Lake Storage is now supported. (Collate)

## Customizable Landing Page

{%  youtube videoId="Y-5cPQgzNdo" start="0:00" end="2:08" width="560px" height="315px" /%}

- Admins can create Personas to group individuals in their company, such as Data Engineers, Data Stewards, or Data Scientists.
- Admins can customize the landing page for each Persona with a set of supported widgets: Activity Feed, Announcements, Knowledge Center, etc.
- We will add support for more widgets in upcoming releases.

## Knowledge Center (Collate)

{%  youtube videoId="DfOgeZ9f7no" start="0:00" end="3:04" width="560px" height="315px" /%}

- Backend APIs support creating, editing, and listing knowledge articles (with external links).
- Knowledge articles and links can be associated with a Domain, Team, or an Entity.
- UI support to build a Knowledge Center and expand the documentation of your company.

## Cost Analysis Report (Collate)

{%  youtube videoId="KI58oBHxTOU" start="0:00" end="0:33" width="560px" height="315px" /%}

- The Usage Workflow will now also track how tables are Accessed and Updated.
- This information will be used in the Data Insights workflow to show the evolution of your used and unused assets and compare them by size.
- Support has been added for Snowflake, and we will continue to add more sources in upcoming releases.

# 1.1.2 Release

{% note noteType="Tip" %} 
**2023, August 24th**
{% /note %}

## Data Quality
- Added support for Postgres version 11.19.
- Fixed MariaDB time column issues.

## Connectors
- Added JWT authentication support for Trino.
- Fixed Snowflake connection test.
- Fixed SageMaker ingestion.
- Added external table support for BigQuery.

## UI Improvements
- Added Russian language support.
- Supports Delete functionality for sample data.
- Improved Schema page UX.
- Table mentions now show Service, Schema and Database information.
- Fixed the version history list.

## Ingestion
- Improved performance when ingesting table constraints.

## Backend
- Improved Glossary import validations.
- Fixed Test Suite migrations and naming.
- Fixed Classification migration.
- Deprecated Flyway and using native migrations.
- Improved Test Suite UI performance.

# 1.1.1 Release

{% note noteType="Tip" %} 
**2023, August 7th**
{% /note %}

## UI Improvements

- User profile page UI / UX improvements
- Superset Connection fixes for Basic and IAM auth type
- Fix task flow bugs
- UI / UX improvements for Service, Database, and Schema pages.
- Support custom cron for schedule ingestion

## Data Quality
- Fix BigQuery, MSSQL, and Clickhouse profiling errors

## Ingestion
- Fixed Airflow lineage extraction.
- Added support for Databricks complex columns comments.
- Fixed Athena lineage and usage parameter validation.
- Airflow Managed APIs now support Airflow 2.6

## Connectors
- New [Qliksense](qlik.com) Connector.
- Hive supports extracting metadata directly from the metastore to speed up the execution. Users whose metastore is not exposed can still run the extraction pointing to Hive.
- Added Usage & Lineage connector for Trino.
- Impala scheme has been deprecated from Hive connector. Users can use the Impala connector instead.
- Snowflake can now ingest TRANSIENT tables.
- Added support for JSON fields in SingleStore.

## Backend
- Bumped table and column names length
- Aggregation Improvements for Search
- Test Suite Improvements


# 1.1.0 Release

{% note noteType="Tip" %} 
**2023, June 30th**

[OpenMetadata 1.1.0 Release - UI Overhaul, New Connectors, Improved Lineage Parsing, PII Masking, and lots more](https://blog.open-metadata.org/openmetadata-1-1-0-release-97c1fb603bcf)
{% /note %}

## UI Improvements

- Simplified Landing Page to make the adoption easier for new users. We’ll keep iterating on improving UX for first-time users.
- Simplified Explore view with improved asset details section. The filtering left panel is now part of the filtering selection at the top.
- Lineage View now supports column pagination and filtering.
- Views show their DDL on the Table details page.

## Data Quality

- Redesigned [Data Quality Tests](https://github.com/open-metadata/OpenMetadata/issues/11592) to improve the end-user experience and prevent unnecessary duplication of tests.
- Data Quality Tests now have a **Resolution** Field. Users can acknowledge any errors, and once failures are resolved, they can document the resolution directly in the OpenMetadata UI.
- Fixed a large number of connections being opened by the profiler workflow.
- Improved Customer SQL test to allow users to set a threshold for the expected number of rows to be returned
- Allow multi project for BigQuery profiler
- Fetch table metrics from system tables when information is available
- Improved Snowflake Profiling performance of System Metrics.

## Ingestion

- Improved [SQL Lineage Parsing](https://github.com/open-metadata/OpenMetadata/issues/7427). We continue to share the OSS love by contributing to [sqllineage](https://github.com/reata/sqllineage) and [sqlfluff](https://sqlfluff.com/), the base libraries for our lineage features.
- Improved LookML metadata ingestion, with added support for projects based on Bitbucket.
- dbt bug fixes, added support for database, schema and table filtering and lineage management for ephemeral models.
- PowerBI metadata ingestion now supports Reports and Dataset lineage from multiple workspaces.
- Improved Tableau Data Models ingestion now ingests Data Sources.
- AWS Glue support for Partition Column Details.
- New Oracle lineage and usage workflows based on the query history.
- IAM role-based authentication for MySQL and Postgres RDS databases.
- Fixed dashboard description wrongly reported description as completed in the Data Insight

## Connectors

- New [Spline](https://absaoss.github.io/spline/) Connector to extract metadata and lineage from Spark jobs. Regardless of where the Spark execution happens, if you have configured the Spline Agent, we can send Spark metadata to OpenMetadata.
- New [SAP Hana](https://www.sap.com/products/technology-platform/hana/what-is-sap-hana.html) Connector, our first integration to the SAP ecosystem.
- New [MongoDB](https://www.mongodb.com/) Connector, extracting Collections as Tables.
- Added support for [Databricks Unity Catalog](https://www.databricks.com/product/unity-catalog) for metadata and lineage extraction. If your Databricks instance supports the Unity Catalog, you can enable it in the Connection Details section to use this metadata extraction method instead of getting metadata out of the metastore and history APIs.

## Backend

- PII masking of Sample data for Tables and Topics, Profiler Metrics, Test Cases, and Queries for users that are not admins or owners of the assets. In 1.2, we’ll iterate on this logic to add Roles & Policies support for masking PII data.
- Name and FQN hashing of data in the database. This reduces the length of the data being stored and indexed, allowing us for longer FQNs in the Metadata Standard.
- Improved monitoring of the Pipeline Service Client health. Any status errors between the OpenMetadata server and the Pipeline Service Client are now surfaced in a Prometheus metric `pipelineServiceClientStatus_counter_total`
- Added AWS OpenSearch client-specific support. This allows us to update the Elasticsearch version support up to 7.16.


# 1.0.0 Release

{% note noteType="Tip" %} 
**2023, April 25th**

[OpenMetadata 1.0 Release - Improved Schemas & APIs, Ingestion Improvements, Storage Services, Dashboard Data Models, Auto PII Classification, Localization, and much more](https://blog.open-metadata.org/openmetadata-1-0-release-beb34762d916)
{% /note %}

## APIs & Schema
- **Stabilized** and improved the Schemas and APIs.
- The APIs are **backward compatible**.

## Ingestion
- Connecting to your data sources has never been easier. Find all the necessary **permissions** and **connection details** directly in the UI.
- When testing the connection, we now have a comprehensive list of **validations** to let you know which pieces of metadata can be extracted with the provided configuration.
- **Performance** improvements when extracting metadata from sources such as Snowflake, Redshift, Postgres, and dbt.
- New **Apache Impala** connector.

## Storage Services
- Based on your [feedback](https://github.com/open-metadata/OpenMetadata/discussions/8124), we created a new service to extract metadata from your **cloud storage**.
- The Data Lake connector ingested one table per file, which covered only some of the use cases in a Data Platform. With **Storage Services**, you can now present accurate metadata from your tables, even when **partitioned**.
- The first implementation has been done on **S3**, and we will keep adding support for other sources in the upcoming releases.

## Dashboard Data Models
- Dashboard Services now support the concept of **Data Models**: data that can be directly defined and managed in the Dashboard tooling itself, e.g., LookML models in Looker.
- Data Models will help us close the gap between engineering and business by providing all the necessary metadata from sources typically used and managed by analysts or business users.
- The first implementation has been done for **Tableau** and **Looker**.

## Queries
- Improved UI for **SQL Queries**, with faster loading times and allowing users to **vote** for popular queries!
- Users can now create and share a **Query** directly from the UI, linking it to multiple tables if needed.

## Localization
- In 1.0, we have added **Localization** support for OpenMetadata.
- Now you can use OpenMetadata in **English**, **French**, **Chinese**, **Japanese**, **Portuguese**, and **Spanish**.

## Glossary
- New and Improved **Glossary UI**
- Easily search for Glossaries and any Glossary Term directly in the **global search**.
- Instead of searching and tagging their assets individually, users can add Glossary Terms to multiple **assets** from the Glossary UI.

## Auto PII Classification
- Implemented an automated way to **tag PII data**.
- The auto-classification is an optional step of the **Profiler** workflow. We will analyze the column names, and if sample data is being ingested, we will run NLP models on top of it.

## Search
- **Improved Relevancy**, with added support for partial matches.
- **Improved Ranking**, with most used or higher Tier assets at the top of the search.
- Support for **Classifications** and **Glossaries** in the global search.

## Security
- **SAML** support has been added.
- Added option to mask passwords in the API response except for the `ingestion-bot` by setting the environment variable `MASK_PASSWORDS_API=true`. More info [here](/deployment/security/enable-password-masking).
- **Deprecation Notice**: **SSO** Service accounts for Bots will be deprecated. **JWT** authentication will be the preferred method for creating Bots.

## Lineage
- Enhanced Lineage UI to display a large number of **nodes (1000+)**.
- Improved UI for **better navigation**.
- Improved **SQL parser** to extract lineage in the Lineage Workflows.

## Chrome Browser Extension
- All the metadata is at your fingertips while browsing Looker, Superset, etc., with the OpenMetadata Chrome Browser Extension.
- **Chrome extension** supports Google SSO, Azure SSO, Okta, and AWS Cognito authentication.
- You can Install the Chrome extension from **Chrome Web Store**.

## Other Changes
- The **Explore page** cards will now display a maximum of **ten tags**.
- **Entity names** support apostrophes.
- The **Summary panel** has been improved to be consistent across the UI.

# 0.13.3 Release

{% note noteType="Tip" %} 
**2023, March 30th**
{% /note %}

## Ingestion Framework
- Datalake Avro & Json, JsonZip support
- BigQuery Profiler Ingestion for all regions
- Support for Snowflake Geometry Type
- Add support Nifi client certificate Auth
- Update `sqllineage-openmetadata` + add timeout for parsing queries
- Fixes issue in Snowflake Join Table query parsing
- Optimize Memory Usage for Usage data ingestion
- Fetch vertica schema comments as description
- Improve snowflake system metrics
- Add Database & Schema descriptions from Snowflake
- Add support XLets in Airflow Lineage Runner
- Add support for `AssumeRole` in AWS
- Add support for `pyimpala`
- Fixed issues in DBT oracle
- Support for Tableau Owner
- Support for DBT manifest V8

## Roles & Policies
- A Non-Privileged user can add new 'Roles' to Teams
- Fix Permissions API to consider the leaf nodes tags as well, example: table's column tags

## Search
- Improve Search Relevancy, by adding functional scoring and add ngram analyzer;
- Enable search for entities using both name and displayName

## Security
- Enable LDAP configuration to be configured via environment variable
- LDAP-s support connection without MTLS

## EntityName
- Relax data asset name restrictions to allow the special characters except "::"
- Allow unicode character and digits in Entity

## Data Quality
- Fix column values between test

# 0.13.2 Release

{% note noteType="Tip" %} 
**2023, January 30th**

[OpenMetadata 0.13.2 Release - Improved SQL Lineage, Glossary Bulk Upload, Unified Tag Category API, Mutually Exclusive Tags, Chrome Extension, and lots more](https://blog.open-metadata.org/openmetadata-0-13-2-release-e32c0de93361)
{% /note %}

## Improved SQL Lineage
- We have collaborated with the [sqllineage](https://github.com/reata/sqllineage) and [sqlfluff](https://www.sqlfluff.com/) communities
    to improve the parsing capabilities of `sqllineage`. We'll continue to collaborate to ship further improvements in new releases.

## New Glossary UI
- Moved from a tree view in the left panel to an easy to navigate list of the terms sorted alphabetically.
- The term list shows the tags and descriptions in the cards.

## Glossary Import & Export
- You can now export your Glossary data as a CSV file.
- In the same way, you can now bulk upload terms to a Glossary by adding their details in a CSV file.
- The import utility will validate the file and show you a preview of the elements that are going to be imported to OpenMetadata.

## Unified Tag Category API
- Renamed Tag Categories to Classification, a more widely used term.
- Updated the API to conform with the rest of the specification. More info [here](https://github.com/open-metadata/OpenMetadata/issues/9259).

## Mutually Exclusive Tags
- When creating a Classification or a Glossary term, you can now make the tags to be mutually exclusive.
- If tags are set to be mutually exclusive, you won't be able to set multiple tags from the same category in the same asset.

## EntityName
- Special characters

## Ingestion Framework
- Performance Improvements: We are now getting descriptions in batch, making connectors such as Redshift or Snowflake way faster!
- The Oracle connector now ships with the Thick mode enabled.
- AWS QuickSight fixes
- DB2 constraints and profiler improvements
- Added support for Postgres Foreign Tables
- Added support for Datalake profiler row-based sampling

# 0.13.1 Release

{% note noteType="Tip" %} 
**2022, December 20th**
{% /note %}

## Profiler and Data Quality
- Freshness Metric has been introduced. Data freshness shows DML operations performed against a table and the number of rows affected. All this is displayed within the data profiler with filterable graphs. This is currently supported for BigQuery, Snowflake, and Redshift.
- Support has been added for data quality tests on Data Lake.
- UI has been improved to show table and column profile data on separate page. Legend is now selectable to filter for specific metrics

## Alerts and Notification
The logic for Notification Support has been improved. Users can define Alerts based on a Trigger (all data assets or a specific entity), Filters (events to consider), and Action (Slack, MS Teams, Email, Webhook) on where to send the alert.

## Ingestion
- Now, dbt has its own workflow. Previously, dbt  was a part of metadata ingestion workflow.
- Airflow Lineage Operator and the OpenMetadata Hook are now part of the ingestion package. Send Airflow metadata from your DAGs and safely store the OpenMetadata server connection directly in Airflow.
- Multiple Databases (catalog) is now supported for the Databricks connector
- Azure blob is now supported to backup your metadata into

## New Connectors
- OpenMetadata now supports Azure Datalake Storage Gen 2

## General Improvements
- Users can update the description and tags for Topic Schema. Previously, the topic schemas were read-only. We now support Avro/Protobuf parsing and field level details for topic schemas.
- The layout for the Data Insight  Report has been improved. We now display a line graph instead of a bar graph. The Most Viewed Data Assets are clickable to view the asset details page.
- Improvements have been made to Advanced Search. Now, when a filter is applied, the details of the filter selected are displayed for clarity.
- On the Explore page UI, the Side Preview is now available for all data assets. Previously it was only displayed for tables.

# 0.13.0 Release

{% note noteType="Tip" %} 
**2022, December 8th**

[OpenMetadata 0.13.0 Release — Data Insights & KPIs, Lineage Traceability, Data Lake Profiler, Search Improvements, and lots more](https://blog.open-metadata.org/openmetadata-0-13-0-release-ac8ac5bd87c1)
{% /note %}

{%  youtube videoId="oNbMnTW5AkE" start="0:00" end="7:51" width="560px" height="315px" /%}

## Data Insights and KPI
Data Insight allows admins to take an active approach in their metadata management. Data Insight provides a single-pane view of all the key metrics to best reflect the state of your data. Admins can define the Key Performance Indicators (KPIs) and set goals within OpenMetadata to work towards better documentation, ownership, and tiering. Alerts can be set against the KPIs to be received on a specified schedule.

## Lineage
The lineage UI has been transformed to enhance user experience. Users can get a holistic view of an entity from the Lineage tab. When an entity is selected, the UI displays end-to-end lineage traceability for the table and column levels.

## Profiler
With the OpenMetadata UI, users can now create and deploy profiling workflows for the Datalake connector, which supports AWS S3 and GCS

## SSO
Support for LDAP SSO has been added in this release

## Advance Search
Syntax Editor has been introduced for advanced search with And/Or conditions that help discover assets quickly

## New Connectors
- AWS SageMaker
- AWS QuickSight
- AWS Kinesis
- Domo

## Messaging Service Schemas Improvements
Major enhancements have been made to how data is extracted from Kafka and Redpanda Messaging services. Previously, OpenMetadata extracted all the Topics in the messaging queue and also connected to the Schema Registry to get the Schemas. These schemas were taken as one payload and published to OpenMetadata. We now parse Avro and Protobuf Schemas to extract the fields. Now, users can document each of these fields within a schema by adding descriptions and tags. Users can search based on the fields in the Schema of a Topic.

## General Improvements
- Soft deleted entities can be restored. Currently, only the ML Models are not supported.
- Soft deleted teams can be restored. When restoring a soft deleted parent team, the child teams will not be restored by default.

# 0.12.3 Release

{% note noteType="Tip" %} 
**2022, November 18th**
{% /note %}

## Bug Fixes
- User suggestion index mapping
- Tag and Glossary terms caching

# 0.12.2 Release

{% note noteType="Tip" %} 
**2022, October 20th**
{% /note %}

## Ingestion
- Databricks lineage
- Added support for Airflow version 2.2.2 as a workflow scheduler
## Bug Fixes
- Support same table across different databases for the profiler

# 0.12.1 Release

{% note noteType="Tip" %} 
**2022, October 3rd**
{% /note %}

## Basic Authentication

- User/Password signup and login
- Email notifications for forgotten password and new user signed up
- Admin can add new users and send an email 

## ElasticSearch full re-index through UI

- Now admins can full re-index elasticsearch through the UI itself

## Versioning Support for Custom Attributes

- Any changes to entity custom attributes are now versioned

## DBT Metadata - Tags

- We support ingesting DBT tags into OpenMetadata

## Bots Integration 

- Admins can create bots and their security mechanism from UI itself

## Bug Fixes

- Around 136 Features/Improvements/Tests made it into 0.12.1 release 

# 0.12.0 Release

{% note noteType="Tip" %} 
**2022, September 7th**

[OpenMetadata 0.12.0 Release](https://blog.open-metadata.org/openmetadata-0-12-0-release-1ac059700de4)
{% /note %}

{%  youtube videoId="tv3pyCLcJfQ" start="0:00" end="17:04" width="560px" height="315px" /%}

## Team Hierarchy
Prior releases supported a flat hierarchy of just Teams and Users. In 0.12, support has been added for the entire organizational hierarchy with Business Unit, Division, Department, and Groups. An organization from small to very large can now be modeled in OpenMetadata with this feature.

## Roles and Policies

Access Control functionality has been revamped to support many use cases that were not possible before. Previously, a Role contained a single Policy, which consisted of simple Rules to Allow/Not Allow. The advanced rule configuration in the 0.12 release allows users to build more expressive rules using conditions.

- A Role is a collection of Policies. Roles can be assigned to users or teams where all the users in the team inherit the team roles.
- A Policy is a collection of Rules. A Policy can be reused as it can be part of a Role or can be directly assigned to Teams.
- A Rule is defined by a set of Resources, a set of Operations, an Effect to either Deny or Allow the operation, and a condition written as SpEL expression to add additional conditions based on metadata attributes. Examples of conditions — isOwner(), noOwner() && !matchTags('PII').

## Data Quality and Data Profiler

OpenMetadata began support for Data Quality in the 0.10 release, and support was added for publishing Great Expectations results in the 0.11 release. Our goal with OpenMetadata is to define metadata standards for all things data and in this release, we are standardizing Tests and Data Quality metadata. Data Quality Tests can be expressed in JSON schema and now these tests can be added dynamically using the Test Definitions API. We have also added a custom SQL data quality test that allows you to write your data quality tests using SQL statements.

An interactive dashboard helps to visualize and explore the data from the Data Profiler. You can explore how your data is changing over time, and identify data drifts using this dashboard. You can also see how data quality is changing by looking at how tests are doing over time. What is even better is, that you can explore this at both the table level or drill down to each column level going back up to 60 days.

The UI supports the detailed exploration of data quality tests, and users can drill down for the details of the test results present in a time series fashion. Tests can be added easily from the Profiler tab in the UI, both at the Table and Column levels. The UI provides a one-glance update on the metrics with a summary of data quality at the Table and Column levels.

## Announcements

Informing users about upcoming changes to the data is a big challenge. In most organizations, a team sends an email well in advance about the change. But no one reads/tracks them and finally, when the change is done, many users are unprepared to handle it.

With Announcements, you can now inform your entire team of all the upcoming events and changes, such as deprecation, deletion, or schema changes. These announcements can be scheduled with a start date and an end date. All the users following your data are not only notified in Activity Feeds but a banner is also shown on the data asset details page for users to discover (or be reminded of) the announcement.

## Activity Feed Notifications

In 0.12, we’ve also streamlined the Notifications menu with two separate tabs for Tasks and Mentions, that’ll display only the recent notifications. You can always navigate to your User Profile page to view more activities.

## Slack & Microsoft Teams integration

Users can get timely updates about the metadata change events for all entities through APIs using webhooks. The webhook integration with Slack has been further improved in this release.

OpenMetadata also supports webhook integration to Microsoft Teams, just as it supports Slack. Users can choose to receive notifications for only the required entities by using event filters based on when an entity is created, updated, or deleted. 

## Tasks

In the 0.11 release, a request to add or update descriptions for data assets could be converted to a Task. In the 0.12 release, Tasks can be created based on requests to create or update tags. Also, a glossary term approval workflow can be converted to a Task.


## Secret Management Store Interface

In 0.12, we have completely revamped how that secret is stored, accessed, and by whom; by introducing a Secrets Manager Interface to communicate with any Key Management Store. The KMS will mediate between any OpenMetadata internal requirement and sensitive information. That way, users can choose to use the underlying database as KMS, or any external system. The OpenMetadata community has already added support for AWS Key Management Service and AWS SSM.

## Connectors
New connectors are an essential part of every release in OpenMetadata. We are introducing four new connectors in this release:

- Redpanda is a Kafka API-compatible streaming data platform for developers that unifies historical and real-time data. OpenMetadata now supports Redpanda as a Messaging service, which allows users to document its topics and schemas. Refer to the Redpanda documentation for more info.
- Dagster is a new-generation Python-based orchestrator that’s designed for developing and maintaining data assets, such as tables, data sets, machine learning models, and reports. It has been added as part of OpenMetadata’s pipeline connectors. Read more from the Dagster documentation.
- Fivetran delivers ready-to-use connectors that automatically adapt as schemas and APIs change, ensuring consistent, reliable access to data. It has been added as a pipeline service. For more information, refer to the Fivetran documentation.
- Apache NiFi automates the flow of data between systems. OpenMetadata now supports a NiFi connector as the third new pipeline service on this release.

## Lineage
We’ve enhanced the performance of workflows by having a separate workflow for Lineage and Usage. By using two workflows for computing specific pieces of information, we can effectively filter down the queries to extract lineage.

During table usage ingestion, the tables retrieved successfully will be cached, so that there is no need to repeat the same calls multiple times as many queries would be referencing the same tables.
Usage queries have been optimized.
A result limit has been added to Usage queries.

## Global Settings
The OpenMetadata Settings dropdown menu has been transformed into a single, centralized Settings page for added convenience in viewing all the available options. The Global Settings comprises setting options for Team Members, Access based on Roles and Policies, Services, Data Quality, Collaboration, Custom Attributes, and Integrations for webhooks and bots. Admins can view or update settings for various services like Slack, MS Teams, Webhooks, etc from the Global Settings page.


## UI/UX Improvements
The major UI UX improvements have been done around Roles and Policies and a Global Settings page. Quite a lot of tweaks have been made to the UI to improve the UX.

When creating a new user or when a user is registering for the first time, the dropdown menu for Teams now displays an option to ‘Show All’ teams. Previously, we supported the display of only the first 10 teams. An option has also been provided to search and filter.
UI improvements have been made on the Schema, Service, and Database details pages.
Manage Tab has been replaced with the manage button on the UI.

# 0.11.0 Release

{% note noteType="Tip" %} 
**2022, July 1st**

[OpenMetadata 0.11.0 Release](https://blog.open-metadata.org/openmetadata-0-11-release-8b82c85636a)
{% /note %}

## Data Collaboration - Tasks, Announcements, & Emojis
- Tasks have been introduced as an extension to the ability to create conversations and post replies.
- Tasks can be created around descriptions for tables, pipelines, dashboards, and topics.
- Users can Request a description, or even Suggest a new description and make edits to an existing description.
- Submitting the request automatically creates a task for the owner of a data asset.
- Tasks can be further reassigned to the relevant user.
- Other users can participate in this activity by posting a reply, comment, or react to conversations with emojis.
- All the tasks assigned to a user can be tracked in the User Profile page.
- Tasks associated with a particular data asset are kept track of in the dataset details page.
- Task owners can provide description or accept/reject suggestions and those tasks are automatically closed.

## Column Level Lineage
- Column level lineage API support has been added in the backend.
- Supports table level and column level lineage from Snowflake, Redshift, and BigQuery.

## Custom Properties
- Now supports adding new types and extending entities when organizations need to capture custom metadata.
- New types and custom fields can be added to entities either using API or in OpenMetadata UI.

## Advanced Search
- Users can search by column, schema, database, owner, tag, and service.
- Users can search by multiple parameters to narrow down the search results.
- Separate advanced search options are available for Tables, Topics, Dashboards, Pipelines, and ML Models.
- All entities are searchable by common search options such as Owner, Tag, and Service.
- Entity specific search options are also available - table specific options include Column, Schema, and Database, pipeline specific options include Task, and dashboards specific option includes Chart.

## Glossary UI Updates
- The Glossary UI has been upgraded.
- The arrangement to display the Summary, Related Terms, Synonyms, and References has been changed.
- Reviewers are shown on the right panel with an option to add or remove existing reviewers.

## Profiler and Data Quality Improvements
- Seven additional data quality tests have been added as follows.
- - tableColumnCountToBeBetween: Ensure the number of columns in your table stays within the expected range
- - tableColumnNameToExist: Check that a specific column is in your table
- - tableColumnToMatchSet: Check that your table has the expected columns. You can enforce a check for column order.
- - columnValueMaxToBeBetween: Verify the max value in a column is between expected bounds
- - columnValueMinToBeBetween: Verify the min value in a column is between expected bounds
- - columnValuesToBeInSet: Check if specific value(s) are in a column
- - columnValuesSumToBeBetween: Verify the sum of the values in a column is between expected bounds
- The Profiler now determines if a BigQuery table is partitioned, and filters it accordingly.
- Now, you can pass a custom query to your profiler workflow file.
- Developed a direct integration between Great Expectations and OpenMetadata. Now, you can add custom actions to your Great Expectations checkpoints file that will automatically ingest your data quality tests results into OpenMetadata at the end of your checkpoint file run.

## ML Models
- ML Model entities have been added to the UI.
- Supports ingestion through the UI from MLflow.

## Connectors
- Five new connectors have been added - Airbyte, Mode, AWS Data Lake, Google Cloud Data Lake, and Apache Pinot.
- DBT Cloud support was added and we now extract manifest and catalog files from API.
- The ingestion scheduler now supports a minute level selection.
- The Snowflake metadata extraction has been optimized.
- The Looker connector now fetches the ‘Usage’ and ‘Access’ metadata for Dashboards and Charts.

## UI Improvements
- The OpenMetadata UI has a new layout.
- In the Activity Feeds, the options to reply to a conversation, as well as to delete can now be found on hovering over the conversation.
- Users can react with Emojis on the activity feeds, conversations and replies.
- Hovering on the links provides a quick preview of the entity details.
- The UI supports adding Tasks. Pending tasks will be displayed on the right panel.
- A tooltip has been added to display the FQN on hover in the Activity Feed header.

## Other Changes
- Admin users define Roles and associate these roles to Teams. When a user picks a Team, the Role gets automatically assigned.
- An option has been added to recreate a fresh index from the data available in Elasticsearch.
- A simple webhook server has been added to the metadata command to register and listen to the metadata change events.
- The ingestion configurations are supported as YAML.
- In the previous release, we added support for Azure SSO on Airflow. In the current release, we’ve added support for Azure SSO in Java SDK Client.
- OpenMetadata now supports AWS Cognito SSO.
- When deleting a database service, the number of databases, schemas and tables is displayed in the confirmation dialog.

# 0.10.1 Release

{% note noteType="Tip" %} 
**2022, May 17th**
{% /note %}

- Support for Postgres as OpenMetadata Store [#4601](https://github.com/open-metadata/OpenMetadata/issues/4601)
- UI Improvements in 0.10.1 Release [#4600](https://github.com/open-metadata/OpenMetadata/issues/4600)
- Support JWT Token Generation for Bot Accounts [#4637](https://github.com/open-metadata/OpenMetadata/issues/4637)
- UI Ingestion Improvements - Support for Dashboards & Messaging Services [#4843](https://github.com/open-metadata/OpenMetadata/issues/4843)
- Security: Fix Azure SSO and support refresh tokens in [#4989](https://github.com/open-metadata/OpenMetadata/issues/4989)

# 0.10.0 Release

{% note noteType="Tip" %} 
**2022, April 27th**

[OpenMetadata 0.10.0 Release](https://blog.open-metadata.org/openmetadata-0-10-0-release-82c4f5533c3f)
{% /note %}

## Support for Database Schema

OpenMetadata supports databases, service name databases, and tables. We’ve added Database Schema as part of the FQN. 
For each external data source, we ingest the database, as well as the tables that are contained underneath the schemas.

## Support for Hard Delete

OpenMetadata supported soft deletions. Now, we also support the hard deletion of entities through the UI, APIs,
and ingestion. Hard deleting an entity removes the entity and all of its relationships. This will also generate a change event.

## Deploy Ingestion from UI

OpenMetadata has refactored the service connections to simplify the ingestion jobs from both the ingestion framework 
and the UI. We now use the pydantic models automatically generated from the JSON schemas for the connection
definition. The ‘Add Service’ form is automatically generated in the UI based on the JSON schema specifications for the
various connectors that are supported in OpenMetadata.

## Download dbt Manifest Files from Amazon S3 or Google Cloud Storage

Previously, when ingesting the models and lineage from dbt, we passed the path of the dbt manifest and catalog files 
directly into the workflow. We’ve worked on improving the quality of life of dbt. Now, we can dynamically download 
these files from Amazon S3 or Google Cloud Storage. This way we can have any other process to connect to the dbt, 
extract the catalog, and put it into any cloud service. We just need the path name and workflow job details from the 
metadata extraction to be able to ingest metadata.

## JSON Schema based Connection Definition

Each service (database, dashboard, messaging, or pipeline service) has its own configuration specifications, with some 
unique requirements for some services. Instead of the ad hoc definitions of the source module in Python for each 
connector, we’ve worked on the full refactoring of the ingestion framework. We now use the pydantic models automatically
generated from the JSON schemas for the connection definition.

## Airflow Rest APIs

The Airflow REST APIs have been refactored. With our API centric model, we are creating a custom airflow rest API 
directly on top of Airflow using plugins. This passes the connection information to automatically generate all the dags
and prepares handy methods to help us test the connection to the source before creating the service.

## UI Changes

- The UI improvements are directed toward providing a consistent user experience.
- Hard Deletion of Entities: With the support for the hard deletion of entities, we can permanently delete tables, 
  topics, or services. When the entity is hard deleted, the entity and all its relationships are removed. 
  This generates an ‘EntityDeleted’ change event.
- Dynamic “Add Service” Forms: The ‘Add Service’ form is automatically generated in the UI based on the JSON 
  schema specifications for the various connectors that are supported in OpenMetadata.
- UI Support for Database Schema as part of FQN: The database schema has been introduced in the 0.10 release. All the
  entity pages now support Database Schema in the UI.
- Lineage Editor: Improvements have been made to the lineage editor.
- Teams: While signing up in OpenMetadata, the teams with restricted access are hidden and only the joinable teams are displayed.
- Team Owner: An Owner field has been added to the Team entity. Only team owners can update the teams.
- Activity Feeds: The Activity Feeds UI supports infinite scrolling.
- Add User: A user can be added from the Users page.

## Security Changes
- **Support Refresh Tokens for Auth0 and Okta SSO**: The JWT tokens generated by the SSO providers expire by default 
  in about an hour, making the user re-login often. In this release, we’ve added support for refresh tokens for Auth0 
  and Okta SSO. The tokens are refreshed silently behind the scenes to provide an uninterrupted user experience.
  In future releases, we’ll continue to stabilize authentication and add refresh tokens for the other SSO providers.
- **Custom OIDC SSO**: OpenMetadata now supports integration with your custom-built OIDC SSO for authentication. 
  This is supported both on the front end for user authentication and on the ingestion side.
- **Azure SSO**: Support has been added for Azure SSO on Airflow.

# 0.9.0 Release

{% note noteType="Tip" %} 
**2022, March 10th**

[OpenMetadata 0.9.0 Release](https://blog.open-metadata.org/openmetadata-0-9-0-release-8e7b93ab1882)
{% /note %}

## Collaboration

- Conversations in the main feed.
- Users can ask each other questions, add suggestions and replies.
- Turn some threads into tasks and provide it in MyData as number of tasks.
- Glossary.
- Table details - Click through on usage to see who or what services are using it, what queries are pulling from it.

## Data Quality
- Ability to create and monitor the test cases.
- Data Quality Tests support with Json Schemas and APIs.
- UI Integration to enable user to write tests and run them on Airflow.

## Glossary

- Glossaries are a Controlled Vocabulary in an organization used to define the concepts and terminologies specific to a
  particular domain.
- API & Schemas to support Glossary.
- UI support to add Glossary and Glossary Terms. 
- Support for using Glossary terms to annotate Entities and Search using Glossary Terms.

## Connectors
- Apache Iceberg
- Azure SQL
- Clickhouse
- Clickhouse Usage
- Databricks
- Databricks Usage
- Delta Lake
- DynamoDB
- IBM DB2
- Power BI
- MSSQL Usage
- SingleStore
- Apache Atlas ,Import Metadata from Apache Atlas into OpenMetadata
- Amundsen, Import Metadata from Amundsen into OpenMetadata

## Lineage
- DataSource SQL Parsing support to extract Lineage
- View Lineage support

## Pipeline
- Capture pipeline status as it happens

## Security

- Security policies through the UI.
- Configuration personas and authorization based on policies.
- AWS SSO support.

# 0.8.0 Release

{% note noteType="Tip" %} 
**2022, January 22nd**

[OpenMetadata 0.8.0 Release](https://blog.open-metadata.org/openmetadata-0-8-0-release-ca09bd2fbf54)
{% /note %}

## Access Control Policies
- Design of Access Control Policies.
- Provide Role based access control with community feedback.

## Eventing Webhook

- Register webhooks to get metadata event notifications.
- Metadata Change Event integration into Slack and framework for integration into other services such as 
  Kafka or other Notification frameworks

## Connectors
- Delta Lake
- Iceberg
- PowerBI
- Azure SQL

# 0.7.0 Release

{% note noteType="Tip" %} 
**2021, November 17th**

[OpenMetadata 0.7.0 Release](https://blog.open-metadata.org/openmetadata-0-7-0-release-9f741b8d5089)
{% /note %}

## UI - Activity Feed, Improved UX for Search
- Users will have access to Activity Feed of all the changes to the Metadata.
- New and Improved UX for Search and Landing page.

## Support for Table Location
- Extract Location information from Glue, Redshift.
- Show Location details on the Table Page.

## ElasticSearch Improvements
- Support SSL (including self-signed certs) enabled ElasticSearch.
- New entities will be indexed into ElasticSearch directly

## Connectors
- Metabase
- Apache Druid
- Glue Improvements
- MSSQL - SSL support
- Apache Atlas Import connector
- Amundsen Import connector

## Other features
- Metadata Change Event integration into Slack and framework for integration into other services such as Kafka or
  other Notification frameworks
- Delta Lake support, Databricks, Iceberg

# 0.6.0 Release

{% note noteType="Tip" %} 
**2021, November 17th**

[OpenMetadata 0.6.0 Release — Metadata Versioning, Events API, One-Click Ingestion, and more](https://blog.open-metadata.org/openmetadata-0-6-0-release-metadata-versioning-events-api-one-click-ingestion-and-more-4394c4f08e0b)
{% /note %}

## Metadata Versioning and Eventing Framework
- Capture changes to Entity Metadata from source and user interactions as versions.
- Versioned changes will be published as events for clients to consume to take actions on.

## Data Reliability
- Improvements to Data Reliability library.
- Capture custom measurements through user provided SQL.

## Airflow APIs
- Airflow APIs to deploy DAGS and manage them.
- UI integration to deploy ingestion workflows.

## Connectors
- AWS Glue
- dbt
- MariaDB

# 0.5.0 Release

{% note noteType="Tip" %} 
**2021, October 19th**

[OpenMetadata 0.5.0 Release is here — Lineage, Pipelines, Complex Types, Data Profiler and so much more](https://blog.open-metadata.org/openmetadata-0-5-0-1144a4000644)
{% /note %}

## Support for Lineage
- Lineage related schemas and APIs.
- Lineage metadata integration from AirFlow for tables.
- UI changes to show lineage information to the users.

## Data Reliability
- Improvements to Data Profiler.
- UI integration with Data Profiler to show how the table profile looks over the period of time.

## Complex Types
- Support complex types such as Struct, Array with nested fields.
- UI support to add expand complex types and tag, add description for nested fields.

## Connectors
- Trino
- Redash

## Other features
- Pipeline Entities are supported.
- Integration with Airflow to extract Pipeline details.

# 0.4.0 Release
{% note noteType="Tip" %} 
**2021, September 20th**

[OpenMetadata 0.4.0 Release — Dashboards, Topics, Data Reliability](https://blog.open-metadata.org/openmetadata-0-4-0-release-dashboards-topics-data-reliability-14e8672ae0f5)
{% /note %}

## Support for Kafka (and Pulsar WIP)
- Support for Message Service and Topic entities in schemas, APIs, and UI.
- Kafka connector and ingestion support for Confluent Schema Registry.

## Support for Dashboards
- Support for Dashboard services, Dashboards, and Charts entities in schemas, APIs, and UI.
- Looker, Superset, Tableau connector, and ingestion support.

## User Interface
- Sort search results based on Usage, Relevance, and Last updated time.
- Search string highlighted in search results.
- Support for Kafka and Dashboards from Looker, Superset, and Tableau.

## Other features
- Pluggable SSO integration - Auth0 support.
- Support for Presto.

## Work in progress
- Salesforce CRM connector.
- Data profiler to profile tables in ingestion framework and show it table details page.
