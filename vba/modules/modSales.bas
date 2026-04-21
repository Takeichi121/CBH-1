Attribute VB_Name = "modSales"
'==========================================================
' modSales — daily and weekly sales report.
' daily_sales_reports key columns we use:
'   report_date, daily_target, actual_sales, transaction_count, col_percent,
'   tcmh, summary_hours, variance_hours, labor_cost, report_by, store_id,
'   created_at, updated_at
'==========================================================
Option Explicit

' Columns that the user fills in. The rest of the row (id, report_date,
' report_by, store_id, created_at, updated_at and any column ending in _mtd
' which is computed) is set automatically by SaveDaily / RecalcMtd.
Private Function EditableFields() As Variant
    EditableFields = Array( _
        "work_shift", _
        "actual_sales", "daily_target", "transaction_count", _
        "dine_in", "dine_in_tc", "take_away", "take_away_tc", _
        "grabfood", "lineman", "shopee", "bkapp", _
        "osat", "survey_count", "void_amount", "void_count", _
        "add_cheese_count", "add_cheese_percent", _
        "v_meal_count", "v_meal_percent", _
        "up_size_count", "up_size_percent", _
        "waste_raw_daily", "waste_raw_daily_percent", _
        "waste_meal_daily", "waste_meal_daily_percent", _
        "col_percent", "tcmh", "labor_hour", "labor_cost", _
        "summary_hours", "variance_hours", "actual_hours", "ot_hours", _
        "recommend_hours", "roster_commit", "robin", "gokoo", _
        "sos_daily", "close_shift_count", "cash_deposit", "sales_delivery", _
        "promotion_other1_qty", "promotion_other2_qty", _
        "last_year_sales", "forecast_sales", "last_year_tc", _
        "target_tc", "target_ta", _
        "manager_roster_text", "staff_roster_text", _
        "note_daily", "note_in_store", "note_delivery", "note_performance", "note_addons" _
    )
End Function

Public Sub RenderDaily()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("DailySales")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("sales.title")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    Dim today As String: today = Format(Date, "yyyy-mm-dd")
    ws.Range("B4").Value = modI18n.T("common.date"): ws.Range("C4").Value = today

    ' Render every editable column in a 2-column scrolling form.
    Dim keys As Variant: keys = EditableFields()
    Dim i As Long, perCol As Long: perCol = (UBound(keys) + 2) \ 2
    For i = 0 To UBound(keys)
        Dim col As Long, row As Long
        If i < perCol Then col = 2: row = 6 + i Else col = 5: row = 6 + (i - perCol)
        ws.Cells(row, col).Value = CStr(keys(i))
        ws.Cells(row, col).Font.Bold = True
        ws.Cells(row, col + 1).Value = LoadDailyValue(today, CStr(keys(i)))
    Next i

    ' MTD running totals (computed, read-only)
    ws.Cells(6 + perCol + 2, 2).Value = "MTD (computed)": ws.Cells(6 + perCol + 2, 2).Font.Bold = True
    ws.Cells(6 + perCol + 3, 2).Value = "mtd_target":  ws.Cells(6 + perCol + 3, 3).Value = SumMtd(today, "daily_target")
    ws.Cells(6 + perCol + 4, 2).Value = "mtd_actual":  ws.Cells(6 + perCol + 4, 3).Value = SumMtd(today, "actual_sales")
    ws.Cells(6 + perCol + 5, 2).Value = "mtd_tc":      ws.Cells(6 + perCol + 5, 3).Value = SumMtd(today, "transaction_count")

    Dim btn As Button
    Set btn = ws.Buttons.Add(20, 600, 140, 28)
    btn.Caption = modI18n.T("common.save")
    btn.OnAction = "modSales.SaveDaily"
    modWork.AddBackButton ws
End Sub

Private Function SumMtd(dateStr As String, fieldName As String) As Double
    Dim ws As Worksheet: Set ws = modData.DataSheet("daily_sales_reports")
    If ws Is Nothing Then Exit Function
    Dim dCol As Long: dCol = modAuth.HeaderCol(ws, "report_date")
    Dim fCol As Long: fCol = modAuth.HeaderCol(ws, fieldName)
    If dCol = 0 Or fCol = 0 Then Exit Function
    Dim mo As String: mo = Left$(dateStr, 7)  ' yyyy-mm
    Dim lastRow As Long: lastRow = ws.Cells(ws.Rows.Count, dCol).End(xlUp).Row
    Dim i As Long, total As Double
    For i = 2 To lastRow
        Dim d As String: d = CStr(ws.Cells(i, dCol).Value)
        If Left$(d, 7) = mo And d <= dateStr Then total = total + Val(ws.Cells(i, fCol).Value)
    Next i
    SumMtd = total
End Function

Private Function LoadDailyValue(dateStr As String, fieldName As String) As Variant
    Dim ws As Worksheet: Set ws = modData.DataSheet("daily_sales_reports")
    If ws Is Nothing Then Exit Function
    Dim dCol As Long: dCol = modAuth.HeaderCol(ws, "report_date")
    Dim fCol As Long: fCol = modAuth.HeaderCol(ws, fieldName)
    If dCol = 0 Or fCol = 0 Then Exit Function
    Dim lastRow As Long: lastRow = ws.Cells(ws.Rows.Count, dCol).End(xlUp).Row
    Dim i As Long
    For i = 2 To lastRow
        If CStr(ws.Cells(i, dCol).Value) = dateStr Then LoadDailyValue = ws.Cells(i, fCol).Value: Exit Function
    Next i
End Function

Public Sub SaveDaily()
    modAuth.RequireFeature "sales_daily"
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("DailySales")
    Dim dateStr As String: dateStr = CStr(ws.Range("C4").Value)
    Dim src As Worksheet: Set src = modData.DataSheet("daily_sales_reports")
    Dim dCol As Long: dCol = modAuth.HeaderCol(src, "report_date")
    Dim lastRow As Long: lastRow = src.Cells(src.Rows.Count, dCol).End(xlUp).Row
    Dim found As Long, i As Long
    For i = 2 To lastRow
        If CStr(src.Cells(i, dCol).Value) = dateStr Then found = i: Exit For
    Next i
    src.Unprotect modAuth.PROTECT_PWD
    If found = 0 Then
        found = src.Cells(src.Rows.Count, 1).End(xlUp).Row + 1
        src.Cells(found, 1).Value = modData.NextId("daily_sales_reports")
        src.Cells(found, dCol).Value = dateStr
        src.Cells(found, modAuth.HeaderCol(src, "report_by")).Value = modAuth.CurrentUser()
        src.Cells(found, modAuth.HeaderCol(src, "store_id")).Value = modAuth.CurrentStore()
        src.Cells(found, modAuth.HeaderCol(src, "created_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    End If
    src.Cells(found, modAuth.HeaderCol(src, "updated_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    Dim keys As Variant: keys = EditableFields()
    Dim perCol As Long: perCol = (UBound(keys) + 2) \ 2
    For i = 0 To UBound(keys)
        Dim sCol As Long: sCol = modAuth.HeaderCol(src, CStr(keys(i)))
        Dim ucol As Long, urow As Long
        If i < perCol Then ucol = 2: urow = 6 + i Else ucol = 5: urow = 6 + (i - perCol)
        If sCol > 0 Then src.Cells(found, sCol).Value = ws.Cells(urow, ucol + 1).Value
    Next i

    ' Recompute MTD totals for this row
    Dim mtCol As Long
    mtCol = modAuth.HeaderCol(src, "mtd_target")
    If mtCol > 0 Then src.Cells(found, mtCol).Value = SumMtd(dateStr, "daily_target")
    mtCol = modAuth.HeaderCol(src, "mtd_actual")
    If mtCol > 0 Then src.Cells(found, mtCol).Value = SumMtd(dateStr, "actual_sales")
    mtCol = modAuth.HeaderCol(src, "mtd_tc")
    If mtCol > 0 Then src.Cells(found, mtCol).Value = SumMtd(dateStr, "transaction_count")

    src.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "daily_sales_save", modAuth.CurrentUser(), dateStr
    MsgBox modI18n.T("common.success"), vbInformation
End Sub

Public Sub RenderWeekly()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("WeeklySales")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("menu.weekly")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    Dim wkStart As Date: wkStart = modWork.WeekStart(Date)
    ws.Cells(4, 2).Value = "Week starting": ws.Cells(4, 3).Value = Format(wkStart, "yyyy-mm-dd")

    Dim headers As Variant
    headers = Array(modI18n.T("common.date"), modI18n.T("sales.actual"), _
                    modI18n.T("sales.target"), "Var %")
    Dim h As Long
    For h = 0 To UBound(headers)
        ws.Cells(6, 2 + h).Value = headers(h): ws.Cells(6, 2 + h).Font.Bold = True
    Next h

    Dim totalA As Double, totalT As Double, i As Long
    For i = 0 To 6
        Dim d As String: d = Format(wkStart + i, "yyyy-mm-dd")
        Dim a As Double: a = Val(LoadDailyValue(d, "actual_sales"))
        Dim t As Double: t = Val(LoadDailyValue(d, "daily_target"))
        ws.Cells(7 + i, 2).Value = d
        ws.Cells(7 + i, 3).Value = a
        ws.Cells(7 + i, 4).Value = t
        If t > 0 Then ws.Cells(7 + i, 5).Value = Format((a - t) / t, "0.00%") Else ws.Cells(7 + i, 5).Value = "-"
        totalA = totalA + a: totalT = totalT + t
    Next i
    ws.Cells(15, 2).Value = "Total": ws.Cells(15, 2).Font.Bold = True
    ws.Cells(15, 3).Value = totalA
    ws.Cells(15, 4).Value = totalT
    If totalT > 0 Then ws.Cells(15, 5).Value = Format((totalA - totalT) / totalT, "0.00%")
    modWork.AddBackButton ws
End Sub
