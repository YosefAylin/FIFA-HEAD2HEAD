-- ============================================================
-- Inactive players ("grey out those who bail")
-- Run this in the Supabase SQL editor after reset-and-seed.sql.
-- Adds an is_active flag so a player can be dimmed in the lists
-- (they stop playing / stopped showing up) without deleting them.
-- Default is active (true); existing rows become active.
-- ============================================================

alter table public.players
  add column if not exists is_active boolean not null default true;
