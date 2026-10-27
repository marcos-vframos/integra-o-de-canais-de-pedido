# Google Business Profile: automatic public location and hours

Status: implementation prepared; live data is unavailable until the owner authorizes the Google project and business account. No Google credentials are included in source or frontend settings.

## Activation order

1. Obtain Google Business Profile API project approval and enable Business Information API.
2. Create the web application's OAuth client and consent screen. Have the account managing the location explicitly grant `https://www.googleapis.com/auth/business.manage` with offline access. This implementation only makes GET requests for business information; it does not change Google's profile.
3. Obtain the selected `locations/NUMBER` identifier. Verify it belongs to this business; do not choose a location by an ambiguous text search.
4. Configure server-side Supabase Edge secrets: `GOOGLE_BUSINESS_CLIENT_ID`, `GOOGLE_BUSINESS_CLIENT_SECRET`, and `GOOGLE_BUSINESS_PROFILES_JSON`. Never use VITE_ variables for credentials. The final variable maps tenant UUIDs to `{ "locationName":"locations/NUMBER", "refreshToken":"PRIVATE", "timeZone":"America/Sao_Paulo" }`. Supply actual credentials through a secure environment configuration, not chat or source control.
5. Deploy `google-business-profile` with its shared dependency. It validates the caller's project API key, validates allowed origins and uses only the location explicitly configured for that tenant. OAuth/API failures return a generic status without credentials or Google response bodies.
6. Check address, phone, split opening periods, timezone, holiday closures and overnight hours against Google's profile. Check revocation and reconnection before enabling for other tenants.

## Operation and limits

The frontend loads once and refreshes every 15 minutes while open. Each edge isolate caches successful public responses for at most 15 minutes and coalesces simultaneous Google queries. No Google profile content is persisted to the database or localStorage. Unavailable Google information keeps the local catalog's information in use; it is never presented as a successful sync. The last in-memory client result expires after 24 hours. Operational order acceptance and the operator's open/closed overrides remain independent of the public business listing.

Different edge isolates can each request Google independently. Quota monitoring and load verification are required before a broad multi-tenant rollout. A disconnected or expired Google authorization cannot be repaired by the app without the owner's Google consent. OAuth credential provisioning and Google project approval are external prerequisites, not implemented substitutes.

Official references:
- https://developers.google.com/my-business/content/basic-setup
- https://developers.google.com/my-business/content/implement-oauth
- https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations
- https://developers.google.com/my-business/content/policies
