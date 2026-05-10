Attribute VB_Name = "modBorrow"
'==========================================================
' modBorrow — borrow tracker.
' borrow_transactions schema:
'   id, tx_date, due_date, tx_type, branch, item, qty, unit, borrower,
'   lender, note, status, created_at
'==========================================================
Option Explicit

Public Sub Render()
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("BorrowTracker")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("borrow.title")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    Dim btnIn As Button, btnOut As Button
    Set btnIn = ws.Buttons.Add(20, 50, 120, 26)
    btnIn.Caption = modI18n.T("borrow.in")
    btnIn.OnAction = "'modBorrow.NewTxn ""in""'"
    Set btnOut = ws.Buttons.Add(150, 50, 120, 26)
    btnOut.Caption = modI18n.T("borrow.out")
    btnOut.OnAction = "'modBorrow.NewTxn ""out""'"

    If modAuth.IsManagerLike() Then
        Dim btnMgr As Button
        Set btnMgr = ws.Buttons.Add(280, 50, 180, 26)
        btnMgr.Caption = modI18n.T("settings.borrow_master")
        btnMgr.OnAction = "modBorrow.EditMaster"
    End If

    Dim src As Worksheet: Set src = modData.DataSheet("borrow_transactions")
    Dim headers As Variant
    headers = Array("ID", "Type", "Item", "Branch", _
                    modI18n.T("common.date"), modI18n.T("borrow.due"), _
                    "Qty", "Unit", "Borrower", "Lender", modI18n.T("common.status"))
    Dim h As Long
    For h = 0 To UBound(headers)
        ws.Cells(5, 2 + h).Value = headers(h)
        ws.Cells(5, 2 + h).Font.Bold = True
        ws.Cells(5, 2 + h).Interior.Color = RGB(229, 231, 235)
    Next h
    If src Is Nothing Then Exit Sub

    Dim cType As Long, cItem As Long, cBranch As Long, cTxDate As Long
    Dim cDue As Long, cQty As Long, cUnit As Long, cBor As Long, cLen As Long, cSt As Long
    cType   = modAuth.HeaderCol(src, "tx_type")
    cItem   = modAuth.HeaderCol(src, "item")
    cBranch = modAuth.HeaderCol(src, "branch")
    cTxDate = modAuth.HeaderCol(src, "tx_date")
    cDue    = modAuth.HeaderCol(src, "due_date")
    cQty    = modAuth.HeaderCol(src, "qty")
    cUnit   = modAuth.HeaderCol(src, "unit")
    cBor    = modAuth.HeaderCol(src, "borrower")
    cLen    = modAuth.HeaderCol(src, "lender")
    cSt     = modAuth.HeaderCol(src, "status")

    Dim lastRow As Long: lastRow = src.Cells(src.Rows.Count, 1).End(xlUp).Row
    Dim i As Long, dst As Long: dst = 6
    For i = 2 To lastRow
        ws.Cells(dst, 2).Value  = src.Cells(i, 1).Value
        ws.Cells(dst, 3).Value  = src.Cells(i, cType).Value
        ws.Cells(dst, 4).Value  = src.Cells(i, cItem).Value
        ws.Cells(dst, 5).Value  = src.Cells(i, cBranch).Value
        ws.Cells(dst, 6).Value  = src.Cells(i, cTxDate).Value
        ws.Cells(dst, 7).Value  = src.Cells(i, cDue).Value
        ws.Cells(dst, 8).Value  = src.Cells(i, cQty).Value
        ws.Cells(dst, 9).Value  = src.Cells(i, cUnit).Value
        ws.Cells(dst, 10).Value = src.Cells(i, cBor).Value
        ws.Cells(dst, 11).Value = src.Cells(i, cLen).Value
        ws.Cells(dst, 12).Value = src.Cells(i, cSt).Value
        dst = dst + 1
    Next i
    ws.Columns("B:M").AutoFit
    modWork.AddBackButton ws
End Sub

Public Sub NewTxn(direction As String)
    Dim item As String: item = InputBox("Item:")
    If item = "" Then Exit Sub
    Dim branch As String: branch = InputBox("Branch:")
    Dim qty As String: qty = InputBox("Quantity:", , "1")
    Dim unit As String: unit = InputBox("Unit (pcs/kg/box):", , "pcs")
    Dim due As String: due = InputBox(modI18n.T("borrow.due") & " (yyyy-mm-dd)", , Format(Date + 7, "yyyy-mm-dd"))
    Dim other As String: other = InputBox(IIf(direction = "in", "Lender (other branch):", "Borrower (other branch):"))

    Dim src As Worksheet: Set src = modData.DataSheet("borrow_transactions")
    src.Unprotect modAuth.PROTECT_PWD
    Dim r As Long: r = src.Cells(src.Rows.Count, 1).End(xlUp).Row + 1
    src.Cells(r, 1).Value = modData.NextId("borrow_transactions")
    src.Cells(r, modAuth.HeaderCol(src, "tx_date")).Value = Format(Date, "yyyy-mm-dd")
    src.Cells(r, modAuth.HeaderCol(src, "due_date")).Value = due
    src.Cells(r, modAuth.HeaderCol(src, "tx_type")).Value = direction
    src.Cells(r, modAuth.HeaderCol(src, "branch")).Value = branch
    src.Cells(r, modAuth.HeaderCol(src, "item")).Value = item
    src.Cells(r, modAuth.HeaderCol(src, "qty")).Value = Val(qty)
    src.Cells(r, modAuth.HeaderCol(src, "unit")).Value = unit
    If direction = "in" Then
        src.Cells(r, modAuth.HeaderCol(src, "borrower")).Value = modAuth.CurrentStore()
        src.Cells(r, modAuth.HeaderCol(src, "lender")).Value = other
    Else
        src.Cells(r, modAuth.HeaderCol(src, "borrower")).Value = other
        src.Cells(r, modAuth.HeaderCol(src, "lender")).Value = modAuth.CurrentStore()
    End If
    src.Cells(r, modAuth.HeaderCol(src, "status")).Value = "open"
    src.Cells(r, modAuth.HeaderCol(src, "created_at")).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    src.Protect modAuth.PROTECT_PWD, UserInterfaceOnly:=True
    modSysLog.Log "borrow_" & direction, modAuth.CurrentUser(), item & "/" & branch
    Render
End Sub

' ----- Master data: branches, items, categories ----------------------------
Public Sub EditMaster()
    modAuth.RequireManager
    Dim ws As Worksheet: Set ws = ThisWorkbook.Worksheets("BorrowTracker")
    ws.Cells.Clear: ws.Buttons.Delete
    ws.Range("B2").Value = modI18n.T("settings.borrow_master")
    ws.Range("B2").Font.Size = 18: ws.Range("B2").Font.Bold = True

    Dim b As Button
    Set b = ws.Buttons.Add(20, 50, 200, 26)
    b.Caption = modI18n.T("borrow.branches"): b.OnAction = "modBorrow.EditBranches"
    Set b = ws.Buttons.Add(230, 50, 200, 26)
    b.Caption = modI18n.T("borrow.items"): b.OnAction = "modBorrow.EditItems"
    Set b = ws.Buttons.Add(440, 50, 200, 26)
    b.Caption = modI18n.T("borrow.back"): b.OnAction = "modBorrow.Render"
End Sub

Public Sub EditBranches()
    modAuth.RequireManager
    Dim ws As Worksheet: Set ws = modData.DataSheet("borrow_branches")
    ws.Visible = xlSheetVisible
    ws.Unprotect modAuth.PROTECT_PWD
    ws.Activate
    MsgBox modI18n.T("settings.edit_hint"), vbInformation
End Sub

Public Sub EditItems()
    modAuth.RequireManager
    Dim ws As Worksheet: Set ws = modData.DataSheet("borrow_items")
    ws.Visible = xlSheetVisible
    ws.Unprotect modAuth.PROTECT_PWD
    ws.Activate
    MsgBox modI18n.T("settings.edit_hint"), vbInformation
End Sub
