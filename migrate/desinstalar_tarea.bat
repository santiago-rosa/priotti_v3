@echo off
:: desinstalar_tarea.bat
:: Elimina ambas tareas del Programador de Tareas de Windows.

echo.
echo Eliminando tareas de Priotti...

schtasks /Delete /TN "PriottiWatcher"      /F
schtasks /Delete /TN "PriottiWatcherStart" /F

echo.
echo [OK] Tareas eliminadas.
echo.
pause
