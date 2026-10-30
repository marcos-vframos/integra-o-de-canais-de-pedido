-- Allow only explicitly granted status RPCs; private table privileges remain revoked.
grant usage on schema app_private to anon;
