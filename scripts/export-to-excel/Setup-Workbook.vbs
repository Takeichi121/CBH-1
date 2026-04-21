' ====================================================================
' Setup-Workbook.vbs — Windows-side installer.
'
' What it does:
'   1. Opens dist/BK_Work_Schedule.xlsx in Excel
'   2. Imports every .bas/.cls in vba/modules/
'   3. Programmatically creates a UserForm named "frmLogin" and injects the
'      code from vba/forms/frmLogin.code.txt into it (this avoids the
'      .frm/.frx pair which can't be authored portably)
'   4. Replaces ThisWorkbook with the code from vba/modules/ThisWorkbook.cls
'   5. Saves a copy as dist/BK_Work_Schedule.xlsm
'
' Prerequisite (one-time): in Excel,
'   File → Options → Trust Center → Trust Center Settings →
'   Macro Settings → check "Trust access to the VBA project object model"
' ====================================================================
Option Explicit

Const xlOpenXMLWorkbookMacroEnabled = 52
Const vbext_ct_StdModule = 1
Const vbext_ct_ClassModule = 2
Const vbext_ct_MSForm = 3

Dim fso, scriptDir, srcXlsx, dstXlsm, vbaDir
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
srcXlsx = fso.GetAbsolutePathName(fso.BuildPath(scriptDir, "..\..\dist\BK_Work_Schedule.xlsx"))
dstXlsm = fso.GetAbsolutePathName(fso.BuildPath(scriptDir, "..\..\dist\BK_Work_Schedule.xlsm"))
vbaDir  = fso.GetAbsolutePathName(fso.BuildPath(scriptDir, "..\..\vba"))

If Not fso.FileExists(srcXlsx) Then
    WScript.Echo "Missing: " & srcXlsx & vbCrLf & "Run build-workbook.mjs first."
    WScript.Quit 1
End If

Dim xl, wb
Set xl = CreateObject("Excel.Application")
xl.Visible = False
xl.DisplayAlerts = False
xl.AutomationSecurity = 1

Set wb = xl.Workbooks.Open(srcXlsx)

' --- Strip class header from a .cls / .frm code file --------------------
Function StripClassHeader(code)
    Dim lines, i, out, started
    lines = Split(code, vbLf)
    started = False
    out = ""
    For i = 0 To UBound(lines)
        Dim t : t = Replace(lines(i), vbCr, "")
        If Not started Then
            ' Code begins after the Attribute / VERSION / BEGIN block.
            If Left(t, 7) = "Option " Or Left(t, 1) = "'" _
              Or Left(t, 4) = "Sub " Or Left(t, 8) = "Private " _
              Or Left(t, 7) = "Public " Or Left(t, 9) = "Function " Then
                started = True
                out = out & t & vbCrLf
            End If
        Else
            out = out & t & vbCrLf
        End If
    Next
    StripClassHeader = out
End Function

Function ReadFile(p)
    Dim ts : Set ts = fso.OpenTextFile(p, 1)
    ReadFile = ts.ReadAll
    ts.Close
End Function

Dim vbProj : Set vbProj = wb.VBProject

' --- 1. Replace ThisWorkbook code --------------------------------------
Dim thisWb : Set thisWb = vbProj.VBComponents("ThisWorkbook")
With thisWb.CodeModule
    .DeleteLines 1, .CountOfLines
    .AddFromString StripClassHeader(ReadFile(fso.BuildPath(vbaDir, "modules\ThisWorkbook.cls")))
End With
WScript.Echo "Patched: ThisWorkbook"

' --- 2. Import every standard .bas module ------------------------------
Dim folder : Set folder = fso.GetFolder(fso.BuildPath(vbaDir, "modules"))
Dim f
For Each f In folder.Files
    If LCase(fso.GetExtensionName(f.Name)) = "bas" Then
        On Error Resume Next
        vbProj.VBComponents.Remove vbProj.VBComponents(fso.GetBaseName(f.Name))
        On Error GoTo 0
        vbProj.VBComponents.Import f.Path
        WScript.Echo "Imported module: " & f.Name
    End If
Next

' --- 3. Create the UserForm programmatically ---------------------------
On Error Resume Next
vbProj.VBComponents.Remove vbProj.VBComponents("frmLogin")
On Error GoTo 0
Dim formComp : Set formComp = vbProj.VBComponents.Add(vbext_ct_MSForm)
formComp.Name = "frmLogin"
formComp.Properties("Caption").Value = "BK Work Schedule — Sign In"
formComp.Properties("Width").Value = 320
formComp.Properties("Height").Value = 220
formComp.CodeModule.AddFromString ReadFile(fso.BuildPath(vbaDir, "forms\frmLogin.code.txt"))
WScript.Echo "Created form: frmLogin"

' --- 4. Save as .xlsm --------------------------------------------------
wb.SaveAs dstXlsm, xlOpenXMLWorkbookMacroEnabled
wb.Close False
xl.Quit

WScript.Echo "Built: " & dstXlsm
