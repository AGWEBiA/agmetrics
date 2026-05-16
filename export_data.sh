#!/bin/bash
SOURCE_URL="postgresql://postgres.iwrrijemxtudyakmhajk:[PASSWORD_CLOUDE]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"
TARGET_URL="postgresql://postgres.wsqckbceejdshbmjingp:[PASSWORD_EXTERNO]@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

echo "Exportando dados do Lovable Cloud..."
pg_dump --clean --if-exists --no-owner --no-privileges --data-only --schema=public "$SOURCE_URL" > data_dump.sql

echo "Importando dados para o Supabase Externo..."
psql "$TARGET_URL" -f data_dump.sql

echo "Migração de dados concluída!"
