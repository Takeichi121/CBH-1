Attribute VB_Name = "modLabor"
'==========================================================
' modLabor — labor cost summary.
' labor_settings schema: id, roster_hours, duty_daily_hours,
'   fixed_cost_daily, close_shift_daily_cost, pt_wage_rate, updated_at,
'   store_id
'==========================================================
Option Explicit

Public Sub Render()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("LaborCost")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("menu.labor")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    Dim ls As Worksheet: Set ls = modData.DataSheet("labor_settings")
    Dim ptRate As Double, fixedDaily As Double, dutyHrs As Double, closeDaily As Double
    If Not ls Is Nothing Then
        Dim cR As Long, cF As Long, cD As Long, cC As Long
        cR = modAuth.HeaderCol(ls, "pt_wage_rate")
        cF = modAuth.HeaderCol(ls, "fixed_cost_daily")
        cD = modAuth.HeaderCol(ls, "duty_daily_hours")
        cC = modAuth.HeaderCol(ls, "close_shift_daily_cost")
        If cR > 0 Then ptRate = Val(ls.Cells(2, cR).Value)
        If cF > 0 Then fixedDaily = Val(ls.Cells(2, cF).Value)
        If cD > 0 Then dutyHrs = Val(ls.Cells(2, cD).Value)
        If cC > 0 Then closeDaily = Val(ls.Cells(2, cC).Value)
    End If

    ws.Cells(4, 2).Value = "PT wage rate (THB/hr)":     ws.Cells(4, 3).Value = ptRate
    ws.Cells(5, 2).Value = "Fixed cost / day (THB)":     ws.Cells(5, 3).Value = fixedDaily
    ws.Cells(6, 2).Value = "Duty daily hours":           ws.Cells(6, 3).Value = dutyHrs
    ws.Cells(7, 2).Value = "Close-shift daily cost":     ws.Cells(7, 3).Value = closeDaily

    Dim headers As Variant
    headers = Array(modI18n.T("common.date"), "PT hours", _
                    "PT cost", "Fixed", "Total labor", _
                    modI18n.T("sales.actual"), "Labor %")
    Dim h As Long
    For h = 0 To UBound(headers)
        ws.Cells(9, 2 + h).Value = headers(h)
        ws.Cells(9, 2 + h).Font.Bold = True
        ws.Cells(9, 2 + h).Interior.Color = RGB(229, 231, 235)
    Next h

    Dim wkStart As Date: wkStart = modWork.WeekStart(Date)
    Dim shifts As Worksheet: Set shifts = modData.DataSheet("shifts")
    Dim i As Long
    For i = 0 To 6
        Dim d As String: d = Format(wkStart + i, "yyyy-mm-dd")
        Dim hrs As Double: hrs = HoursForDate(shifts, d)
        Dim ptCost As Double: ptCost = hrs * ptRate
        Dim total As Double: total = ptCost + fixedDaily + closeDaily
        Dim sales As Double: sales = Val(LoadSalesActual(d))
        ws.Cells(10 + i, 2).Value = d
        ws.Cells(10 + i, 3).Value = hrs
        ws.Cells(10 + i, 4).Value = ptCost
        ws.Cells(10 + i, 5).Value = fixedDaily + closeDaily
        ws.Cells(10 + i, 6).Value = total
        ws.Cells(10 + i, 7).Value = sales
        If sales > 0 Then ws.Cells(10 + i, 8).Value = Format(total / sales, "0.00%")
    Next i
    ws.Columns("B:I").AutoFit
    modWork.AddBackButton ws
End Sub

Private Function HoursForDate(shifts As Worksheet, dateStr As String) As Double
    If shifts Is Nothing Then Exit Function
    Dim dCol As Long, sCol As Long, eCol As Long
    dCol = modAuth.HeaderCol(shifts, "date")
    sCol = modAuth.HeaderCol(shifts, "start_time")
    eCol = modAuth.HeaderCol(shifts, "end_time")
    Dim lastRow As Long: lastRow = shifts.Cells(shifts.Rows.Count, 1).End(xlUp).Row
    Dim i As Long, total As Double
    For i = 2 To lastRow
        If CStr(shifts.Cells(i, dCol).Value) = dateStr Then
            Dim a As Date, b As Date, h As Double
            On Error Resume Next
            a = TimeValue(CStr(shifts.Cells(i, sCol).Value))
            b = TimeValue(CStr(shifts.Cells(i, eCol).Value))
            On Error GoTo 0
            h = (b - a) * 24
            If h <= 0 Then h = h + 24
            total = total + h
        End If
    Next i
    HoursForDate = total
End Function

Private Function LoadSalesActual(dateStr As String) As Variant
    Dim ws As Worksheet: Set ws = modData.DataSheet("daily_sales_reports")
    If ws Is Nothing Then Exit Function
    Dim dCol As Long, fCol As Long
    dCol = modAuth.HeaderCol(ws, "report_date")
    fCol = modAuth.HeaderCol(ws, "actual_sales")
    Dim lastRow As Long: lastRow = ws.Cells(ws.Rows.Count, dCol).End(xlUp).Row
    Dim i As Long
    For i = 2 To lastRow
        If CStr(ws.Cells(i, dCol).Value) = dateStr Then LoadSalesActual = ws.Cells(i, fCol).Value: Exit Function
    Next i
End Function
