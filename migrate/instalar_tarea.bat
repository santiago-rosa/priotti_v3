@echo off
:: instalar_tarea.bat
:: Registra DOS tareas en el Programador de Tareas de Windows:
::   1. PriottiWatcherStart - se ejecuta al encender la PC
::   2. PriottiWatcher      - se ejecuta cada 15 minutos
:: Ejecutar como Administrador.

SET WATCHER=%~dp0ejecutar_oculto.vbs
SET CMD_VBS=wscript.exe "%WATCHER%"

echo.
echo ========================================
echo  PRIOTTI V3 - INSTALADOR DE TAREAS
echo ========================================
echo.

:: --- Eliminar si ya existen ---
schtasks /Delete /TN "PriottiWatcher"      /F >nul 2>&1
schtasks /Delete /TN "PriottiWatcherStart" /F >nul 2>&1

:: --- Tarea 1: Al iniciar el sistema ---
echo [1/2] Registrando tarea de inicio...
schtasks /Create ^
  /TN "PriottiWatcherStart" ^
  /TR "%CMD_VBS%" ^
  /SC ONSTART ^
  /DELAY 0001:00 ^
  /RL HIGHEST ^
  /F

IF %ERRORLEVEL% EQU 0 (
    echo      [OK] Se ejecutara al encender la PC ^(1 min de espera tras el inicio^).
) ELSE (
    echo      [ERROR] No se pudo registrar. Ejecute como Administrador.
)

:: --- Tarea 2: Cada 15 minutos ---
echo [2/2] Registrando tarea periodica...
schtasks /Create ^
  /TN "PriottiWatcher" ^
  /TR "%CMD_VBS%" ^
  /SC MINUTE ^
  /MO 15 ^
  /RL HIGHEST ^
  /F

IF %ERRORLEVEL% EQU 0 (
    echo      [OK] Se ejecutara cada 15 minutos.
) ELSE (
    echo      [ERROR] No se pudo registrar. Ejecute como Administrador.
)

echo.
echo ========================================
echo  Instalacion finalizada.
echo  El watcher revisara la carpeta "listas"
echo  al encender la PC y cada 15 minutos.
echo  Si detecta un Excel nuevo, sincronizara
echo  automaticamente con el servidor.
echo ========================================
echo.
pause
