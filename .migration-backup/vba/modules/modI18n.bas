Attribute VB_Name = "modI18n"
'==========================================================
' modI18n — translation lookup against the i18n sheet
'==========================================================
Option Explicit

Public Function T(key As String) As String
    On Error GoTo Fallback
    Dim ws As Worksheet, c As Range, lang As String, col As Long
    Set ws = ThisWorkbook.Worksheets("i18n")
    lang = modAuth.CurrentLang()
    col = IIf(lang = "th", 3, 2)
    Set c = ws.Columns(1).Find(What:=key, LookAt:=xlWhole, MatchCase:=False)
    If c Is Nothing Then T = key: Exit Function
    Dim val As String
    val = CStr(ws.Cells(c.Row, col).Value)
    If val = "" Then val = CStr(ws.Cells(c.Row, 2).Value) ' fallback en
    T = val
    Exit Function
Fallback:
    T = key
End Function

Public Sub ToggleLanguage()
    If modAuth.CurrentLang() = "th" Then
        modAuth.StateSet "language", "en"
    Else
        modAuth.StateSet "language", "th"
    End If
End Sub
