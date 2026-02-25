@echo off
echo Starting LetsLearn Project...

:: Start Frontend in a new window
echo Starting Frontend...
start "LetsLearn Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Start Backend in a new window
echo Starting Backend...
start "LetsLearn Backend" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate && python server.py"

echo All services started!
pause
