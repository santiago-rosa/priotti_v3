@echo off
:: instalar_tarea.bat
:: Registra DOS tareas en el Programador de Tareas de Windows:
::   1. PriottiWatcherStart - se ejecuta al iniciar sesion del usuario
::   2. PriottiWatcher      - se ejecuta cada 15 minutos
:: Ejecutar como Administrador.

SET WATCHER=%~dp0ejecutar_oculto.vbs

echo.
echo ========================================
echo  PRIOTTI V3 - INSTALADOR DE TAREAS
echo ========================================
echo.
echo Ruta del script: %WATCHER%
echo.

:: --- Eliminar si ya existen ---
schtasks /Delete /TN "PriottiWatcher"      /F >nul 2>&1
schtasks /Delete /TN "PriottiWatcherStart" /F >nul 2>&1

:: --- Tarea 1: Al iniciar sesion del usuario ---
echo [1/2] Registrando tarea de inicio de sesion...
schtasks /Create /TN "PriottiWatcherStart" /TR "wscript.exe \"%WATCHER%\"" /SC ONLOGON /RL HIGHEST /F

IF %ERRORLEVEL% EQU 0 (
    echo      [OK] Se ejecutara al iniciar sesion.
) ELSE (
    echo      [ERROR] No se pudo registrar. Ejecute como Administrador.
)

:: --- Tarea 2: Cada 15 minutos ---
echo [2/2] Registrando tarea periodica...
schtasks /Create /TN "PriottiWatcher" /TR "wscript.exe \"%WATCHER%\"" /SC MINUTE /MO 15 /RL HIGHEST /F

IF %ERRORLEVEL% EQU 0 (
    echo      [OK] Se ejecutara cada 15 minutos.
) ELSE (
    echo      [ERROR] No se pudo registrar. Ejecute como Administrador.
)

echo.
echo ========================================
echo  Instalacion finalizada.
echo  Verificando tareas registradas:
echo ========================================
schtasks /Query /TN "PriottiWatcherStart" /FO LIST | findstr /i "Nombre\|Estado\|Proxima"
schtasks /Query /TN "PriottiWatcher"      /FO LIST | findstr /i "Nombre\|Estado\|Proxima"
echo.
pause
