SCHTASKS /Delete /tn AlohaExport /f
SCHTASKS /Create /tn AlohaExport /tr "\"C:\Program Files\NCRBackOffice\AlohaExport.bat\"" /sc DAILY /ST 20:30:00 /F

SCHTASKS /Delete /tn AlohaImport /f

SCHTASKS /Delete /tn AlohaImportToMenulink /f

SCHTASKS /Delete /tn AlohaImportToMenulinkAfterEOD /f
SCHTASKS /Create /tn AlohaImportToMenulinkAfterEOD /tr "\"C:\Program Files\NCRBackOffice\AlohaImport.bat\"" /sc DAILY /ST 02:00:00 /F

SCHTASKS /Delete /tn AlohaScheduleEnforcement /f
SCHTASKS /Create /tn AlohaScheduleEnforcement /tr "\"C:\Program Files\NCRBackOffice\AlohaScheduleEnforcement.bat\"" /sc DAILY /ST 20:45:00 /F

SCHTASKS /Delete /tn DataMartExport /f
SCHTASKS /Create /tn DataMartExport /tr "\"C:\Program Files\NCRBackOffice\DataMartExport.bat\"" /sc DAILY /ST 03:45:00 /F

SCHTASKS /Delete /tn DBFPack /f
SCHTASKS /Create /tn DBFPack /tr "\"C:\Program Files\NCRBackOffice\DBFPack.bat\"" /sc DAILY /ST 02:45:00 /F

SCHTASKS /Delete /tn "RealTime" /f
SCHTASKS /Create /tn "RealTime" /tr "\"C:\Program Files\NCRBackOffice\RealTime.bat\"" /sc DAILY /ST 06:00:00 /RI 30 /DU 24:00 /F

SCHTASKS /Delete /tn LSSKMExport /f
SCHTASKS /Create /tn LSSKMExport /tr "\"C:\Program Files\NCRBackOffice\LSSKMExport.bat\"" /sc DAILY /ST 05:00:00 /F

SCHTASKS /Delete /tn CopyKMExport /f
SCHTASKS /Create /tn CopyKMExport /tr "\"D:\POSDataforBK\KitchenMinder_BK\copyKMExport.bat\"" /sc DAILY /ST 10:00:00 /F

SCHTASKS /Delete /tn KitchenMinder_BK /f
SCHTASKS /Create /tn KitchenMinder_BK /tr "\"D:\POSDataforBK\KitchenMinder_BK.exe\"" /sc DAILY /ST 06:00:00 /F

SCHTASKS /Delete /tn "CheckRepliWeb_Services" /f
SCHTASKS /Create /tn "CheckRepliWeb_Services" /tr "\"D:\RWAPP\Shell\CheckRepliWeb_Services.bat\"" /sc DAILY /ST 02:00:00 /RI 60 /DU 24:00 /F

SCHTASKS /Delete /tn GetSystemInfo /f
SCHTASKS /Create /tn GetSystemInfo /tr "\"C:\Radiant\GetSystemInfo.exe\"" /sc DAILY /ST 06:30:00 /F

SCHTASKS /Delete /tn "Check RepliWeb Services" /f

SCHTASKS /Delete /tn "CheckRepliWeb_Services.bat" /f

SCHTASKS /Delete /tn Shutdown /f
SCHTASKS /Create /tn Shutdown /tr "\"D:\Batch File\Shutdown.bat\"" /sc DAILY /ST 03:00:00 /F

SCHTASKS /Delete /tn ShutdownTerm /f
SCHTASKS /Create /tn ShutdownTerm /tr "\"D:\Batch File\ShutdownTerm.bat\"" /sc DAILY /ST 03:15:00 /F