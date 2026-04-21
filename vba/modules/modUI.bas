Attribute VB_Name = "modUI"
'==========================================================
' modUI — render the menu sheet and route navigation to the right screen
'==========================================================
Option Explicit

Private Const MENU_SHEET As String = "Menu"

Public Sub ShowMain()
    If Not modAuth.IsAuthenticated() Then
        modAuth.ClearSession
        frmLogin.Show
        If Not modAuth.IsAuthenticated() Then Exit Sub
    End If
    RenderMenu
    With ThisWorkbook.Worksheets(MENU_SHEET)
        .Visible = xlSheetVisible
        .Activate
    End With
End Sub

Public Sub RenderMenu()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets(MENU_SHEET)
    ws.Visible = xlSheetVisible
    ws.Cells.Clear
    ws.Buttons.Delete

    ws.Range("B2").Value = modI18n.T("app.title")
    ws.Range("B2").Font.Size = 22: ws.Range("B2").Font.Bold = True
    ws.Range("B3").Value = modI18n.T("app.subtitle") & "  —  " & modAuth.CurrentUser() & " (" & modAuth.CurrentRole() & ")"
    ws.Range("B3").Font.Italic = True
    ws.Range("B3").Font.Color = RGB(107, 114, 128)

    ' Each row: feature_key (empty = always allowed), label key, macro
    Dim items As Variant
    items = Array( _
        Array("work",          "menu.work",     "ShowWork"), _
        Array("roster",        "menu.roster",   "ShowRoster"), _
        Array("manager_req",   "menu.requests", "ShowManagerRequests"), _
        Array("swap_req",      "menu.swap",     "ShowSwapRequests"), _
        Array("sales_daily",   "menu.sales",    "ShowDailySales"), _
        Array("sales_weekly",  "menu.weekly",   "ShowWeeklySales"), _
        Array("labor",         "menu.labor",    "ShowLaborCost"), _
        Array("borrow",        "menu.borrow",   "ShowBorrowTracker"), _
        Array("announcements", "menu.announce", "ShowAnnouncements"), _
        Array("notifications", "menu.notify",   "ShowNotifications"), _
        Array("",              "menu.settings", "ShowSettings"), _
        Array("__admin__",     "menu.admin",    "ShowAdmin"), _
        Array("",              "menu.lang",     "modI18n.ToggleLanguage"), _
        Array("",              "menu.logout",   "DoLogout") _
    )

    Dim row As Long, col As Long, i As Long
    Dim itm As Variant
    Dim featKey As String
    row = 5: col = 2
    For i = LBound(items) To UBound(items)
        itm = items(i)
        featKey = CStr(itm(0))
        ' Permission gate
        If featKey = "__admin__" Then
            If Not modAuth.IsAdmin() Then GoTo NextItem
        ElseIf Len(featKey) > 0 Then
            If Not modAuth.HasFeature(featKey) Then GoTo NextItem
        End If
        AddMenuButton ws, ws.Cells(row, col), modI18n.T(CStr(itm(1))), CStr(itm(2))
        col = col + 3
        If col > 8 Then col = 2: row = row + 4
NextItem:
    Next i

    ws.Columns("B:J").ColumnWidth = 18
End Sub

Private Sub AddMenuButton(ws As Worksheet, anchor As Range, caption As String, macro As String)
    Dim btn As Button
    Set btn = ws.Buttons.Add(anchor.Left, anchor.Top, 200, 48)
    btn.Caption = caption
    btn.OnAction = macro
    btn.Font.Size = 12
    btn.Font.Bold = True
End Sub

Public Sub DoLogout()
    modAuth.Logout
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name <> "Welcome" Then ws.Visible = xlSheetHidden
    Next ws
    ThisWorkbook.Worksheets("Welcome").Visible = xlSheetVisible
    ThisWorkbook.Worksheets("Welcome").Activate
    frmLogin.Show
End Sub

' ----- Navigation entry points -----
' Every Show* sub is callable directly via Alt+F8 / button OnAction, so each
' must enforce its own permissions. RequireFeature/RequireManager raise on
' denial, so the sheet is never activated for an unauthorized caller.
Public Sub ShowWork()
    modAuth.RequireFeature "work":            modWork.Render:            Activate "Work"
End Sub
Public Sub ShowRoster()
    modAuth.RequireFeature "roster":          modRoster.Render:          Activate "Roster"
End Sub
Public Sub ShowManagerRequests()
    ' All staff can view/submit manager requests; only managers can
    ' approve/deny via SetStatus (guarded inside modRequests).
    modAuth.RequireFeature "manager_req":     modRequests.RenderManager: Activate "ManagerRequests"
End Sub
Public Sub ShowSwapRequests()
    modAuth.RequireFeature "swap_req":        modRequests.RenderSwap:    Activate "SwapRequests"
End Sub
Public Sub ShowDailySales()
    modAuth.RequireFeature "sales_daily":     modSales.RenderDaily:      Activate "DailySales"
End Sub
Public Sub ShowWeeklySales()
    modAuth.RequireFeature "sales_weekly":    modSales.RenderWeekly:     Activate "WeeklySales"
End Sub
Public Sub ShowLaborCost()
    modAuth.RequireFeature "labor":           modLabor.Render:           Activate "LaborCost"
End Sub
Public Sub ShowBorrowTracker()
    modAuth.RequireFeature "borrow":          modBorrow.Render:          Activate "BorrowTracker"
End Sub
Public Sub ShowAnnouncements()
    modAuth.RequireFeature "announcements":   modAnnouncements.Render:   Activate "Announcements"
End Sub
Public Sub ShowNotifications()
    modAuth.RequireFeature "notifications":   modNotifications.Render:   Activate "Notifications"
End Sub
Public Sub ShowSettings()
    If Not modAuth.IsAuthenticated() Then modAuth.RequireFeature "settings"
    modAdmin.RenderSettings:   Activate "Settings"
End Sub
Public Sub ShowAdmin()
    modAuth.RequireAdmin
    modAdmin.RenderAdmin
    Activate "Admin"
End Sub

Private Sub Activate(sheetName As String)
    ThisWorkbook.Worksheets(sheetName).Visible = xlSheetVisible
    ThisWorkbook.Worksheets(sheetName).Activate
End Sub
