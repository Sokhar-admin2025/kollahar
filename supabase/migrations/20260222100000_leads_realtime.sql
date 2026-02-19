-- Enable Realtime for the leads table so the Dealer Dashboard can
-- subscribe to new leads and update the Hot Leads counter without refresh.
alter publication supabase_realtime add table leads;
