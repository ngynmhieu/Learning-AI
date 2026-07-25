@echo off
:: Usage: deploy.bat [all|supabase|backend|models|frontend] [--stop]
::
::   deploy.bat                    start everything (supabase + all 3 containers)
::   deploy.bat models              start just the models container
::   deploy.bat supabase             start just the local Supabase stack
::
::   deploy.bat --stop                stop everything
::   deploy.bat models --stop         stop just the models container
::   deploy.bat supabase --stop       stop just Supabase
::
:: Target name and --stop can appear in either order. No target = "all".
setlocal
cd /d %~dp0

set ACTION=start
set TARGET=all

for %%A in (%*) do (
    if /i "%%A"=="--stop" (
        set ACTION=stop
    ) else (
        set TARGET=%%A
    )
)

if /i not "%TARGET%"=="all" if /i not "%TARGET%"=="supabase" if /i not "%TARGET%"=="backend" if /i not "%TARGET%"=="models" if /i not "%TARGET%"=="frontend" (
    echo Unknown target: %TARGET%
    echo Usage: deploy.bat [all^|supabase^|backend^|models^|frontend] [--stop]
    pause
    exit /b 1
)

if "%ACTION%"=="stop" goto :do_stop

:: ---------------- start ----------------
if /i "%TARGET%"=="supabase" goto :start_supabase
if /i "%TARGET%"=="all" goto :start_all

echo Deploying %TARGET%...
docker compose --env-file frontend\.env up -d --build %TARGET%
if errorlevel 1 (
    echo Failed to start %TARGET%.
    pause
    exit /b 1
)
goto :summary

:start_supabase
echo Starting Supabase (first run pulls several GB)...
supabase start
if errorlevel 1 (
    echo Supabase failed to start.
    pause
    exit /b 1
)
goto :summary

:start_all
echo Starting Supabase (first run pulls several GB)...
supabase start
if errorlevel 1 (
    echo Supabase failed to start.
    pause
    exit /b 1
)
echo Starting application containers...
docker compose --env-file frontend\.env up -d --build
if errorlevel 1 (
    echo Compose failed to start.
    pause
    exit /b 1
)
goto :summary

:summary
echo.
echo   App:      http://localhost:3000
echo   API:      http://localhost:8000/health
echo   Studio:   http://localhost:54323
echo.
echo Manage containers from Docker Desktop. Model load takes several
echo minutes on first boot - check the 'models' container's logs there.
pause
exit /b 0

:: ---------------- stop ----------------
:do_stop
if /i "%TARGET%"=="supabase" goto :stop_supabase
if /i "%TARGET%"=="all" goto :stop_all

echo Stopping %TARGET%...
docker compose stop %TARGET%
docker compose rm -f %TARGET%
goto :done

:stop_supabase
echo Stopping Supabase...
supabase stop
goto :done

:stop_all
echo Stopping application containers...
docker compose down
echo Stopping Supabase...
supabase stop
goto :done

:done
echo Done.
pause
