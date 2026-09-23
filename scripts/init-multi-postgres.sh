#!/bin/bash
set -e

# Initialize isolated databases for KinGuardian and Open Wearables
# Enforces strict database & schema isolation between core KinGuardian domain and Open Wearables aggregator.

psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'iam_user') THEN
            CREATE USER iam_user WITH PASSWORD 'iam_password';
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'open_wearables_user') THEN
            CREATE USER open_wearables_user WITH PASSWORD 'open_wearables_password';
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kinguardian') THEN
            CREATE USER kinguardian WITH PASSWORD 'kinguardian123' SUPERUSER;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kinguardian_user') THEN
            CREATE USER kinguardian_user WITH PASSWORD 'kinguardian_password';
        END IF;
    END
    \$\$;

    SELECT 'CREATE DATABASE open_wearables_db OWNER open_wearables_user'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'open_wearables_db')\gexec

    SELECT 'CREATE DATABASE kinguardian OWNER kinguardian'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kinguardian')\gexec

    GRANT ALL PRIVILEGES ON DATABASE kinguardian_db TO iam_user;
    GRANT ALL PRIVILEGES ON DATABASE open_wearables_db TO open_wearables_user;
    GRANT ALL PRIVILEGES ON DATABASE kinguardian TO kinguardian;
EOSQL

