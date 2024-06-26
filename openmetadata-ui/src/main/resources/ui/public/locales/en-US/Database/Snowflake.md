# Snowflake

In this section, we provide guides and references to use the Snowflake connector.

## Requirements

To ingest basic metadata snowflake user must have the following privileges:

- `USAGE` Privilege on Warehouse
- `USAGE` Privilege on Database
- `USAGE` Privilege on Schema
- `SELECT` Privilege on Tables

```sql
-- Create New Role
CREATE ROLE NEW_ROLE;

-- Create New User
CREATE USER NEW_USER DEFAULT_ROLE=NEW_ROLE PASSWORD='PASSWORD';

-- Grant role to user
GRANT ROLE NEW_ROLE TO USER NEW_USER;

-- Grant USAGE Privilege on Warehouse to New Role
GRANT USAGE ON WAREHOUSE WAREHOUSE_NAME TO ROLE NEW_ROLE;

-- Grant USAGE Privilege on Database to New Role
GRANT USAGE ON DATABASE TEST_DB TO ROLE NEW_ROLE;

-- Grant USAGE Privilege on required Schemas to New Role
GRANT USAGE ON SCHEMA TEST_SCHEMA TO ROLE NEW_ROLE;

-- Grant SELECT Privilege on required tables & views to New Role
GRANT SELECT ON ALL TABLES IN SCHEMA TEST_SCHEMA TO ROLE NEW_ROLE;
GRANT SELECT ON ALL VIEWS IN SCHEMA TEST_SCHEMA TO ROLE NEW_ROLE;
```

### Usage & Lineage

While running the usage workflow, Openmetadata fetches the query logs by querying `snowflake.account_usage.query_history` table. For this the snowflake user should be granted the `ACCOUNTADMIN` role or a role granted IMPORTED PRIVILEGES on the database `SNOWFLAKE`.

```sql
-- Grant IMPORTED PRIVILEGES on all Schemas of SNOWFLAKE DB to New Role
GRANT IMPORTED PRIVILEGES ON ALL SCHEMAS IN DATABASE SNOWFLAKE TO ROLE NEW_ROLE;
```

You can find more information about the `account_usage` schema [here](https://docs.snowflake.com/en/sql-reference/account-usage).

### Tags

If ingesting tags, the user should also have permissions to query `snowflake.account_usage.tag_references`.For this the snowflake user should be granted the `ACCOUNTADMIN` role or a role granted IMPORTED PRIVILEGES on the database

```sql
-- Grant IMPORTED PRIVILEGES on all Schemas of SNOWFLAKE DB to New Role
GRANT IMPORTED PRIVILEGES ON ALL SCHEMAS IN DATABASE SNOWFLAKE TO ROLE NEW_ROLE;
```

You can find further information on the Snowflake connector in the [docs](https://docs.open-metadata.org/connectors/database/snowflake).


### Profiler & Data Quality
Executing the profiler Workflow or data quality tests, will require the user to have `SELECT` permission on the tables/schemas where the profiler/tests will be executed. The user should also be allowed to view information in `tables` for all objects in the database. More information on the profiler workflow setup can be found [here](https://docs.open-metadata.org/connectors/ingestion/workflows/profiler) and data quality tests [here](https://docs.open-metadata.org/connectors/ingestion/workflows/data-quality).

## Connection Details

$$section
### Scheme $(id="scheme")

SQLAlchemy driver scheme options.
$$

$$section
### Username $(id="username")

Username to connect to Snowflake. This user should have privileges to read all the metadata in Snowflake.
$$

$$section
### Password $(id="password")

Password to connect to Snowflake.
$$

$$section
### Account $(id="account")

Snowflake account identifier uniquely identifies a Snowflake account within your organization, as well as throughout the global network of Snowflake-supported cloud platforms and cloud regions.

If the Snowflake URL is `https://xyz1234.us-east-1.gcp.snowflakecomputing.com`, then the account is `xyz1234.us-east-1.gcp`
$$

$$section
### Role $(id="role")

You can specify the role of user that you would like to ingest with, if no role is specified the default roles assigned to user will be selected.
$$

$$section
### Database $(id="database")

Database of the data source. This is an optional parameter, if you would like to restrict the metadata reading to a single database. When left blank, the OpenMetadata Ingestion attempts to scan all the databases.
$$

$$section
### Warehouse $(id="warehouse")

Snowflake warehouse is required for executing queries to fetch the metadata. Enter the name of warehouse against which you would like to execute these queries.
$$

$$section
### Query Tag $(id="queryTag")

Session query tag used to monitor usage on snowflake. To use a query tag snowflake user should have enough privileges to alter the session
$$

$$section
### Private Key $(id="privateKey")

If you have configured the key pair authentication for the given user you will have to pass the private key associated with the user in this field. You can checkout [this](https://docs.snowflake.com/en/user-guide/key-pair-auth) doc to get more details about key-pair authentication.

Also make sure you are passing the key in a correct format. If your private key looks like this:

```
-----BEGIN ENCRYPTED PRIVATE KEY-----
MII..
MBQ...
CgU..
8Lt..
...
h+4=
-----END ENCRYPTED PRIVATE KEY-----
```

You will have to replace new lines with `\n` and the final private key that you need to pass should look like this:

```
-----BEGIN ENCRYPTED PRIVATE KEY-----\nMII..\nMBQ...\nCgU..\n8Lt..\n...\nh+4=\n-----END ENCRYPTED PRIVATE KEY-----\n
```
$$

$$section
### Snowflake Private Key Passphrase $(id="snowflakePrivatekeyPassphrase")

If you have configured the encrypted key pair authentication for the given user you will have to pass the paraphrase associated with the private key in this field. You can checkout [this](https://docs.snowflake.com/en/user-guide/key-pair-auth) doc to get more details about key-pair authentication.
$$

$$section
### Include Transient Tables $(id="includeTransientTables")

In Snowflake, we have `TRANSIENT` tables, which will be ignored during the ingestion by default. Based on a flag only Transient Tables will be extracted, Temporary tables are not supported.
Enable this setting to ingest them during the metadata workflow.
$$

$$section
### Client Session Keep Alive $(id="clientSessionKeepAlive")

Optional Configuration to keep the session active in case the ingestion job runs for longer duration. 
$$

$$section
### Connection Options $(id="connectionOptions")

Additional connection options to build the URL that can be sent to service during the connection.
$$

$$section
### Connection Arguments $(id="connectionArguments")

Additional connection arguments such as security or protocol configs that can be sent to service during connection.
$$
