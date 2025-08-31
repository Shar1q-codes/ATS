#!/bin/bash
# PostgreSQL Read Replica Setup Script

set -e

echo "Setting up PostgreSQL read replica..."

# Wait for master to be ready
until pg_isready -h postgres -p 5432 -U ${POSTGRES_USER}; do
  echo "Waiting for master database to be ready..."
  sleep 2
done

# Stop PostgreSQL service
pg_ctl stop -D /var/lib/postgresql/data -m fast || true

# Remove existing data directory
rm -rf /var/lib/postgresql/data/*

# Create base backup from master
PGPASSWORD=${POSTGRES_PASSWORD} pg_basebackup -h postgres -D /var/lib/postgresql/data -U ${POSTGRES_USER} -v -P -W

# Create recovery configuration
cat > /var/lib/postgresql/data/postgresql.auto.conf << EOF
# Read replica configuration
hot_standby = on
primary_conninfo = 'host=postgres port=5432 user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}'
primary_slot_name = 'replica_slot'
EOF

# Create standby signal file
touch /var/lib/postgresql/data/standby.signal

# Set proper permissions
chown -R postgres:postgres /var/lib/postgresql/data
chmod 700 /var/lib/postgresql/data

echo "Read replica setup completed successfully"