-- Soft delete: användare kan dölja konversationer för sig själva (visas inte i inkorgen)
-- Tabellen user_hidden_conversations lagrar vilka konversationer som är dolda för vilken användare

create table if not exists public.user_hidden_conversations (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, conversation_id)
);

alter table public.user_hidden_conversations enable row level security;

create policy "Users manage own hidden conversations"
  on public.user_hidden_conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_user_hidden_conversations_user_id
  on public.user_hidden_conversations(user_id);
