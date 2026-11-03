@echo off
setlocal
title Twitch Overlay Studio
cd /d "%~dp0"

echo.
echo   Twitch Overlay Studio
echo   --------------------
echo.

where node >nul 2>nul
if not errorlevel 1 goto useNode

where py >nul 2>nul
if not errorlevel 1 goto usePy

where python >nul 2>nul
if not errorlevel 1 goto usePython

goto useFile

:useNode
echo   Starting with Node.js...
echo.
node server.js
if errorlevel 1 (
  echo.
  echo   Node could not start the studio. Trying Python instead...
  goto usePy
)
goto end

:usePy
echo   Starting with the Python launcher...
start "Overlay Studio server" /min py -3 -m http.server 8787 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" http://localhost:8787/
echo.
echo   The server is running in the minimised "Overlay Studio server" window.
echo   Close that window to stop the studio.
echo.
pause
goto end

:usePython
echo   Starting with Python...
start "Overlay Studio server" /min python -m http.server 8787 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" http://localhost:8787/
echo.
echo   The server is running in the minimised "Overlay Studio server" window.
echo   Close that window to stop the studio.
echo.
pause
goto end

:useFile
echo   Node.js and Python were not found, so the studio will open as a
echo   local file. Everything except "Export bundle" works this way.
echo   Install Node.js (nodejs.org) for full bundle export.
echo.
start "" "%~dp0index.html"
timeout /t 2 /nobreak >nul
goto end

:end
endlocal
