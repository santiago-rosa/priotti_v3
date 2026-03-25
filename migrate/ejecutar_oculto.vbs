Set fso      = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Obtener la carpeta donde esta este mismo .vbs
Dim scriptDir
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Establecer el directorio de trabajo a esa carpeta
WshShell.CurrentDirectory = scriptDir

' Ejecutar el bat usando ruta absoluta, sin ventana
WshShell.Run chr(34) & scriptDir & "\actualizar_auto.bat" & chr(34), 0, False

Set WshShell = Nothing
Set fso      = Nothing
