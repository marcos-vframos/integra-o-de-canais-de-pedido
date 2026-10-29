// Transitional compatibility re-export. All data and auth now go to independent Supabase.
// No PocketBase / Skip API is contacted by the application on this branch.
export { default, backendConfigured, backendConfigMessage, demoGestaoMode, integrationTestMode, tenantId } from '@/lib/supabase/compat'

