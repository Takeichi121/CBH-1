Attribute VB_Name = "modSysLog"
'==========================================================
' modSysLog — append entries to data_systemlog
' Schema: id, ts, action, by_user, detail
'==========================================================
Option Explicit

Public Sub Log(action As String, actor As String, details As String)
    On Error Resume Next
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("data_systemlog")
    If ws Is Nothing Then Exit Sub
    ws.Unprotect modAuth.PROTECT_PWD
    Dim r As Long: r = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1
    ws.Cells(r, 1).Value = modData.NextId("systemlog")
    ws.Cells(r, 2).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    ws.Cells(r, 3).Value = action
    ws.Cells(r, 4).Value = actor
    ws.Cells(r, 5).Value = details
    ws.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
End Sub
