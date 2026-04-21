Attribute VB_Name = "modRequests"
'==========================================================
' modRequests — manager_requests + swap_requests CRUD UI.
'
' manager_requests schema: id, request_type, request_date, requested_by,
'   start_time, end_time, day_off_reason, note, status, approved_by,
'   approved_at, rejection_reason, created_at, updated_at, store_id
'
' swap_requests schema: id, requester_username, requester_date,
'   target_username, target_date, status, created_at, updated_at,
'   approved_by, note, store_id
'==========================================================
Option Explicit

' ---------- Manager Requests ----------------------------------------------
Public Sub RenderManager()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("ManagerRequests")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("menu.requests")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    Dim btnNew As Button
    Set btnNew = ws.Buttons.Add(120, 18, 140, 24)
    btnNew.Caption = "+ " & modI18n.T("common.save")
    btnNew.OnAction = "modRequests.NewManagerRequest"

    Dim src As Worksheet: Set src = modData.DataSheet("manager_requests")
    Dim headers As Variant
    headers = Array("ID", modI18n.T("common.user"), modI18n.T("common.date"), _
                    "Type", "Reason", modI18n.T("common.status"), "Approver")
    Dim r As Long
    For r = 0 To UBound(headers)
        ws.Cells(4, 2 + r).Value = headers(r)
        ws.Cells(4, 2 + r).Font.Bold = True
        ws.Cells(4, 2 + r).Interior.Color = RGB(229, 231, 235)
    Next r
    If src Is Nothing Then Exit Sub

    Dim cReqBy As Long, cReqDate As Long, cType As Long, cReason As Long
    Dim cStatus As Long, cAppBy As Long
    cReqBy   = modAuth.HeaderCol(src, "requested_by")
    cReqDate = modAuth.HeaderCol(src, "request_date")
    cType    = modAuth.HeaderCol(src, "request_type")
    cReason  = modAuth.HeaderCol(src, "day_off_reason")
    cStatus  = modAuth.HeaderCol(src, "status")
    cAppBy   = modAuth.HeaderCol(src, "approved_by")

    Dim srcLast As Long: srcLast = src.Cells(src.Rows.Count, 1).End(xlUp).Row
    Dim dstRow As Long: dstRow = 5
    Dim i As Long
    For i = 2 To srcLast
        ws.Cells(dstRow, 2).Value = src.Cells(i, 1).Value
        ws.Cells(dstRow, 3).Value = src.Cells(i, cReqBy).Value
        ws.Cells(dstRow, 4).Value = src.Cells(i, cReqDate).Value
        ws.Cells(dstRow, 5).Value = src.Cells(i, cType).Value
        ws.Cells(dstRow, 6).Value = src.Cells(i, cReason).Value
        ws.Cells(dstRow, 7).Value = src.Cells(i, cStatus).Value
        ws.Cells(dstRow, 8).Value = src.Cells(i, cAppBy).Value
        If modAuth.IsManagerLike() And LCase$(CStr(src.Cells(i, cStatus).Value)) = "pending" Then
            AddApproveDeny ws, dstRow, 9, CLng(src.Cells(i, 1).Value), "manager_requests"
        End If
        dstRow = dstRow + 1
    Next i
    ws.Columns("B:J").AutoFit
    modWork.AddBackButton ws
End Sub

Public Sub NewManagerRequest()
    Dim t As String, d As String
    t = InputBox("Type (off / com / sick / late):", modI18n.T("menu.requests"), "off")
    If t = "" Then Exit Sub
    d = InputBox(modI18n.T("common.date") & " (yyyy-mm-dd)", , Format(Date, "yyyy-mm-dd"))
    If d = "" Then Exit Sub
    Dim reason As String: reason = InputBox(modI18n.T("common.note"), , "")
    Dim src As Worksheet: Set src = modData.DataSheet("manager_requests")
    src.Unprotect modAuth.PROTECT_PWD
    Dim r As Long: r = src.Cells(src.Rows.Count, 1).End(xlUp).Row + 1
    src.Cells(r, 1).Value = modData.NextId("manager_requests")
    src.Cells(r, modAuth.HeaderCol(src, "request_type")).Value = t
    src.Cells(r, modAuth.HeaderCol(src, "request_date")).Value = d
    src.Cells(r, modAuth.HeaderCol(src, "requested_by")).Value = modAuth.CurrentUser()
    src.Cells(r, modAuth.HeaderCol(src, "day_off_reason")).Value = reason
    src.Cells(r, modAuth.HeaderCol(src, "status")).Value = "pending"
    src.Cells(r, modAuth.HeaderCol(src, "created_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Cells(r, modAuth.HeaderCol(src, "updated_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Cells(r, modAuth.HeaderCol(src, "store_id")).Value = modAuth.CurrentStore()
    src.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "manager_request_new", modAuth.CurrentUser(), t & "/" & d
    RenderManager
End Sub

' ---------- Swap Requests --------------------------------------------------
Public Sub RenderSwap()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("SwapRequests")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("menu.swap")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    Dim btn As Button
    Set btn = ws.Buttons.Add(120, 18, 140, 24)
    btn.Caption = "+ " & modI18n.T("common.save")
    btn.OnAction = "modRequests.NewSwapRequest"

    Dim src As Worksheet: Set src = modData.DataSheet("swap_requests")
    Dim headers As Variant
    headers = Array("ID", "From", "From date", "To", "To date", _
                    modI18n.T("common.status"), "Approver")
    Dim r As Long
    For r = 0 To UBound(headers)
        ws.Cells(4, 2 + r).Value = headers(r)
        ws.Cells(4, 2 + r).Font.Bold = True
        ws.Cells(4, 2 + r).Interior.Color = RGB(229, 231, 235)
    Next r
    If src Is Nothing Then Exit Sub

    Dim cFrom As Long, cFromD As Long, cTo As Long, cToD As Long, cSt As Long, cAppBy As Long
    cFrom  = modAuth.HeaderCol(src, "requester_username")
    cFromD = modAuth.HeaderCol(src, "requester_date")
    cTo    = modAuth.HeaderCol(src, "target_username")
    cToD   = modAuth.HeaderCol(src, "target_date")
    cSt    = modAuth.HeaderCol(src, "status")
    cAppBy = modAuth.HeaderCol(src, "approved_by")

    Dim srcLast As Long: srcLast = src.Cells(src.Rows.Count, 1).End(xlUp).Row
    Dim dstRow As Long: dstRow = 5
    Dim i As Long
    For i = 2 To srcLast
        ws.Cells(dstRow, 2).Value = src.Cells(i, 1).Value
        ws.Cells(dstRow, 3).Value = src.Cells(i, cFrom).Value
        ws.Cells(dstRow, 4).Value = src.Cells(i, cFromD).Value
        ws.Cells(dstRow, 5).Value = src.Cells(i, cTo).Value
        ws.Cells(dstRow, 6).Value = src.Cells(i, cToD).Value
        ws.Cells(dstRow, 7).Value = src.Cells(i, cSt).Value
        ws.Cells(dstRow, 8).Value = src.Cells(i, cAppBy).Value
        If modAuth.IsManagerLike() And LCase$(CStr(src.Cells(i, cSt).Value)) = "pending" Then
            AddApproveDeny ws, dstRow, 9, CLng(src.Cells(i, 1).Value), "swap_requests"
        End If
        dstRow = dstRow + 1
    Next i
    ws.Columns("B:J").AutoFit
    modWork.AddBackButton ws
End Sub

Public Sub NewSwapRequest()
    Dim toUser As String: toUser = InputBox("Swap with (username):")
    If toUser = "" Then Exit Sub
    Dim myDate As String: myDate = InputBox("My date (yyyy-mm-dd):", , Format(Date, "yyyy-mm-dd"))
    If myDate = "" Then Exit Sub
    Dim toDate As String: toDate = InputBox("Their date (yyyy-mm-dd):", , Format(Date + 1, "yyyy-mm-dd"))
    If toDate = "" Then Exit Sub
    Dim note As String: note = InputBox(modI18n.T("common.note"), , "")
    Dim src As Worksheet: Set src = modData.DataSheet("swap_requests")
    src.Unprotect modAuth.PROTECT_PWD
    Dim r As Long: r = src.Cells(src.Rows.Count, 1).End(xlUp).Row + 1
    src.Cells(r, 1).Value = modData.NextId("swap_requests")
    src.Cells(r, modAuth.HeaderCol(src, "requester_username")).Value = modAuth.CurrentUser()
    src.Cells(r, modAuth.HeaderCol(src, "requester_date")).Value = myDate
    src.Cells(r, modAuth.HeaderCol(src, "target_username")).Value = toUser
    src.Cells(r, modAuth.HeaderCol(src, "target_date")).Value = toDate
    src.Cells(r, modAuth.HeaderCol(src, "status")).Value = "pending"
    src.Cells(r, modAuth.HeaderCol(src, "note")).Value = note
    src.Cells(r, modAuth.HeaderCol(src, "created_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Cells(r, modAuth.HeaderCol(src, "updated_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Cells(r, modAuth.HeaderCol(src, "store_id")).Value = modAuth.CurrentStore()
    src.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "swap_request_new", modAuth.CurrentUser(), myDate & "<->" & toUser & ":" & toDate
    RenderSwap
End Sub

' ---------- Approve / Deny -----------------------------------------------
Private Sub AddApproveDeny(ws As Worksheet, row As Long, col As Long, id As Long, table As String)
    Dim a As Button, d As Button
    Dim cell As Range: Set cell = ws.Cells(row, col)
    Set a = ws.Buttons.Add(cell.Left, cell.Top, 60, 18)
    a.Caption = "✓"
    a.OnAction = "'modRequests.SetStatus """ & table & """, " & id & ", ""approved""'"
    Set d = ws.Buttons.Add(cell.Left + 64, cell.Top, 60, 18)
    d.Caption = "✗"
    d.OnAction = "'modRequests.SetStatus """ & table & """, " & id & ", ""denied""'"
End Sub

Public Sub SetStatus(table As String, id As Long, newStatus As String)
    modAuth.RequireManager
    modData.UpdateCell table, id, "status", newStatus
    modData.UpdateCell table, id, "approved_by", modAuth.CurrentUser()
    modData.UpdateCell table, id, "approved_at", Format(Now, "yyyy-mm-dd hh:nn:ss")
    modData.UpdateCell table, id, "updated_at", Format(Now, "yyyy-mm-dd hh:nn:ss")
    If newStatus = "denied" Then
        Dim reason As String: reason = InputBox("Rejection reason (optional):")
        If reason <> "" Then modData.UpdateCell table, id, "rejection_reason", reason
    End If
    modSysLog.Log table & ":" & newStatus, modAuth.CurrentUser(), CStr(id)
    modNotifications.Push "*", table & " #" & id & " -> " & newStatus
    If table = "manager_requests" Then RenderManager Else RenderSwap
End Sub
