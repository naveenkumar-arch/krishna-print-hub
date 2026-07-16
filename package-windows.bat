@echo off
title Package Krishna Students Print Agent Installer
echo ==================================================
echo   PACKAGING WINDOWS NATIVE STANDALONE INSTALLER
echo ==================================================
echo.

:: 1. Compile Java Source Code
echo Compiling source files...
javac PrintAgent.java
if %errorlevel% neq 0 (
    echo [ERROR] Compilation failed. Ensure JDK is installed.
    pause
    exit /b %errorlevel%
)

:: 2. Package into a Runnable JAR File with embedded default config
echo Creating runnable JAR Archive with default config...
echo Main-Class: PrintAgent > manifest.txt
echo site_url=https://krishna-students-print-hub.vercel.app>default_config.properties
jar cfm KrishnaPrintAgent.jar manifest.txt PrintAgent*.class default_config.properties
del manifest.txt
del default_config.properties
del PrintAgent*.class

:: 3. Run Inno Setup Compiler if installed to package the .exe
echo Checking for Inno Setup compiler...
if not exist public\downloads mkdir public\downloads
set "INNO_PATH="
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "INNO_PATH=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles(x86)%\ISCC.exe" set "INNO_PATH=%ProgramFiles(x86)%\ISCC.exe"
if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "INNO_PATH=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles%\ISCC.exe" set "INNO_PATH=%ProgramFiles%\ISCC.exe"

if "%INNO_PATH%"=="" goto NO_INNO

echo Compiling Windows Installer executable (.exe)...
"%INNO_PATH%" setup.iss
copy /Y KrishnaPrintAgentSetup.exe public\downloads\KrishnaPrintAgentSetup.exe
copy /Y KrishnaPrintAgent.jar public\downloads\KrishnaPrintAgent.jar
echo.
echo ==================================================
echo   SUCCESS! Standalone Setup Installer Created:
echo   -^> public\downloads\KrishnaPrintAgentSetup.exe
echo ==================================================
goto END_BATCH

:NO_INNO
copy /Y KrishnaPrintAgent.jar public\downloads\KrishnaPrintAgent.jar
echo.
echo ==================================================
echo   JAR Packaged Successfully: public\downloads\KrishnaPrintAgent.jar
echo.
echo   [NOTE] To build the final "KrishnaPrintAgentSetup.exe":
echo   1. Install free Inno Setup (jrsoftware.org)
echo   2. Right-click setup.iss and choose "Compile"
echo ==================================================

:END_BATCH
pause
