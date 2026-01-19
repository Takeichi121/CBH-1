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
    Case "DOB="
       ' two DOB to choose from, dated sub format or date format
       strDOB = CDate(Mid(str, Instr(str, "=")+1, Len(str)))
       datedDOB = concatZero(Year(strDOB)) & concatZero(Month(strDOB)) & concatZero(Day(strDOB))
  End Select
Loop
AlohaINI.close

'********************************************'
'***    Steps for End of the Day Script   ***
'********************************************
'If fso.FileExists(sysDrive & ":\Progra~1\NCRBackOffice\poll.flg") Then
 'fso.DeleteFile sysDrive & ":\Progra~1\NCRBackOffice\poll.flg", TRUE
'End if
'fso.DeleteFile IBERDIR & "\DCDM\DATA\gnd????.dbf", TRUE
'fso.DeleteFile IBERDIR & "\DCDM\DATA\gnd????.tdx", TRUE
'fso.DeleteFile IBERDIR & "\DCDM\DATA\gnd????.xxx", TRUE
'fso.DeleteFile IBERDIR & "\DCDM\DATA\gnd????.cdx", TRUE
'fso.DeleteFile IBERDIR & "\DCDM\DATA\gnd?????.Dbf", TRUE
'fso.DeleteFile IBERDIR & "\DCDM\DATA\gnd?????.xxx", TRUE
'fso.DeleteFile IBERDIR & "\DCDM\DATA\gnd?????.cdx", TRUE

If fso.FileExists(IBERDIR & "\BIN\grindq.exe") THEN
  oShell.Run IBERDIR & "\BIN\grindq /date data", 7, TRUE
End If

If Return = 0 Then
  oShell.Run sysDrive & ":\Progra~1\NCRBackOffice\BackOfficeSwitchboard\BackOfficeSwitchboard.exe /User autoPOS /Password otto /SiteID BKTH" & strStore & " /ImportID BK-GrindSales", 7, TRUE
End If

'fso.CopyFile sysDrive & ":\Progra~1\NCRBackOffice\mloption.ini", sysDrive & ":\Progra~1\NCRBackOffice\poll.flg", TRUE

Set oShell = nothing
Set fso = nothing
Set WshSysEnv = nothing

'********************************************
'*** Function to concanete leading zero's ***
'********************************************
Function concatZero(strDayNumber)
  If strDayNumber < 10 Then
    strDayNumber = "0" & strDayNumber
  End If
   concatZero = strDayNumber
End Function
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