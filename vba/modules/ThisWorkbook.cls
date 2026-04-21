VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ThisWorkbook"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
'==========================================================
' Workbook events: protect data sheets on open, force login
'==========================================================
Option Explicit

Private Sub Workbook_Open()
    On Error Resume Next
    ' Always begin from a clean session — wipe any persisted current_user/role
    ' from a previous abnormal close before showing the login form.
    modAuth.ClearSession
    ' Hide every sheet except Welcome until the user logs in.
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        If Left$(ws.Name, 5) = "data_" Then
            ws.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
            ws.Visible = xlSheetVeryHidden
        ElseIf ws.Name = "i18n" Or ws.Name = "ShiftGroups" Then
            ws.Visible = xlSheetHidden
        ElseIf ws.Name = "AppState" Then
            ws.Visible = xlSheetVeryHidden
        ElseIf ws.Name <> "Welcome" Then
            ws.Visible = xlSheetHidden
        End If
    Next ws
    ThisWorkbook.Worksheets("Welcome").Visible = xlSheetVisible
    ThisWorkbook.Worksheets("Welcome").Activate
    On Error GoTo 0

    frmLogin.Show
End Sub

Private Sub Workbook_SheetDeactivate(ByVal Sh As Object)
    ' If the user navigates away from a data_* sheet that was temporarily
    ' opened for editing (Settings → Edit ...), re-protect and re-hide it.
    On Error Resume Next
    If Left$(Sh.Name, 5) = "data_" Then
        Sh.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
        Sh.Visible = xlSheetVeryHidden
    End If
End Sub

Private Sub Workbook_BeforeClose(Cancel As Boolean)
    On Error Resume Next
    modAuth.Logout
    ' Re-hide everything for next open
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name <> "Welcome" Then ws.Visible = xlSheetHidden
    Next ws
    ThisWorkbook.Save
End Sub
