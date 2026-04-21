Attribute VB_Name = "modRoster"
'==========================================================
' modRoster — weekly roster grid (users × days). Managers can edit/delete
' the booked shift in any cell.
'==========================================================
Option Explicit

Public Sub Render()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Roster")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("roster.title")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    Dim wkStart As Date: wkStart = modWork.WeekStart(Date)
    Dim i As Long
    ws.Cells(4, 2).Value = modI18n.T("common.user")
    For i = 0 To 6
        ws.Cells(4, 3 + i).Value = Format(wkStart + i, "ddd dd-mmm")
        ws.Cells(4, 3 + i).Font.Bold = True
    Next i

    Dim usrs As Worksheet: Set usrs = modData.DataSheet("users")
    Dim uActiveCol As Long: uActiveCol = modAuth.HeaderCol(usrs, "active")
    Dim uNickCol As Long:   uNickCol   = modAuth.HeaderCol(usrs, "nick_name")
    Dim lastUser As Long: lastUser = usrs.Cells(usrs.Rows.Count, 1).End(xlUp).Row
    Dim r As Long: r = 5
    Dim u As Long
    For u = 2 To lastUser
        Dim username As String: username = CStr(usrs.Cells(u, 1).Value)
        Dim active As String: active = IIf(uActiveCol = 0, "1", CStr(usrs.Cells(u, uActiveCol).Value))
        If active = "1" Or active = "true" Then
            Dim nick As String
            If uNickCol > 0 Then nick = CStr(usrs.Cells(u, uNickCol).Value)
            ws.Cells(r, 2).Value = username & IIf(nick <> "", " (" & nick & ")", "")
            For i = 0 To 6
                Dim dt As Date: dt = wkStart + i
                Dim shiftId As Long, lbl As String
                lbl = ShiftLabel(username, dt, shiftId)
                Dim cell As Range: Set cell = ws.Cells(r, 3 + i)
                cell.Value = lbl
                cell.HorizontalAlignment = xlCenter
                If modAuth.IsManagerLike() And shiftId > 0 Then
                    Dim eb As Button, db As Button
                    Set eb = ws.Buttons.Add(cell.Left + cell.Width - 32, cell.Top, 14, 14)
                    eb.Caption = "e"
                    eb.OnAction = "'modRoster.EditShift " & shiftId & "'"
                    Set db = ws.Buttons.Add(cell.Left + cell.Width - 16, cell.Top, 14, 14)
                    db.Caption = "x"
                    db.OnAction = "'modRoster.DeleteShift " & shiftId & "'"
                End If
            Next i
            r = r + 1
        End If
    Next u

    ws.Columns("B:I").AutoFit
    modWork.AddBackButton ws
End Sub

Public Sub DeleteShift(id As Long)
    modAuth.RequireManager
    If MsgBox("Delete this shift?", vbYesNo + vbExclamation) <> vbYes Then Exit Sub
    modData.DeleteRow "shifts", id
    modSysLog.Log "shift_delete", modAuth.CurrentUser(), CStr(id)
    Render
End Sub

Public Sub EditShift(id As Long)
    modAuth.RequireManager
    Dim ws As Worksheet: Set ws = modData.DataSheet("shifts")
    Dim r As Long: r = modData.FindRowById("shifts", id)
    If r = 0 Then Exit Sub
    Dim gCol As Long, sCol As Long, eCol As Long, nCol As Long
    gCol = modAuth.HeaderCol(ws, "shift_group")
    sCol = modAuth.HeaderCol(ws, "start_time")
    eCol = modAuth.HeaderCol(ws, "end_time")
    nCol = modAuth.HeaderCol(ws, "note")
    Dim newGrp As String: newGrp = InputBox("Shift group:", , CStr(ws.Cells(r, gCol).Value))
    If newGrp = "" Then Exit Sub
    Dim newStart As String: newStart = InputBox("Start (HH:MM):", , CStr(ws.Cells(r, sCol).Value))
    Dim newEnd As String: newEnd = InputBox("End (HH:MM):", , CStr(ws.Cells(r, eCol).Value))
    Dim newNote As String: newNote = InputBox("Note:", , CStr(ws.Cells(r, nCol).Value))
    modData.UpdateCell "shifts", id, "shift_group", newGrp
    modData.UpdateCell "shifts", id, "start_time", newStart
    modData.UpdateCell "shifts", id, "end_time", newEnd
    modData.UpdateCell "shifts", id, "note", newNote
    modData.UpdateCell "shifts", id, "updated_at", Format(Now, "yyyy-mm-dd hh:nn:ss")
    modData.UpdateCell "shifts", id, "updated_by", modAuth.CurrentUser()
    modSysLog.Log "shift_edit", modAuth.CurrentUser(), CStr(id)
    Render
End Sub

Private Function ShiftLabel(username As String, dt As Date, ByRef firstId As Long) As String
    firstId = 0
    Dim ws As Worksheet: Set ws = modData.DataSheet("shifts")
    Dim uCol As Long, dCol As Long, gCol As Long
    uCol = modAuth.HeaderCol(ws, "username")
    dCol = modAuth.HeaderCol(ws, "date")
    gCol = modAuth.HeaderCol(ws, "shift_group")
    Dim lastRow As Long: lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    Dim i As Long, out As String
    For i = 2 To lastRow
        If CStr(ws.Cells(i, uCol).Value) = username _
           And CStr(ws.Cells(i, dCol).Value) = Format(dt, "yyyy-mm-dd") Then
            If out <> "" Then out = out & ", "
            out = out & CStr(ws.Cells(i, gCol).Value)
            If firstId = 0 Then firstId = CLng(ws.Cells(i, 1).Value)
        End If
    Next i
    ShiftLabel = out
End Function
