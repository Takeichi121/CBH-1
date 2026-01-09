"text-lg">{t.dailyTargets}</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm font-medium min-w-[100px] text-center">{t.months[selectedMonth - 1]} {selectedYear}</span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-200 dark:bg-slate-700">
                        <th className="px-2 py-2 border border-slate-300 min-w-[70px]">{t.date}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[100px]">{t.targetSales}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[100px]">{t.actualSales}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[100px]">{t.actualSalesMtd}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.actualTc}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.actualTcMtd}</th>

                        {/* --- คอลัมน์ Labor Hour (เพิ่มใหม่) --- */}
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px] bg-indigo-100 text-indigo-700">
                          {t.laborHour}
                        </th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px] bg-indigo-200 text-indigo-800">
                          {t.laborHourMtd}
                        </th>
                        {/* ----------------------------------- */}

                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.wasteRawDaily}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.wasteRawMtd}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.wasteMealDaily}</th>
                        <th className="px-2 py-2 text-right border border-slate-300 min-w-[80px]">{t.wasteMealMtd}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row) => (
                        <tr key={row.date} className="hover:bg-muted/30">
                          <td className="px-2 py-1 border border-slate-300 bg-slate-100">{row.displayDate}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">
                            <Input 
                              type="number" value={dailyTargets[row.date] || ""} 
                              onChange={(e) => handleTargetChange(row.date, e.target.value)}
                              className="h-7 text-right text-sm border-0 bg-transparent" 
                            />
                          </td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.actualSales > 0 ? formatNumber(row.actualSales) : ''}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.actualSalesMtd > 0 ? formatNumber(row.actualSalesMtd) : ''}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.actualTc > 0 ? formatNumber(row.actualTc) : ''}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.actualTcMtd > 0 ? formatNumber(row.actualTcMtd) : ''}</td>

                          {/* --- ข้อมูล Labor Hour --- */}
                          <td className="px-2 py-1 border border-slate-300 text-right bg-indigo-50 text-indigo-700">
                            {row.laborHour > 0 ? formatNumber(row.laborHour) : '-'}
                          </td>
                          <td className="px-2 py-1 border border-slate-300 text-right bg-indigo-100 text-indigo-800 font-medium">
                            {row.laborHourMtd > 0 ? formatNumber(row.laborHourMtd) : '-'}
                          </td>
                          {/* ------------------------- */}

                          <td className="px-2 py-1 border border-slate-300 text-right">{row.wasteRawDaily > 0 ? formatNumber(row.wasteRawDaily) : '-'}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.wasteRawMtd > 0 ? formatNumber(row.wasteRawMtd) : '-'}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.wasteMealDaily > 0 ? formatNumber(row.wasteMealDaily) : '-'}</td>
                          <td className="px-2 py-1 border border-slate-300 text-right">{row.wasteMealMtd > 0 ? formatNumber(row.wasteMealMtd) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 font-bold bg-slate-200">
                      <tr>
                        <td className="px-2 py-2 border border-slate-300">{t.total}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.targetSales)}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.actualSales)}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.actualSalesMtd)}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.actualTc)}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{formatNumber(totals.actualTcMtd)}</td>

                        {/* --- ผลรวม Labor Hour รายเดือน --- */}
                        <td className="px-2 py-2 border border-slate-300 text-right bg-indigo-200 text-indigo-900">
                          {formatNumber(totals.laborHour)}
                        </td>
                        <td className="px-2 py-2 border border-slate-300 text-right bg-indigo-300 text-indigo-900">-</td>
                        {/* --------------------------------- */}

                        <td className="px-2 py-2 border border-slate-300 text-right">-</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{tableData.length > 0 ? formatNumber(tableData[tableData.length - 1].wasteRawMtd) : '-'}</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">-</td>
                        <td className="px-2 py-2 border border-slate-300 text-right">{tableData.length > 0 ? formatNumber(tableData[tableData.length - 1].wasteMealMtd) : '-'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={handleSaveTargets} disabled={isSavingTargets}>
                {isSavingTargets ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t.save}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Waste Targets Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Waste Targets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>MTD Amount Target</Label>
                <Input type="number" value={wasteTargets.mtdAmount} onChange={(e) => setWasteTargets({...wasteTargets, mtdAmount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>MTD % Target</Label>
                <Input type="number" value={wasteTargets.mtdPercent} onChange={(e) => setWasteTargets({...wasteTargets, mtdPercent: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Meal Amount Target</Label>
                <Input type="number" value={wasteTargets.mealAmount} onChange={(e) => setWasteTargets({...wasteTargets, mealAmount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Meal % Target</Label>
                <Input type="number" value={wasteTargets.mealPercent} onChange={(e) => setWasteTargets({...wasteTargets, mealPercent: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Raw Amount Target</Label>
                <Input type="number" value={wasteTargets.rawAmount} onChange={(e) => setWasteTargets({...wasteTargets, rawAmount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Raw % Target</Label>
                <Input type="number" value={wasteTargets.rawPercent} onChange={(e) => setWasteTargets({...wasteTargets, rawPercent: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSaveWasteTargets} disabled={isSavingWaste}>
                {isSavingWaste ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t.save}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SalesLayout>
  );
}