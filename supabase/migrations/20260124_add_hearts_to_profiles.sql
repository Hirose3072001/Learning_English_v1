-- Add hearts column to profiles table
ALTER TABLE public.profiles ADD COLUMN hearts INTEGER DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN max_hearts INTEGER DEFAULT 5;
