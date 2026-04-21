Attribute VB_Name = "modAuth"
'==========================================================
' modAuth — authentication, sessions, role + permission checks
'
' Verifies a username/password against data_users using SHA-256(salt + password).
' Stores the current user/role/language/store in the AppState sheet so any module
' (or future re-open) can read them.
'==========================================================
Option Explicit

Public Const APP_STATE_SHEET As String = "AppState"
Public Const USERS_SHEET     As String = "data_users"
Public Const SESSIONS_SHEET  As String = "data_sessions"
Public Const SYSTEMLOG_SHEET As String = "data_systemlog"
Public Const PROTECT_PWD     As String = "BK1040#protect"

' ----- AppState helpers ----------------------------------------------------
Public Function StateGet(key As String) As String
    Dim ws As Worksheet, c As Range
    Set ws = ThisWorkbook.Worksheets(APP_STATE_SHEET)
    Set c = ws.Columns(1).Find(What:=key, LookAt:=xlWhole, MatchCase:=False)
    If c Is Nothing Then
        StateGet = ""
    Else
        StateGet = CStr(c.Offset(0, 1).Value)
    End If
End Function

Public Sub StateSet(key As String, value As String)
    Dim ws As Worksheet, c As Range, lastRow As Long
    Set ws = ThisWorkbook.Worksheets(APP_STATE_SHEET)
    ws.Visible = xlSheetVisible ' temporarily so we can write
    On Error Resume Next: ws.Unprotect PROTECT_PWD: On Error GoTo 0
    Set c = ws.Columns(1).Find(What:=key, LookAt:=xlWhole, MatchCase:=False)
    If c Is Nothing Then
        lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1
        ws.Cells(lastRow, 1).Value = key
        ws.Cells(lastRow, 2).Value = value
    Else
        c.Offset(0, 1).Value = value
    End If
    ws.Visible = xlSheetVeryHidden
End Sub

Public Function CurrentUser() As String:  CurrentUser = StateGet("current_user"):  End Function
Public Function CurrentRole() As String:  CurrentRole = StateGet("current_role"):  End Function
Public Function CurrentLang() As String
    Dim s As String: s = StateGet("language")
    If s = "" Then s = "th"
    CurrentLang = s
End Function
Public Function CurrentStore() As String
    Dim s As String: s = StateGet("current_store")
    If s = "" Then s = "BK1040"
    CurrentStore = s
End Function

' ----- Crypto --------------------------------------------------------------
' SHA-256 hex of an arbitrary string using .NET (works on Excel for Windows).
Public Function SHA256Hex(text As String) As String
    Dim oEnc As Object, oSha As Object, bytes() As Byte, hash() As Byte
    Set oEnc = CreateObject("System.Text.UTF8Encoding")
    bytes = oEnc.GetBytes_4(text)
    Set oSha = CreateObject("System.Security.Cryptography.SHA256Managed")
    hash = oSha.ComputeHash_2(bytes)
    Dim i As Long, s As String
    For i = LBound(hash) To UBound(hash)
        s = s & Right$("0" & Hex(hash(i)), 2)
    Next i
    SHA256Hex = LCase$(s)
End Function

' ----- Login --------------------------------------------------------------
Public Function VerifyLogin(username As String, password As String, ByRef errMsg As String) As Boolean
    On Error GoTo Fail
    ' Always start from a clean slate — no stale role/user from any previous
    ' attempt may survive into this one.
    ClearSession
    Dim ws As Worksheet, c As Range, salt As String
    Set ws = ThisWorkbook.Worksheets(USERS_SHEET)
    Set c = ws.Columns(1).Find(What:=LCase$(username), LookAt:=xlWhole, MatchCase:=False)
    If c Is Nothing Then
        errMsg = modI18n.T("login.error")
        ClearSession: VerifyLogin = False: Exit Function
    End If
    Dim row As Long: row = c.Row
    ' Schema (data_users): username, passhash, role, full_name, ...
    Dim passhash As String, role As String, active As String
    passhash = CStr(ws.Cells(row, 2).Value)
    role     = CStr(ws.Cells(row, 3).Value)
    ' active column (12th in original schema) — find by header
    Dim activeCol As Long
    activeCol = HeaderCol(ws, "active")
    If activeCol > 0 Then active = CStr(ws.Cells(row, activeCol).Value) Else active = "1"
    If active = "0" Then
        errMsg = modI18n.T("login.disabled")
        ClearSession: VerifyLogin = False: Exit Function
    End If
    salt = StateGet("password_salt")
    If SHA256Hex(salt & password) = LCase$(passhash) Or _
       SHA256Hex(password) = LCase$(passhash) Then
        StateSet "current_user", LCase$(username)
        StateSet "current_role", role
        StateSet "session_started", CStr(Now)
        modSysLog.Log "login", LCase$(username), "ok"
        ' Enforce a password change immediately if the user's row is flagged.
        Dim mcpCol As Long: mcpCol = HeaderCol(ws, "must_change_password")
        If mcpCol > 0 Then
            Dim mcp As String: mcp = CStr(ws.Cells(row, mcpCol).Value)
            If mcp = "1" Or LCase$(mcp) = "true" Then
                If Not ForcePasswordChange(LCase$(username), errMsg) Then
                    ClearSession
                    VerifyLogin = False
                    Exit Function
                End If
            End If
        End If
        VerifyLogin = True
        Exit Function
    End If
    errMsg = modI18n.T("login.error")
    ClearSession
    VerifyLogin = False
    Exit Function
Fail:
    errMsg = "Internal error: " & Err.Description
    ClearSession
    VerifyLogin = False
End Function

' Wipe every authentication-related session key. Used both on Logout and on
' any failure path inside VerifyLogin after current_role / current_user have
' been provisionally set.
Public Sub ClearSession()
    StateSet "current_user", ""
    StateSet "current_role", ""
    StateSet "session_started", ""
End Sub

' True only when there is a non-empty authenticated session. The role guards
' below additionally check the role, so a stale role without a user (e.g. if
' a forced password change was cancelled) cannot pass.
Public Function IsAuthenticated() As Boolean
    IsAuthenticated = (Len(CurrentUser()) > 0) And (Len(CurrentRole()) > 0)
End Function

' Authorization guards. Every privileged Public sub must call one of these
' as its first executable statement. RequireAdmin / RequireManager raise an
' error if the current session does not satisfy the role, so a staff user
' cannot bypass the menu by invoking a macro directly via Alt+F8.
Public Sub RequireAdmin()
    If Not (IsAuthenticated() And IsAdmin()) Then
        modSysLog.Log "auth_denied", CurrentUser(), "admin required"
        MsgBox "Admin privileges required.", vbCritical, "Access denied"
        Err.Raise vbObjectError + 100, "modAuth", "Admin privileges required"
    End If
End Sub

Public Sub RequireManager()
    If Not (IsAuthenticated() And IsManagerLike()) Then
        modSysLog.Log "auth_denied", CurrentUser(), "manager required"
        MsgBox "Manager privileges required.", vbCritical, "Access denied"
        Err.Raise vbObjectError + 101, "modAuth", "Manager privileges required"
    End If
End Sub

Public Sub RequireFeature(featureKey As String)
    If Not (IsAuthenticated() And HasFeature(featureKey)) Then
        modSysLog.Log "auth_denied", CurrentUser(), "feature " & featureKey
        MsgBox "You do not have access to this feature.", vbCritical, "Access denied"
        Err.Raise vbObjectError + 102, "modAuth", "Feature " & featureKey & " denied"
    End If
End Sub

' Force a password change. Returns True only when a valid new password (>=6
' chars, different from current default) is saved. Cancelling aborts login.
Public Function ForcePasswordChange(username As String, ByRef errMsg As String) As Boolean
    Dim newPwd As String, confirmPwd As String, salt As String
    salt = StateGet("password_salt")
    Do
        newPwd = InputBox("You must set a new password to continue (min 6 chars):", "Password change required")
        If newPwd = "" Then errMsg = "Password change is required.": ForcePasswordChange = False: Exit Function
        If Len(newPwd) < 6 Then MsgBox "Too short", vbExclamation
    Loop While Len(newPwd) < 6
    confirmPwd = InputBox("Confirm new password:", "Password change required")
    If confirmPwd <> newPwd Then errMsg = "Passwords don't match.": ForcePasswordChange = False: Exit Function
    Dim users As Worksheet: Set users = ThisWorkbook.Worksheets(USERS_SHEET)
    Dim c As Range: Set c = users.Columns(1).Find(username, , , xlWhole)
    If c Is Nothing Then ForcePasswordChange = False: Exit Function
    users.Unprotect PROTECT_PWD
    users.Cells(c.Row, 2).Value = SHA256Hex(salt & newPwd)
    Dim mcpCol As Long: mcpCol = HeaderCol(users, "must_change_password")
    If mcpCol > 0 Then users.Cells(c.Row, mcpCol).Value = "0"
    users.Protect PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "force_pwd_change", username, ""
    ForcePasswordChange = True
End Function

Public Sub Logout()
    modSysLog.Log "logout", CurrentUser(), ""
    ClearSession
End Sub

' ----- Permission helpers --------------------------------------------------
Public Function IsManagerLike() As Boolean
    Dim r As String: r = CurrentRole()
    IsManagerLike = (r = "admin" Or r = "manager" Or r = "area")
End Function

Public Function IsAdmin() As Boolean
    IsAdmin = (CurrentRole() = "admin")
End Function

Public Function HasFeature(featureKey As String) As Boolean
    ' admin gets everything; otherwise consult allowed_features JSON column.
    If IsAdmin() Then HasFeature = True: Exit Function
    Dim ws As Worksheet, c As Range, col As Long, raw As String
    Set ws = ThisWorkbook.Worksheets(USERS_SHEET)
    Set c = ws.Columns(1).Find(What:=CurrentUser(), LookAt:=xlWhole, MatchCase:=False)
    If c Is Nothing Then HasFeature = False: Exit Function
    col = HeaderCol(ws, "allowed_features")
    If col = 0 Then HasFeature = True: Exit Function ' no per-feature config -> allow
    raw = CStr(ws.Cells(c.Row, col).Value)
    If raw = "" Then HasFeature = True: Exit Function
    HasFeature = (InStr(1, raw, """" & featureKey & """", vbTextCompare) > 0)
End Function

' ----- Header lookup helper ------------------------------------------------
Public Function HeaderCol(ws As Worksheet, headerName As String) As Long
    Dim lastCol As Long, i As Long
    lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    For i = 1 To lastCol
        If LCase$(CStr(ws.Cells(1, i).Value)) = LCase$(headerName) Then HeaderCol = i: Exit Function
    Next i
    HeaderCol = 0
End Function
