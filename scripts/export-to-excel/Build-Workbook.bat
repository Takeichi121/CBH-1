@echo off
REM ====================================================================
REM Build-Workbook.bat - One-click Windows installer for the BK Work
REM Schedule macro-enabled workbook (.xlsm).
REM
REM What it does:
REM   1. Locates Node.js: prefers a system install, otherwise downloads
REM      a portable copy into scripts\export-to-excel\.node-portable\
REM      (one-time, ~30 MB) so the installer works on PCs without dev
REM      tools.
REM   2. Runs build-all.mjs (pulls latest data from DATABASE_URL and
REM      builds dist\BK_Work_Schedule.xlsx).
REM   3. Verifies the Excel Trust Center "Trust access to the VBA project
REM      object model" setting is enabled, with friendly instructions if
REM      it is not.
REM   4. Runs Setup-Workbook.vbs to embed the VBA modules and produce
REM      dist\BK_Work_Schedule.xlsm.
REM   5. Copies the finished workbook to the user's Desktop.
REM
REM Just double-click this file from a Windows machine that has Excel
REM and a populated .env (with DATABASE_URL) in the project root.
REM Node.js is downloaded automatically on first run if it is missing.
REM ====================================================================
setlocal enableextensions

REM ---- Run from the project root, regardless of where this is invoked
pushd "%~dp0..\.." >nul

echo.
echo ============================================================
echo  BK Work Schedule - One-Click Workbook Builder
echo ============================================================
echo.

REM ---- 1. Locate Node.js (system, then bundled portable copy) ------
REM    Preference order:
REM      a) node.exe already on PATH (developer / power-user machine)
REM      b) scripts\export-to-excel\.node-portable\node.exe (previously
REM         downloaded portable copy)
REM      c) Download a portable Node.js LTS zip from nodejs.org and
REM         extract it into (b), then use it.
REM    This keeps the installer truly one-click on stock front-of-house
REM    PCs that only have Excel installed.
set "PORTABLE_DIR=%~dp0.node-portable"
set "PORTABLE_NODE=%PORTABLE_DIR%\node.exe"
set "NODE_EXE="

where node >nul 2>&1
if not errorlevel 1 (
    set "NODE_EXE=node"
    goto :node_ready
)

if exist "%PORTABLE_NODE%" (
    set "NODE_EXE=%PORTABLE_NODE%"
    goto :node_ready
)

echo Node.js was not found on this PC.
echo Downloading a portable copy (one-time, ~30 MB) so the installer can
echo run without any extra setup. This may take a minute...
echo.

REM ---- Pinned Node.js version ---------------------------------------
REM To bump Node, change NODE_VER here. The matching SHASUMS256.txt is
REM fetched from nodejs.org alongside the zip and used to verify the
REM download before anything is extracted, so a tampered zip (e.g. from
REM a hostile proxy or a compromised mirror) is rejected.
set "NODE_VER=v20.18.0"

set "NODE_ARCH=x64"
if /I "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "NODE_ARCH=arm64"
if /I "%PROCESSOR_ARCHITECTURE%"=="x86" if "%PROCESSOR_ARCHITEW6432%"=="" set "NODE_ARCH=x86"
set "NODE_PKG=node-%NODE_VER%-win-%NODE_ARCH%"
set "NODE_ZIP=%NODE_PKG%.zip"
set "NODE_URL=https://nodejs.org/dist/%NODE_VER%/%NODE_ZIP%"
set "NODE_SHA_URL=https://nodejs.org/dist/%NODE_VER%/SHASUMS256.txt"
set "TMP_ZIP=%TEMP%\%NODE_ZIP%"
set "TMP_SHA=%TEMP%\node-%NODE_VER%-SHASUMS256.txt"

if not exist "%PORTABLE_DIR%" mkdir "%PORTABLE_DIR%" >nul 2>&1

REM Download zip + checksums, verify SHA-256, then extract.
REM On any failure (network, mismatch, extract) the temp zip + checksum
REM file and any partial extract folder are removed so the next run
REM starts clean and never uses an unverified binary.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue';" ^
    "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12;" ^
    "$zip='%TMP_ZIP%'; $sha='%TMP_SHA%'; $pkg='%NODE_ZIP%'; $extract='%PORTABLE_DIR%\_extract'; $pkgDir='%PORTABLE_DIR%\_extract\%NODE_PKG%';" ^
    "try {" ^
    "  Invoke-WebRequest -Uri '%NODE_URL%' -OutFile $zip;" ^
    "  Invoke-WebRequest -Uri '%NODE_SHA_URL%' -OutFile $sha;" ^
    "  $expectedLine = (Get-Content $sha) | Where-Object { $_ -match ('\s\*?' + [regex]::Escape($pkg) + '$') } | Select-Object -First 1;" ^
    "  if (-not $expectedLine) { throw ('No SHA-256 entry for ' + $pkg + ' in SHASUMS256.txt') };" ^
    "  $expected = ($expectedLine -split '\s+')[0].ToLower();" ^
    "  $actual = (Get-FileHash -Algorithm SHA256 -Path $zip).Hash.ToLower();" ^
    "  if ($actual -ne $expected) { throw ('SHA-256 mismatch for ' + $pkg + '. expected=' + $expected + ' actual=' + $actual) };" ^
    "  Write-Host ('SHA-256 OK (' + $expected + ')');" ^
    "  if (Test-Path $extract) { Remove-Item -Recurse -Force $extract };" ^
    "  Expand-Archive -Path $zip -DestinationPath $extract -Force;" ^
    "  Get-ChildItem -Path $pkgDir -Force | Move-Item -Destination '%PORTABLE_DIR%' -Force;" ^
    "  Remove-Item -Recurse -Force $extract;" ^
    "} catch {" ^
    "  if (Test-Path $extract) { Remove-Item -Recurse -Force $extract -ErrorAction SilentlyContinue };" ^
    "  Write-Host ('[ERROR] ' + $_.Exception.Message);" ^
    "  exit 1;" ^
    "} finally {" ^
    "  if (Test-Path $zip) { Remove-Item -Force $zip -ErrorAction SilentlyContinue };" ^
    "  if (Test-Path $sha) { Remove-Item -Force $sha -ErrorAction SilentlyContinue };" ^
    "}"
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to download or verify portable Node.js from
    echo         %NODE_URL%
    echo         (checksums: %NODE_SHA_URL%)
    echo.
    echo   This can mean:
    echo     - No internet, or a proxy is blocking nodejs.org.
    echo     - The downloaded zip's SHA-256 did not match the published
    echo       SHASUMS256.txt (possible tampering or corrupted download).
    echo.
    echo   Nothing was installed. Check your connection, or install Node.js
    echo   LTS manually from https://nodejs.org/ and re-run this script.
    echo.
    REM Make sure no half-installed portable copy is left behind.
    if exist "%PORTABLE_DIR%\_extract" rmdir /S /Q "%PORTABLE_DIR%\_extract" >nul 2>&1
    if not exist "%PORTABLE_NODE%" if exist "%PORTABLE_DIR%" rmdir /S /Q "%PORTABLE_DIR%" >nul 2>&1
    popd >nul
    pause
    exit /b 1
)

if not exist "%PORTABLE_NODE%" (
    echo [ERROR] Portable Node.js download finished but node.exe was not
    echo         found at %PORTABLE_NODE%.
    popd >nul
    pause
    exit /b 1
)
set "NODE_EXE=%PORTABLE_NODE%"
echo Portable Node.js installed at %PORTABLE_DIR%.
echo.

:node_ready
REM Make sure any child process that calls "node" also picks up the
REM portable copy (build-all.mjs spawns "node" by name).
if /I not "%NODE_EXE%"=="node" set "PATH=%PORTABLE_DIR%;%PATH%"

REM ---- 2. Build the .xlsx --------------------------------------------
REM Two ways to get fresh data into exports\csv\:
REM   (a) Direct DB pull when DATABASE_URL is available (.env or env var).
REM       Fastest, used by developers and the deployment server itself.
REM   (b) Authenticated HTTPS pull via /api/excel/exportCsvBundle, using
REM       the manager's existing username + password. Used on staff PCs
REM       that have no database credentials. The server URL + username
REM       are cached in %APPDATA%\bk-excel\config.json (NOT the password)
REM       so subsequent runs only re-prompt for the password.
set "ENVFLAG="
if exist ".env" set "ENVFLAG=--env-file=.env"

set "USE_REMOTE_FETCH=0"
if "%ENVFLAG%"=="" if "%DATABASE_URL%"=="" set "USE_REMOTE_FETCH=1"

if "%USE_REMOTE_FETCH%"=="1" (
    echo [1/4] No database URL found — fetching latest data from BK server...
    echo --------------------------------------------------------
    echo You will be asked for the BK server URL, your username, and your password.
    echo The password is NEVER saved; the URL and username are cached for next time.
    echo.
    "%NODE_EXE%" scripts\export-to-excel\fetch-csv-bundle.mjs
    if errorlevel 1 (
        echo.
        echo [ERROR] Could not fetch data from the BK server. See messages above.
        popd >nul
        pause
        exit /b 1
    )
    echo.
    echo Building workbook from fetched CSVs...
    echo --------------------------------------------------------
    "%NODE_EXE%" scripts\export-to-excel\build-workbook.mjs
    if errorlevel 1 (
        echo.
        echo [ERROR] Build step failed. See messages above.
        popd >nul
        pause
        exit /b 1
    )
) else (
    echo [1/4] Exporting latest data and building workbook...
    echo --------------------------------------------------------
    "%NODE_EXE%" %ENVFLAG% scripts\export-to-excel\build-all.mjs
    if errorlevel 1 (
        echo.
        echo [ERROR] Build step failed. See messages above.
        popd >nul
        pause
        exit /b 1
    )
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
