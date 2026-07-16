; Inno Setup Compiler Script
; Packages Krishna Print Agent as a Standalone Windows Installer (.exe)

[Setup]
AppName=Krishna Print Agent
AppVersion=1.0.2
DefaultDirName={commonpf}\KrishnaPrintHubAgent
DefaultGroupName=Krishna Print Hub
OutputDir=.
OutputBaseFilename=KrishnaPrintAgentSetup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: "KrishnaPrintAgent.jar"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Krishna Print Agent"; Filename: "javaw.exe"; Parameters: "-jar ""{app}\KrishnaPrintAgent.jar"""; WorkingDir: "{app}"
Name: "{commondesktop}\Krishna Print Agent"; Filename: "javaw.exe"; Parameters: "-jar ""{app}\KrishnaPrintAgent.jar"""; WorkingDir: "{app}"

[Run]
Filename: "javaw.exe"; Parameters: "-jar ""{app}\KrishnaPrintAgent.jar"""; Description: "Launch Print Agent Now"; Flags: postinstall nowait
