Attribute VB_Name = "modData"
'==========================================================
' modData — generic data-sheet helpers (read, append, update, delete by id)
'
' Each data sheet is named "data_<table>" with a header row at row 1.
'==========================================================
Option Explicit

Public Function DataSheet(tableName As String) As Worksheet
    On Error Resume Next
    Set DataSheet = ThisWorkbook.Worksheets("data_" & tableName)
    On Error GoTo 0
End Function

Public Function NextId(tableName As String) As Long
    Dim ws As Worksheet
    Set ws = DataSheet(tableName)
    If ws Is Nothing Then NextId = 1: Exit Function
    Dim lastRow As Long, max As Long, i As Long, v As Variant
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    max = 0
    For i = 2 To lastRow
        v = ws.Cells(i, 1).Value
        If IsNumeric(v) Then If CLng(v) > max Then max = CLng(v)
    Next i
    NextId = max + 1
End Function

Public Sub UnprotectAll()
    modAuth.RequireAdmin
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        On Error Resume Next: ws.Unprotect modAuth.PROTECT_PWD: On Error GoTo 0
    Next ws
End Sub

Public Sub ProtectAll()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        If Left$(ws.Name, 5) = "data_" Then
            ws.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
            ws.Visible = xlSheetVeryHidden
        End If
    Next ws
End Sub

' Append a row and return its row index. fields() must match the sheet header
' order. Missing trailing fields are left blank.
Public Function AppendRow(tableName As String, fields() As Variant) As Long
    Dim ws As Worksheet: Set ws = DataSheet(tableName)
    If ws Is Nothing Then Err.Raise vbObjectError + 1, , "Unknown table " & tableName
    ws.Unprotect modAuth.PROTECT_PWD
    Dim r As Long: r = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1
    Dim i As Long
    For i = LBound(fields) To UBound(fields)
        ws.Cells(r, i + 1).Value = fields(i)
    Next i
    ws.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    AppendRow = r
End Function

Public Function FindRowById(tableName As String, id As Long) As Long
    Dim ws As Worksheet: Set ws = DataSheet(tableName)
    If ws Is Nothing Then FindRowById = 0: Exit Function
    Dim c As Range
    Set c = ws.Columns(1).Find(What:=CStr(id), LookAt:=xlWhole)
    If c Is Nothing Then FindRowById = 0 Else FindRowById = c.Row
End Function

Public Sub UpdateCell(tableName As String, id As Long, columnHeader As String, value As Variant)
    Dim ws As Worksheet: Set ws = DataSheet(tableName)
    Dim r As Long: r = FindRowById(tableName, id)
    If r = 0 Then Exit Sub
    Dim col As Long: col = modAuth.HeaderCol(ws, columnHeader)
    If col = 0 Then Exit Sub
    ws.Unprotect modAuth.PROTECT_PWD
    ws.Cells(r, col).Value = value
    ws.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
End Sub

Public Sub DeleteRow(tableName As String, id As Long)
    Dim ws As Worksheet: Set ws = DataSheet(tableName)
    Dim r As Long: r = FindRowById(tableName, id)
    If r = 0 Then Exit Sub
    ws.Unprotect modAuth.PROTECT_PWD
    ws.Rows(r).Delete
    ws.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
End Sub

' Backup all data_* sheets to CSV files in the same folder as the workbook.
Public Sub BackupToCsv()
    modAuth.RequireAdmin
    Dim folder As String: folder = ThisWorkbook.Path & Application.PathSeparator & _
        "backup_" & Format(Now, "yyyymmdd_hhnnss")
    MkDir folder
    Dim ws As Worksheet, tmp As Workbook
    For Each ws In ThisWorkbook.Worksheets
        If Left$(ws.Name, 5) = "data_" Then
            ws.Visible = xlSheetVisible
            Set tmp = Workbooks.Add
            ws.UsedRange.Copy tmp.Worksheets(1).Range("A1")
            Application.DisplayAlerts = False
            tmp.SaveAs folder & Application.PathSeparator & Mid$(ws.Name, 6) & ".csv", xlCSVUTF8
            tmp.Close False
            Application.DisplayAlerts = True
            ws.Visible = xlSheetVeryHidden
        End If
    Next ws
    MsgBox "Backup written to " & folder, vbInformation, modI18n.T("common.success")
End Sub

' Prompt the user for a backup_<ts> folder, then re-import every CSV inside it
' over the corresponding data_* sheet (header-aligned, append-only — duplicates
' are skipped by primary key).
Public Sub ImportFromCsvPrompt()
    modAuth.RequireAdmin
    Dim fd As Object: Set fd = Application.FileDialog(4) ' msoFileDialogFolderPicker
    fd.Title = modI18n.T("common.import")
    If fd.Show <> -1 Then Exit Sub
    ImportFromCsvFolder fd.SelectedItems(1)
End Sub

Public Sub ImportFromCsvFolder(folder As String)
    modAuth.RequireAdmin
    Dim fso As Object: Set fso = CreateObject("Scripting.FileSystemObject")
    Dim fld As Object, f As Object, n As Long, total As Long
    Set fld = fso.GetFolder(folder)
    For Each f In fld.Files
        If LCase$(fso.GetExtensionName(f.Name)) = "csv" Then
            Dim table As String: table = fso.GetBaseName(f.Name)
            n = ImportSingleCsv(table, f.Path)
            total = total + n
            Debug.Print "imported " & table & ": " & n
        End If
    Next f
    modSysLog.Log "csv_import", modAuth.CurrentUser(), folder & " (" & total & " rows)"
    MsgBox total & " rows imported from " & folder, vbInformation, modI18n.T("common.success")
End Sub

Private Function ImportSingleCsv(tableName As String, filePath As String) As Long
    Dim ws As Worksheet: Set ws = DataSheet(tableName)
    If ws Is Nothing Then ImportSingleCsv = 0: Exit Function
    Dim ts As Object: Set ts = CreateObject("Scripting.FileSystemObject").OpenTextFile(filePath, 1, , -1)
    Dim header As String: header = ts.ReadLine
    Dim cols() As String: cols = SplitCsvLine(header)
    ' Map source col index -> target col index in sheet
    Dim mapIdx() As Long: ReDim mapIdx(LBound(cols) To UBound(cols))
    Dim i As Long
    For i = LBound(cols) To UBound(cols)
        mapIdx(i) = modAuth.HeaderCol(ws, cols(i))
    Next i
    ws.Unprotect modAuth.PROTECT_PWD
    Dim added As Long
    Do Until ts.AtEndOfStream
        Dim line As String: line = ts.ReadLine
        If Len(line) = 0 Then GoTo NL
        Dim parts() As String: parts = SplitCsvLine(line)
        ' Skip if the row's id already exists (primary-key dedup on column 1).
        Dim idVal As String: idVal = parts(LBound(parts))
        If Len(idVal) > 0 Then
            Dim hit As Range: Set hit = ws.Columns(1).Find(idVal, , , xlWhole)
            If Not hit Is Nothing Then GoTo NL
        End If
        Dim r As Long: r = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1
        For i = LBound(parts) To UBound(parts)
            If i <= UBound(mapIdx) Then
                If mapIdx(i) > 0 Then ws.Cells(r, mapIdx(i)).Value = parts(i)
            End If
        Next i
        added = added + 1
NL:
    Loop
    ts.Close
    ws.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    ImportSingleCsv = added
End Function

Private Function SplitCsvLine(s As String) As String()
    Dim out() As String: ReDim out(0)
    Dim i As Long, c As String, cur As String, q As Boolean, k As Long
    q = False: k = 0
    For i = 1 To Len(s)
        c = Mid$(s, i, 1)
        If q Then
            If c = """" Then
                If Mid$(s, i + 1, 1) = """" Then cur = cur & """": i = i + 1 Else q = False
            Else
                cur = cur & c
            End If
        Else
            If c = """" Then
                q = True
            ElseIf c = "," Then
                ReDim Preserve out(k): out(k) = cur: k = k + 1: cur = ""
            Else
                cur = cur & c
            End If
        End If
    Next i
    ReDim Preserve out(k): out(k) = cur
    SplitCsvLine = out
End Function
