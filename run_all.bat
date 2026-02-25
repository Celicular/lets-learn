@echo off
echo Starting LetsLearn Project...

:: Load COMFYUI_PATH from .env if it exists
set COMFYUI_PATH=
for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
    if "%%A"=="COMFYUI_PATH" set COMFYUI_PATH=%%B
)

:: Start Frontend
echo Starting Frontend...
start "LetsLearn Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Start Backend
echo Starting Backend...
start "LetsLearn Backend" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate && python server.py"

:: Start ComfyUI if path is set
if defined COMFYUI_PATH (
    if exist "%COMFYUI_PATH%" (
        echo Starting ComfyUI...
        start "ComfyUI" cmd /k "cd /d "%COMFYUI_PATH%" && run_nvidia_gpu.bat"
    ) else (
        echo [WARNING] COMFYUI_PATH set but folder not found: %COMFYUI_PATH%
    )
) else (
    echo [INFO] COMFYUI_PATH not set in .env - skipping ComfyUI launch
)

echo All services started!
pause
