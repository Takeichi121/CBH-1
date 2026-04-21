Attribute VB_Name = "modNotifications"
'==========================================================
' modNotifications.
' Schema: id, recipient_username, type, title, title_th, message,
'         message_th, related_id, is_read, created_at, created_by
'==========================================================
Option Explicit

Public Sub Render()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Notifications")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("menu.notify")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    Dim src As Worksheet: Set src = modData.DataSheet("notifications")
    Dim headers As Variant
    headers = Array("ID", "Recipient", modI18n.T("common.date"), "Title", "Message", "Read")
    Dim h As Long
    For h = 0 To UBound(headers)
        ws.Cells(4, 2 + h).Value = headers(h)
        ws.Cells(4, 2 + h).Font.Bold = True
        ws.Cells(4, 2 + h).Interior.Color = RGB(229, 231, 235)
    Next h
    If src Is Nothing Then Exit Sub

    Dim isTh As Boolean: isTh = (modAuth.CurrentLang() = "th")
    Dim cRcpt As Long, cTitle As Long, cTitleTh As Long
    Dim cMsg As Long, cMsgTh As Long, cAt As Long, cRead As Long
    cRcpt    = modAuth.HeaderCol(src, "recipient_username")
    cTitle   = modAuth.HeaderCol(src, "title")
    cTitleTh = modAuth.HeaderCol(src, "title_th")
    cMsg     = modAuth.HeaderCol(src, "message")
    cMsgTh   = modAuth.HeaderCol(src, "message_th")
    cAt      = modAuth.HeaderCol(src, "created_at")
    cRead    = modAuth.HeaderCol(src, "is_read")

    Dim u As String: u = modAuth.CurrentUser()
    Dim lastRow As Long: lastRow = src.Cells(src.Rows.Count, 1).End(xlUp).Row
    Dim r As Long, dst As Long: dst = 5
    For r = 2 To lastRow
        Dim rcpt As String: rcpt = CStr(src.Cells(r, cRcpt).Value)
        If rcpt = u Or rcpt = "*" Or rcpt = "" Then
            ws.Cells(dst, 2).Value = src.Cells(r, 1).Value
            ws.Cells(dst, 3).Value = rcpt
            ws.Cells(dst, 4).Value = src.Cells(r, cAt).Value
            ws.Cells(dst, 5).Value = IIf(isTh And CStr(src.Cells(r, cTitleTh).Value) <> "", _
                                         src.Cells(r, cTitleTh).Value, src.Cells(r, cTitle).Value)
            ws.Cells(dst, 6).Value = IIf(isTh And CStr(src.Cells(r, cMsgTh).Value) <> "", _
                                         src.Cells(r, cMsgTh).Value, src.Cells(r, cMsg).Value)
            ws.Cells(dst, 7).Value = src.Cells(r, cRead).Value
            dst = dst + 1
        End If
    Next r
    ws.Columns("B:G").AutoFit
    modWork.AddBackButton ws
End Sub

' Push a notification. recipient = "*" for broadcast, or a username.
Public Sub Push(recipient As String, message As String, Optional title As String = "Notice")
    Dim src As Worksheet: Set src = modData.DataSheet("notifications")
    src.Unprotect modAuth.PROTECT_PWD
    Dim r As Long: r = src.Cells(src.Rows.Count, 1).End(xlUp).Row + 1
    src.Cells(r, 1).Value = modData.NextId("notifications")
    src.Cells(r, modAuth.HeaderCol(src, "recipient_username")).Value = recipient
    src.Cells(r, modAuth.HeaderCol(src, "type")).Value = "info"
    src.Cells(r, modAuth.HeaderCol(src, "title")).Value = title
    src.Cells(r, modAuth.HeaderCol(src, "title_th")).Value = title
    src.Cells(r, modAuth.HeaderCol(src, "message")).Value = message
    src.Cells(r, modAuth.HeaderCol(src, "message_th")).Value = message
    src.Cells(r, modAuth.HeaderCol(src, "is_read")).Value = 0
    src.Cells(r, modAuth.HeaderCol(src, "created_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Cells(r, modAuth.HeaderCol(src, "created_by")).Value = modAuth.CurrentUser()
    src.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
End Sub
