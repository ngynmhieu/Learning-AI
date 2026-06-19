@echo off
setlocal
cd /d %~dp0

REM Schema -> migration -> push, in one step.
REM Detects changed schema/<module>/*.sql fragments, generates per-table
REM migrations, shows the diff, and pushes to the cloud after you confirm.
REM
REM Pass-through flags (see supabase/docs/supabase_guidelines.md):
REM   run_migration.bat            detect -> generate -> review -> prompt to push
REM   run_migration.bat --status   only report what changed; generate nothing
REM   run_migration.bat --no-push  generate + review, never push
REM   run_migration.bat --yes      skip the prompt; push if pushable

where python >nul 2>nul
if errorlevel 1 (
    echo error: python is not on PATH. Install Python or open a shell where it is available.
    exit /b 1
)

python supabase\scripts\sync_schema.py %*
exit /b %errorlevel%
