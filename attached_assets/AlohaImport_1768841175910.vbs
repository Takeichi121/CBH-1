On Error Resume Next

'********************************************
'***   Create Objects and Set Variables   ***
'********************************************
Set oShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
Set WshSysEnv = oShell.Environment("SYSTEM")

IBERDIR = WshSysEnv("IBERDIR")
IBERDRV = Left(IBERDIR, 1)
sysRoot = oShell.RegRead("HKLM\Software\Microsoft\Windows NT\CurrentVersion\SystemRoot")
sysDrive = Left(sysRoot, 1)
DesktopPath = oShell.SpecialFolders("Desktop")

tstTime = Hour(Time)
tstDayName = WeekDayName(WeekDay(Now()))

Const ForReading = 1
Set AlohaINI = fso.OpenTextFile(IBERDIR & "\Data\Aloha.ini")

Do Until AlohaINI.AtEndofStream
  str = AlohaINI.ReadLine
  Select Case Left(str, Instr(str, "="))
    Case "UNITNUMBER="
       strStore = Mid(str, Instr(str, "=")+1, Len(str))
  End Select
Loop
AlohaINI.close

'*****************************************************
'***   Deleted Grind Steps from Real Time Script   ***
'*****************************************************

If Return = 0 Then
  oShell.Run sysDrive & ":\Progra~1\NCRBackOffice\BackOfficeSwitchboard\BackOfficeSwitchboard.exe /User autoPOS /Password otto /SiteID BKTH" & strStore & " /ImportID BK-EOD", 7, TRUE
End If

Set oShell = nothing
Set fso = nothing
Set WshSysEnv = nothing

'********************************************
'***            Error Functions           ***
'********************************************
Function ReturnError(intErr)
  Select Case intErr
    Case "0"
	intErr = 0
    Case "2147344384"
	intErr = 0
    Case "-1"
	MsgBox "Error: " & intErr & ", send an email to support@menulink.net"
    Case "-2"
      MsgBox "This process can only be run on the store computer"
    Case Else
	MsgBox "Error: " & intErr & ", send an email to support@menulink.net"
  End Select
  ReturnError = intErr
End Function