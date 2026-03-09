# PRD: Mandados Capture System

## Overview
A web-based frontend to handle the detailed view and management of police warrants, specifically tracking and allowing edits on details such as:
- Warrant basic info (name, process number, etc.)
- Priority flags (Urgente, Risco de Fuga, etc.)
- Associated DP Region mapping

## Features
1. **Warrant Detail (WarrantDetail.tsx)**
   - Display a highly customized Tactical UI for a specific warrant.
   - User can mark the warrant as "Priority" effectively adding immediate badges.
   - User can adjust the "DP Region" mapped from address details.
   - A save mechanism prompts the user when changes are made to either priority or dp Region.

## Technical Details
- Frontend: React + Vite + TypeScript.
- API: Handled via supabase.
