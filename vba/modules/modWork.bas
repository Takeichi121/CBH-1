Attribute VB_Name = "modWork"
'==========================================================
' modWork — book my shift (Tue–Mon week, capacity-aware, maintenance window)
'==========================================================
Option Explicit

Public Function IsMaintenance() As Boolean
    ' Tuesday 12:00 (Asia/Bangkok) -> Wednesday 00:00 booking is closed.
    Dim d As Date: d = Now
    Dim wd As Long: wd = Weekday(d, vbSunday)
    ' vbSunday=1, Tuesday=3, Wednesday=4
    If wd = 3 And Hour(d) >= 12 Then IsMaintenance = True: Exit Function
    If wd = 4 Then IsMaintenance = True: Exit Function
    IsMaintenance = (LCase$(modAuth.StateGet("maintenance_enabled")) = "true")
End Function

Public Function WeekStart(d As Date) As Date
    ' Tuesday-based week
    Dim wd As Long: wd = Weekday(d, vbSunday) ' Sun=1..Sat=7
    Dim diff As Long
    Select Case wd
        Case 3: diff = 0          ' Tue
        Case 4: diff = 1          ' Wed
        Case 5: diff = 2
        Case 6: diff = 3
        Case 7: diff = 4
        Case 1: diff = 5          ' Sun
        Case 2: diff = 6          ' Mon
    End Select
    WeekStart = DateSerial(Year(d), Month(d), Day(d) - diff)
End Function

Public Function GroupCapacity(groupKey As String) As Long
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("ShiftGroups")
    Dim c As Range: Set c = ws.Columns(1).Find(What:=groupKey, LookAt:=xlWhole, MatchCase:=False)
    If c Is Nothing Then GroupCapacity = 0: Exit Function
    GroupCapacity = CLng(ws.Cells(c.Row, 6).Value)
End Function

Public Function CountBooked(theDate As Date, groupKey As String) As Long
    Dim ws As Worksheet: Set ws = modData.DataSheet("shifts")
    If ws Is Nothing Then CountBooked = 0: Exit Function
    Dim dCol As Long, gCol As Long, lastRow As Long, i As Long, n As Long
    dCol = modAuth.HeaderCol(ws, "date"): gCol = modAuth.HeaderCol(ws, "shift_group")
    If dCol = 0 Or gCol = 0 Then Exit Function
    lastRow = ws.Cells(ws.Rows.Count, dCol).End(xlUp).Row
    For i = 2 To lastRow
        If CStr(ws.Cells(i, dCol).Value) = Format(theDate, "yyyy-mm-dd") _
           And CStr(ws.Cells(i, gCol).Value) = groupKey Then n = n + 1
    Next i
    CountBooked = n
End Function

Public Sub Render()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Work")
    ws.Cells.Clear: ws.Buttons.Delete

    ws.Range("B2").Value = modI18n.T("work.title"):  ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True
    If IsMaintenance() Then
        ws.Range("B4").Value = modI18n.T("work.maintenance")
        ws.Range("B4").Font.Color = RGB(220, 38, 38): ws.Range("B4").Font.Bold = True
    End If

    ' Header: 7 days starting WeekStart(today)
    Dim wkStart As Date: wkStart = WeekStart(Date)
    Dim col As Long: col = 3
    ws.Cells(6, 2).Value = modI18n.T("work.shift_group")
    Dim i As Long
    For i = 0 To 6
        ws.Cells(6, col + i).Value = Format(wkStart + i, "ddd dd-mmm")
        ws.Cells(6, col + i).Font.Bold = True
    Next i

    ' Rows: shift groups
    Dim grp As Worksheet: Set grp = ThisWorkbook.Worksheets("ShiftGroups")
    Dim lastG As Long: lastG = grp.Cells(grp.Rows.Count, 1).End(xlUp).Row
    Dim r As Long: r = 7
    Dim g As Long
    For g = 2 To lastG
        Dim gKey As String, gLabel As String, cap As Long
        gKey = CStr(grp.Cells(g, 1).Value)
        gLabel = IIf(modAuth.CurrentLang() = "th", grp.Cells(g, 3).Value, grp.Cells(g, 2).Value)
        cap = CLng(grp.Cells(g, 6).Value)
        ws.Cells(r, 2).Value = gLabel & " (cap " & cap & ")"
        For i = 0 To 6
            Dim dt As Date: dt = wkStart + i
            Dim n As Long: n = CountBooked(dt, gKey)
            Dim cell As Range: Set cell = ws.Cells(r, col + i)
            cell.Value = n & "/" & cap
            cell.HorizontalAlignment = xlCenter
            If n >= cap Then
                cell.Interior.Color = RGB(254, 226, 226)
            Else
                cell.Interior.Color = RGB(220, 252, 231)
            End If
            ' Add a tiny "Book" button
            If Not IsMaintenance() And n < cap Then
                Dim btn As Button
                Set btn = ws.Buttons.Add(cell.Left + cell.Width - 38, cell.Top + 2, 36, 16)
                btn.Caption = "+"
                btn.OnAction = "'modWork.BookFromButton """ & Format(dt, "yyyy-mm-dd") & """, """ & gKey & """'"
            End If
        Next i
        r = r + 2
    Next g

    AddBackButton ws
End Sub

Public Sub BookFromButton(dateStr As String, groupKey As String)
    If IsMaintenance() Then MsgBox modI18n.T("work.maintenance"), vbExclamation: Exit Sub
    Dim dt As Date: dt = CDate(dateStr)
    Dim cap As Long: cap = GroupCapacity(groupKey)
    Dim n As Long: n = CountBooked(dt, groupKey)
    If n >= cap Then MsgBox modI18n.T("work.capacity_full"), vbExclamation: Exit Sub
    ' Build row: id, date, shift_group, username, start, end, status, created_at
    Dim grp As Worksheet: Set grp = ThisWorkbook.Worksheets("ShiftGroups")
    Dim c As Range: Set c = grp.Columns(1).Find(groupKey, , , xlWhole)
    Dim startT As String, endT As String
    startT = CStr(grp.Cells(c.Row, 4).Value): endT = CStr(grp.Cells(c.Row, 5).Value)
    ' Schema: id, date, username, full_name, role, shift_group, start_time,
    ' end_time, note, created_at, updated_at, updated_by, nick_name, store_id
    Dim src As Worksheet: Set src = modData.DataSheet("shifts")
    src.Unprotect modAuth.PROTECT_PWD
    Dim r As Long: r = src.Cells(src.Rows.Count, 1).End(xlUp).Row + 1
    src.Cells(r, 1).Value = modData.NextId("shifts")
    src.Cells(r, modAuth.HeaderCol(src, "date")).Value = Format(dt, "yyyy-mm-dd")
    src.Cells(r, modAuth.HeaderCol(src, "username")).Value = modAuth.CurrentUser()
    src.Cells(r, modAuth.HeaderCol(src, "role")).Value = modAuth.CurrentRole()
    src.Cells(r, modAuth.HeaderCol(src, "shift_group")).Value = groupKey
    src.Cells(r, modAuth.HeaderCol(src, "start_time")).Value = startT
    src.Cells(r, modAuth.HeaderCol(src, "end_time")).Value = endT
    src.Cells(r, modAuth.HeaderCol(src, "created_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Cells(r, modAuth.HeaderCol(src, "updated_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Cells(r, modAuth.HeaderCol(src, "updated_by")).Value = modAuth.CurrentUser()
    src.Cells(r, modAuth.HeaderCol(src, "store_id")).Value = modAuth.CurrentStore()
    ' Best-effort copy full_name + nick_name from data_users
    Dim usrs As Worksheet: Set usrs = modData.DataSheet("users")
    Dim cu As Range: Set cu = usrs.Columns(1).Find(modAuth.CurrentUser(), , , xlWhole)
    If Not cu Is Nothing Then
        Dim fnc As Long: fnc = modAuth.HeaderCol(usrs, "full_name")
        Dim nnc As Long: nnc = modAuth.HeaderCol(usrs, "nick_name")
        If fnc > 0 Then src.Cells(r, modAuth.HeaderCol(src, "full_name")).Value = usrs.Cells(cu.Row, fnc).Value
        If nnc > 0 Then src.Cells(r, modAuth.HeaderCol(src, "nick_name")).Value = usrs.Cells(cu.Row, nnc).Value
    End If
    src.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "shift_book", modAuth.CurrentUser(), dateStr & "/" & groupKey
    MsgBox modI18n.T("common.success"), vbInformation
    Render
End Sub

Public Sub AddBackButton(ws As Worksheet)
    Dim btn As Button
    Set btn = ws.Buttons.Add(20, 20, 80, 24)
    btn.Caption = "← " & modI18n.T("common.back")
    btn.OnAction = "modUI.ShowMain"
End Sub
