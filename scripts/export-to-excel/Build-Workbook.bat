@echo off
REM ====================================================================
REM Build-Workbook.bat - One-click Windows installer for the BK Work
REM Schedule macro-enabled workbook (.xlsm).
REM
REM What it does:
REM   1. Verifies Node.js is installed.
REM   2. Runs build-all.mjs (pulls latest data from DATABASE_URL and
REM      builds dist\BK_Work_Schedule.xlsx).
REM   3. Verifies the Excel Trust Center "Trust access to the VBA project
REM      object model" setting is enabled, with friendly instructions if
REM      it is not.
REM   4. Runs Setup-Workbook.vbs to embed the VBA modules and produce
REM      dist\BK_Work_Schedule.xlsm.
REM   5. Copies the finished workbook to the user's Desktop.
REM
REM Just double-click this file from a Windows machine that has Excel,
REM Node.js and a populated .env (with DATABASE_URL) in the project root.
REM ====================================================================
setlocal enableextensions

REM ---- Run from the project root, regardless of where this is invoked
pushd "%~dp0..\.." >nul

echo.
echo ============================================================
echo  BK Work Schedule - One-Click Workbook Builder
echo ============================================================
echo.

REM ---- 1. Node.js check ---------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found on PATH.
    echo.
    echo   Please install Node.js LTS from https://nodejs.org/
    echo   then double-click this file again.
    echo.
    popd >nul
    pause
    exit /b 1
)

REM ---- 2. Build the .xlsx (uses --env-file if .env exists) ----------
set "ENVFLAG="
if exist ".env" set "ENVFLAG=--env-file=.env"

if "%ENVFLAG%"=="" (
    if "%DATABASE_URL%"=="" (
        echo [ERROR] No .env file found and DATABASE_URL is not set.
        echo.
        echo   Create a .env file in the project root containing:
        echo       DATABASE_URL=postgres://...
        echo   then double-click this file again.
        echo.
        popd >nul
        pause
        exit /b 1
    )
)

echo [1/4] Exporting latest data and building workbook...
echo --------------------------------------------------------
node %ENVFLAG% scripts\export-to-excel\build-all.mjs
if errorlevel 1 (
    echo.
    echo [ERROR] Build step failed. See messages above.
    popd >nul
    pause
    exit /b 1
)

REM ---- 3. Trust Center prerequisite check ---------------------------
echo.
echo [2/4] Checking Excel Trust Center settings...
echo --------------------------------------------------------
set "TRUSTOK=0"
for %%V in (16.0 15.0 14.0) do (
    for /f "tokens=2,*" %%A in ('reg query "HKCU\Software\Microsoft\Office\%%V\Excel\Security" /v AccessVBOM 2^>nul ^| find "AccessVBOM"') do (
        if /I "%%B"=="0x1" set "TRUSTOK=1"
    )
)

if "%TRUSTOK%"=="0" (
    echo.
    echo [ERROR] Excel "Trust access to the VBA project object model"
    echo         is NOT enabled. The VBA installer cannot run without it.
    echo.
    echo   One-time fix:
    echo     1. Open Excel
    echo     2. File ^> Options ^> Trust Center ^> Trust Center Settings
    echo     3. Macro Settings ^> CHECK
    echo        "Trust access to the VBA project object model"
    echo     4. Click OK, close Excel, then re-run this script.
    echo.
    popd >nul
    pause
    exit /b 1
)
echo OK - Trust access to the VBA project object model is enabled.

REM ---- 4. Embed VBA -> .xlsm ----------------------------------------
echo.
echo [3/4] Embedding VBA modules and saving as .xlsm...
echo --------------------------------------------------------
cscript //nologo scripts\export-to-excel\Setup-Workbook.vbs
if errorlevel 1 (
    echo.
    echo [ERROR] VBA embedding failed. See messages above.
    popd >nul
    pause
    exit /b 1
)

if not exist "dist\BK_Work_Schedule.xlsm" (
    echo.
    echo [ERROR] Expected dist\BK_Work_Schedule.xlsm was not produced.
    popd >nul
    pause
    exit /b 1
)

REM ---- 5. Copy to Desktop -------------------------------------------
echo.
echo [4/4] Copying finished workbook to your Desktop...
echo --------------------------------------------------------
set "DEST=%USERPROFILE%\Desktop\BK_Work_Schedule.xlsm"
copy /Y "dist\BK_Work_Schedule.xlsm" "%DEST%" >nul
if errorlevel 1 (
    echo [ERROR] Could not copy file to %DEST%.
    popd >nul
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Done! Your workbook is on the Desktop:
echo    %DEST%
echo ============================================================
echo.
popd >nul
pause
endlocal
