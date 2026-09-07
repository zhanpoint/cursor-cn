@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title cursor-cn

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js 24+ not found.
  pause
  exit /b 1
)

set "ACTION="
if /i "%~1"=="restore" set "ACTION=--restore"
if /i "%~1"=="--restore" set "ACTION=--restore"
if /i "%~1"=="fix" set "ACTION=--fix-checksum"
if /i "%~1"=="--fix" set "ACTION=--fix-checksum"
if /i "%~1"=="--fix-checksum" set "ACTION=--fix-checksum"
if /i "%~1"=="/?" set "ACTION=--help"
if /i "%~1"=="-h" set "ACTION=--help"
if /i "%~1"=="--help" set "ACTION=--help"
if /i "%~1"=="--print-paths" set "ACTION=--print-paths"
if /i "%~1"=="--no-restart" set "ACTION=--no-restart"

node.exe "%~dp0cursor-cn.ts" %ACTION%
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" echo [ERROR] Failed.
pause
exit /b %EXIT_CODE%
