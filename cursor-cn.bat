@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title cursor-cn

where node >nul 2>&1 || (
  echo [错误] 未找到 Node.js 24 或更高版本。
  pause
  exit /b 1
)

set "ACTION=%~1"
if /i "%ACTION%"=="restore" set "ACTION=--restore"
if /i "%ACTION%"=="fix" set "ACTION=--fix-checksum"
if /i "%ACTION%"=="--fix" set "ACTION=--fix-checksum"
if /i "%ACTION%"=="/?" set "ACTION=--help"
if /i "%ACTION%"=="-h" set "ACTION=--help"

node "%~dp0cursor-cn.ts" %ACTION%
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" echo [错误] 操作未完成。
pause
exit /b %EXIT_CODE%
