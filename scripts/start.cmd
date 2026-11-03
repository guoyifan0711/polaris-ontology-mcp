@echo off
setlocal DisableDelayedExpansion
set "POLARIS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%POLARIS_NODE%" goto run
set "POLARIS_NODE="
for /f "delims=" %%P in ('where node.exe 2^>nul') do if not defined POLARIS_NODE set "POLARIS_NODE=%%P"
if defined POLARIS_NODE goto run
echo Polaris MCP needs Node.js 20 or newer. Use the official Node.js installer or the Codex bundled runtime. 1>&2
exit /b 1
:run
"%POLARIS_NODE%" -e "if(Number(process.versions.node.split('.')[0])<20)process.exit(1)"
if errorlevel 1 exit /b 1
"%POLARIS_NODE%" "%~dp0stdio.mjs"
exit /b %errorlevel%
