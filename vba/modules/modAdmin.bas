Attribute VB_Name = "modAdmin"
'==========================================================
' modAdmin — Settings (per-user) and Admin (per-system) screens
'==========================================================
Option Explicit

Public Sub RenderSettings()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Settings")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("menu.settings"): ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    ws.Range("B4").Value = modI18n.T("common.user") & ":"
    ws.Range("C4").Value = modAuth.CurrentUser() & "  (" & modAuth.CurrentRole() & ")"

    Dim btn As Button
    Set btn = ws.Buttons.Add(20, 60, 200, 26)
    btn.Caption = modI18n.T("admin.reset_pwd"): btn.OnAction = "modAdmin.ChangeMyPassword"

    Dim btnLang As Button
    Set btnLang = ws.Buttons.Add(20, 92, 200, 26)
    btnLang.Caption = modI18n.T("menu.lang"): btnLang.OnAction = "modAdmin.ToggleLang"

    Dim btnBackup As Button
    Set btnBackup = ws.Buttons.Add(20, 124, 200, 26)
    btnBackup.Caption = modI18n.T("common.export"): btnBackup.OnAction = "modData.BackupToCsv"

    Dim btnImport As Button
    Set btnImport = ws.Buttons.Add(20, 156, 200, 26)
    btnImport.Caption = modI18n.T("common.import"): btnImport.OnAction = "modData.ImportFromCsvPrompt"

    ' --- Manager-only configuration sub-screens --------------------------------
    If modAuth.IsManagerLike() Then
        ws.Range("B7").Value = modI18n.T("settings.config"): ws.Range("B7").Font.Bold = True
        Dim x As Long: x = 240
        Dim b As Button
        Set b = ws.Buttons.Add(x, 60, 200, 26)
        b.Caption = modI18n.T("settings.labor"): b.OnAction = "modAdmin.EditLaborSettings"
        Set b = ws.Buttons.Add(x, 92, 200, 26)
        b.Caption = modI18n.T("settings.targets"): b.OnAction = "modAdmin.EditDailyTargets"
        Set b = ws.Buttons.Add(x, 124, 200, 26)
        b.Caption = modI18n.T("settings.store"): b.OnAction = "modAdmin.EditStoreSettings"
        Set b = ws.Buttons.Add(x, 156, 200, 26)
        b.Caption = modI18n.T("settings.dropdowns"): b.OnAction = "modAdmin.EditDropdownOptions"
        Set b = ws.Buttons.Add(x, 188, 200, 26)
        b.Caption = modI18n.T("settings.capacity"): b.OnAction = "modAdmin.EditCapacity"
        Set b = ws.Buttons.Add(x, 220, 200, 26)
        b.Caption = modI18n.T("settings.borrow_master"): b.OnAction = "modBorrow.EditMaster"
    End If

    modWork.AddBackButton ws
End Sub

' ----- Editable setting screens (a thin wrapper around the data_* sheet) ----
Public Sub EditLaborSettings():    modAuth.RequireManager: EditDataSheet "labor_settings": End Sub
Public Sub EditDailyTargets():     modAuth.RequireManager: EditDataSheet "daily_targets":  End Sub
Public Sub EditStoreSettings():    modAuth.RequireManager: EditDataSheet "store_settings": End Sub
Public Sub EditDropdownOptions():  modAuth.RequireManager: EditDataSheet "dropdown_options": End Sub
Public Sub EditCapacity()
    modAuth.RequireManager
    ' Capacity per shift group lives on the hidden ShiftGroups sheet.
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("ShiftGroups")
    ws.Visible = xlSheetVisible: ws.Activate
    MsgBox modI18n.T("settings.capacity_hint"), vbInformation
End Sub

Private Sub EditDataSheet(tableName As String)
    ' Open the underlying data_* sheet read-write so a manager can edit values
    ' directly. We unprotect it for the duration of the edit and re-protect on
    ' return to the menu (handled by Workbook_SheetDeactivate in ThisWorkbook).
    Dim ws As Worksheet: Set ws = modData.DataSheet(tableName)
    ws.Visible = xlSheetVisible
    ws.Unprotect modAuth.PROTECT_PWD
    ws.Activate
    MsgBox modI18n.T("settings.edit_hint"), vbInformation
End Sub

Public Sub ToggleLang()
    modI18n.ToggleLanguage
    modUI.RenderMenu
    RenderSettings
End Sub

Public Sub ChangeMyPassword()
    Dim newPwd As String: newPwd = InputBox("New password (min 6 chars):")
    If Len(newPwd) < 6 Then MsgBox "Too short", vbExclamation: Exit Sub
    Dim salt As String: salt = modAuth.StateGet("password_salt")
    Dim hash As String: hash = modAuth.SHA256Hex(salt & newPwd)
    Dim users As Worksheet: Set users = modData.DataSheet("users")
    Dim c As Range: Set c = users.Columns(1).Find(modAuth.CurrentUser(), , , xlWhole)
    If c Is Nothing Then Exit Sub
    users.Unprotect modAuth.PROTECT_PWD
    users.Cells(c.Row, 2).Value = hash
    users.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "password_change", modAuth.CurrentUser(), ""
    MsgBox modI18n.T("common.success"), vbInformation
End Sub

Public Sub RenderAdmin()
    modAuth.RequireAdmin
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("Admin")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("menu.admin"): ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    ws.Range("B4").Value = modI18n.T("admin.users"): ws.Range("B4").Font.Bold = True
    Dim users As Worksheet: Set users = modData.DataSheet("users")
    Dim cols As Variant: cols = Array("username", "role", "full_name", "active")
    Dim h As Long
    For h = 0 To UBound(cols)
        ws.Cells(5, 2 + h).Value = cols(h)
        ws.Cells(5, 2 + h).Font.Bold = True
        ws.Cells(5, 2 + h).Interior.Color = RGB(229, 231, 235)
    Next h
    ws.Cells(5, 6).Value = modI18n.T("common.actions"): ws.Cells(5, 6).Font.Bold = True

    Dim lastRow As Long: lastRow = users.Cells(users.Rows.Count, 1).End(xlUp).Row
    Dim r As Long, dst As Long: dst = 6
    Dim activeCol As Long: activeCol = modAuth.HeaderCol(users, "active")
    Dim nameCol As Long:   nameCol = modAuth.HeaderCol(users, "full_name")
    For r = 2 To lastRow
        Dim u As String: u = CStr(users.Cells(r, 1).Value)
        ws.Cells(dst, 2).Value = u
        ws.Cells(dst, 3).Value = users.Cells(r, 3).Value
        ws.Cells(dst, 4).Value = IIf(nameCol = 0, "", users.Cells(r, nameCol).Value)
        ws.Cells(dst, 5).Value = IIf(activeCol = 0, "1", users.Cells(r, activeCol).Value)
        AddAdminButtons ws, dst, u
        dst = dst + 1
    Next r

    ws.Cells(dst + 1, 2).Value = "Add user": ws.Cells(dst + 1, 2).Font.Bold = True
    Dim addBtn As Button
    Set addBtn = ws.Buttons.Add(20, 60, 100, 24)
    addBtn.Caption = "+ User": addBtn.OnAction = "modAdmin.AddUser"

    Dim logBtn As Button
    Set logBtn = ws.Buttons.Add(130, 60, 160, 24)
    logBtn.Caption = modI18n.T("admin.system_log"): logBtn.OnAction = "modAdmin.ShowSystemLog"

    ws.Columns("B:F").AutoFit
    modWork.AddBackButton ws
End Sub

Private Sub AddAdminButtons(ws As Worksheet, row As Long, username As String)
    Dim cell As Range: Set cell = ws.Cells(row, 6)
    Dim b1 As Button, b2 As Button, b3 As Button, b4 As Button
    Set b1 = ws.Buttons.Add(cell.Left, cell.Top, 50, 18)
    b1.Caption = "pwd": b1.OnAction = "'modAdmin.ResetPassword """ & username & """'"
    Set b2 = ws.Buttons.Add(cell.Left + 54, cell.Top, 60, 18)
    b2.Caption = "toggle": b2.OnAction = "'modAdmin.ToggleActive """ & username & """'"
    Set b3 = ws.Buttons.Add(cell.Left + 118, cell.Top, 50, 18)
    b3.Caption = "del": b3.OnAction = "'modAdmin.DeleteUser """ & username & """'"
    Set b4 = ws.Buttons.Add(cell.Left + 172, cell.Top, 70, 18)
    b4.Caption = "perms": b4.OnAction = "'modAdmin.EditPermissions """ & username & """'"
End Sub

' Edit allowed_features (a JSON array column on data_users) for a single user.
' We present every known feature key as a checkbox-style Y/N prompt and rebuild
' the JSON array.
Public Sub EditPermissions(username As String)
    modAuth.RequireAdmin
    Dim users As Worksheet: Set users = modData.DataSheet("users")
    Dim c As Range: Set c = users.Columns(1).Find(username, , , xlWhole)
    If c Is Nothing Then Exit Sub
    Dim col As Long: col = modAuth.HeaderCol(users, "allowed_features")
    If col = 0 Then MsgBox "users sheet has no allowed_features column", vbExclamation: Exit Sub

    Dim known As Variant
    known = Array("work", "roster", "manager_req", "swap_req", "sales_daily", _
                  "sales_weekly", "labor", "borrow", "announcements", "notifications")
    Dim cur As String: cur = CStr(users.Cells(c.Row, col).Value)
    Dim out As String, sep As String, i As Long
    out = "[": sep = ""
    For i = LBound(known) To UBound(known)
        Dim k As String: k = CStr(known(i))
        Dim isOn As Boolean: isOn = (InStr(1, cur, """" & k & """", vbTextCompare) > 0)
        Dim ans As VbMsgBoxResult
        ans = MsgBox(k & " — allow this feature?" & vbCrLf & _
                     "Currently: " & IIf(isOn, "ALLOWED", "denied"), _
                     vbYesNoCancel + vbQuestion, "Permissions for " & username)
        If ans = vbCancel Then Exit Sub
        If ans = vbYes Then
            out = out & sep & """" & k & """": sep = ","
        End If
    Next i
    out = out & "]"
    users.Unprotect modAuth.PROTECT_PWD
    users.Cells(c.Row, col).Value = out
    users.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "admin_set_permissions", modAuth.CurrentUser(), username & ":" & out
    MsgBox modI18n.T("common.success") & vbCrLf & out, vbInformation
End Sub

Public Sub ResetPassword(username As String)
    modAuth.RequireAdmin
    Dim newPwd As String: newPwd = InputBox("New password for " & username, , "ChangeMe123")
    If Len(newPwd) < 6 Then Exit Sub
    Dim salt As String: salt = modAuth.StateGet("password_salt")
    Dim users As Worksheet: Set users = modData.DataSheet("users")
    Dim c As Range: Set c = users.Columns(1).Find(username, , , xlWhole)
    If c Is Nothing Then Exit Sub
    users.Unprotect modAuth.PROTECT_PWD
    users.Cells(c.Row, 2).Value = modAuth.SHA256Hex(salt & newPwd)
    Dim mcpCol As Long: mcpCol = modAuth.HeaderCol(users, "must_change_password")
    If mcpCol > 0 Then users.Cells(c.Row, mcpCol).Value = "1"
    users.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "admin_pwd_reset", modAuth.CurrentUser(), username
    MsgBox modI18n.T("common.success")
End Sub

Public Sub ToggleActive(username As String)
    modAuth.RequireAdmin
    Dim users As Worksheet: Set users = modData.DataSheet("users")
    Dim c As Range: Set c = users.Columns(1).Find(username, , , xlWhole)
    If c Is Nothing Then Exit Sub
    Dim col As Long: col = modAuth.HeaderCol(users, "active")
    If col = 0 Then Exit Sub
    Dim cur As String: cur = CStr(users.Cells(c.Row, col).Value)
    users.Unprotect modAuth.PROTECT_PWD
    users.Cells(c.Row, col).Value = IIf(cur = "1" Or cur = "true", "0", "1")
    users.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "admin_toggle_active", modAuth.CurrentUser(), username
    RenderAdmin
End Sub

Public Sub DeleteUser(username As String)
    modAuth.RequireAdmin
    If MsgBox("Delete " & username & "?", vbYesNo + vbExclamation) <> vbYes Then Exit Sub
    Dim users As Worksheet: Set users = modData.DataSheet("users")
    Dim c As Range: Set c = users.Columns(1).Find(username, , , xlWhole)
    If c Is Nothing Then Exit Sub
    users.Unprotect modAuth.PROTECT_PWD
    users.Rows(c.Row).Delete
    users.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "admin_delete_user", modAuth.CurrentUser(), username
    RenderAdmin
End Sub

Public Sub AddUser()
    modAuth.RequireAdmin
    Dim u As String: u = LCase$(InputBox("Username:"))
    If u = "" Then Exit Sub
    Dim role As String: role = InputBox("Role (admin/manager/area/staff):", , "staff")
    Dim full As String: full = InputBox("Full name:")
    Dim pwd As String: pwd = InputBox("Initial password:", , "ChangeMe123")
    Dim salt As String: salt = modAuth.StateGet("password_salt")
    Dim hash As String: hash = modAuth.SHA256Hex(salt & pwd)
    Dim users As Worksheet: Set users = modData.DataSheet("users")
    users.Unprotect modAuth.PROTECT_PWD
    Dim r As Long: r = users.Cells(users.Rows.Count, 1).End(xlUp).Row + 1
    users.Cells(r, 1).Value = u
    users.Cells(r, 2).Value = hash
    users.Cells(r, 3).Value = role
    Dim nameCol As Long: nameCol = modAuth.HeaderCol(users, "full_name")
    If nameCol > 0 Then users.Cells(r, nameCol).Value = full
    Dim activeCol As Long: activeCol = modAuth.HeaderCol(users, "active")
    If activeCol > 0 Then users.Cells(r, activeCol).Value = "1"
    Dim mcpAddCol As Long: mcpAddCol = modAuth.HeaderCol(users, "must_change_password")
    If mcpAddCol > 0 Then users.Cells(r, mcpAddCol).Value = "1"
    users.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "admin_add_user", modAuth.CurrentUser(), u
    RenderAdmin
End Sub

Public Sub ShowSystemLog()
    modAuth.RequireAdmin
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("data_systemlog")
    ws.Visible = xlSheetVisible
    ws.Activate
    MsgBox "System log shown. Hide it again from the Admin screen.", vbInformation
End Sub
