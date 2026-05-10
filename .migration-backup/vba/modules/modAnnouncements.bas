Attribute VB_Name = "modAnnouncements"
'==========================================================
' modAnnouncements — list + post announcements.
' Schema: id, title, title_th, content, content_th, priority,
'         target_audience, is_pinned, expires_at, created_at, created_by,
'         updated_at, store_id
'==========================================================
Option Explicit

Public Sub Render()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Announcements")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("menu.announce")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    If modAuth.IsManagerLike() Then
        Dim btn As Button
        Set btn = ws.Buttons.Add(20, 50, 140, 26)
        btn.Caption = "+ " & modI18n.T("common.save")
        btn.OnAction = "modAnnouncements.NewPost"
    End If

    Dim src As Worksheet: Set src = modData.DataSheet("announcements")
    Dim headers As Variant
    headers = Array("ID", "Title", "Content", "Priority", "Pinned", _
                    modI18n.T("common.user"), modI18n.T("common.date"))
    Dim h As Long
    For h = 0 To UBound(headers)
        ws.Cells(5, 2 + h).Value = headers(h)
        ws.Cells(5, 2 + h).Font.Bold = True
        ws.Cells(5, 2 + h).Interior.Color = RGB(229, 231, 235)
    Next h
    If src Is Nothing Then Exit Sub
    Dim isTh As Boolean: isTh = (modAuth.CurrentLang() = "th")
    Dim cTitle As Long, cTitleTh As Long, cBody As Long, cBodyTh As Long
    Dim cPri As Long, cPin As Long, cBy As Long, cAt As Long
    cTitle   = modAuth.HeaderCol(src, "title")
    cTitleTh = modAuth.HeaderCol(src, "title_th")
    cBody    = modAuth.HeaderCol(src, "content")
    cBodyTh  = modAuth.HeaderCol(src, "content_th")
    cPri     = modAuth.HeaderCol(src, "priority")
    cPin     = modAuth.HeaderCol(src, "is_pinned")
    cBy      = modAuth.HeaderCol(src, "created_by")
    cAt      = modAuth.HeaderCol(src, "created_at")

    Dim lastRow As Long: lastRow = src.Cells(src.Rows.Count, 1).End(xlUp).Row
    Dim r As Long, dst As Long: dst = 6
    For r = 2 To lastRow
        ws.Cells(dst, 2).Value = src.Cells(r, 1).Value
        ws.Cells(dst, 3).Value = IIf(isTh And CStr(src.Cells(r, cTitleTh).Value) <> "", _
                                     src.Cells(r, cTitleTh).Value, src.Cells(r, cTitle).Value)
        ws.Cells(dst, 4).Value = IIf(isTh And CStr(src.Cells(r, cBodyTh).Value) <> "", _
                                     src.Cells(r, cBodyTh).Value, src.Cells(r, cBody).Value)
        ws.Cells(dst, 5).Value = src.Cells(r, cPri).Value
        ws.Cells(dst, 6).Value = src.Cells(r, cPin).Value
        ws.Cells(dst, 7).Value = src.Cells(r, cBy).Value
        ws.Cells(dst, 8).Value = src.Cells(r, cAt).Value
        dst = dst + 1
    Next r
    ws.Columns("B:H").AutoFit
    modWork.AddBackButton ws
End Sub

Public Sub NewPost()
    modAuth.RequireManager
    Dim title As String: title = InputBox("Title (English):")
    If title = "" Then Exit Sub
    Dim titleTh As String: titleTh = InputBox("หัวข้อ (Thai):", , title)
    Dim body As String: body = InputBox("Content (English):")
    Dim bodyTh As String: bodyTh = InputBox("เนื้อหา (Thai):", , body)
    Dim pri As String: pri = InputBox("Priority (low/normal/high):", , "normal")
    Dim src As Worksheet: Set src = modData.DataSheet("announcements")
    src.Unprotect modAuth.PROTECT_PWD
    Dim r As Long: r = src.Cells(src.Rows.Count, 1).End(xlUp).Row + 1
    src.Cells(r, 1).Value = modData.NextId("announcements")
    src.Cells(r, modAuth.HeaderCol(src, "title")).Value = title
    src.Cells(r, modAuth.HeaderCol(src, "title_th")).Value = titleTh
    src.Cells(r, modAuth.HeaderCol(src, "content")).Value = body
    src.Cells(r, modAuth.HeaderCol(src, "content_th")).Value = bodyTh
    src.Cells(r, modAuth.HeaderCol(src, "priority")).Value = pri
    src.Cells(r, modAuth.HeaderCol(src, "target_audience")).Value = "all"
    src.Cells(r, modAuth.HeaderCol(src, "is_pinned")).Value = 0
    src.Cells(r, modAuth.HeaderCol(src, "created_by")).Value = modAuth.CurrentUser()
    src.Cells(r, modAuth.HeaderCol(src, "created_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Cells(r, modAuth.HeaderCol(src, "updated_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Cells(r, modAuth.HeaderCol(src, "store_id")).Value = modAuth.CurrentStore()
    src.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modNotifications.Push "*", "New announcement: " & title
    Render
End Sub
