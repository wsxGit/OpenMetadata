-- use FQN instead of name for Test Connection Definition
ALTER TABLE test_connection_definition
ADD fullyQualifiedName VARCHAR(256) GENERATED ALWAYS AS (json ->> 'fullyQualifiedName') STORED NOT NULL,
DROP COLUMN name;

-- Since we are not deleting the test connection defs anymore, clean it up
TRUNCATE test_connection_definition;
