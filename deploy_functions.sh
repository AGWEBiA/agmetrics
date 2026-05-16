#!/bin/bash
PROJECT_REF="wsqckbceejdshbmjingp"

echo "Deploying Edge Functions to $PROJECT_REF..."

functions=(
  "admin-users"
  "ai-debriefing"
  "ai-forecast"
  "ai-insights"
  "ai-projection-recommendation"
  "auto-sync"
  "backfill-kiwify-fees"
  "import-csv"
  "list-meta-ad-accounts"
  "list-meta-campaigns"
  "page-layout-preview"
  "populate-lead-events"
  "send-whatsapp-report"
  "sync-agsell"
  "sync-custom-api"
  "sync-google"
  "sync-hotmart"
  "sync-kiwify"
  "sync-meta"
  "sync-whatsapp"
  "tracking-pixel"
  "webhook-agsell"
  "webhook-hotmart"
  "webhook-kiwify"
)

for func in "${functions[@]}"; do
  echo "Deploying $func..."
  supabase functions deploy "$func" --project-ref "$PROJECT_REF"
done

echo "Deploy concluído!"
