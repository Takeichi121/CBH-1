import KPICards from "@/components/dashboard/kpi-cards";
import SalesChart from "@/components/dashboard/sales-chart";
import RecentReports from "@/components/dashboard/recent-reports";
import { useLanguage } from "@/contexts/language-context";

export default function Dashboard() {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-4 md:space-y-6">
      <KPICards />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <SalesChart />
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">{t.pages.dashboard.performanceMetrics}</h3>
          <div className="text-center py-6 md:py-8 text-gray-500">
            <p className="text-xs md:text-sm">{t.pages.dashboard.noPerformanceData}</p>
            <p className="text-xs mt-1">
              <a href="/daily-sales" className="text-bk-red hover:text-red-700">
                {t.pages.dashboard.recordToSeeData}
              </a>
            </p>
          </div>
        </div>
      </div>
      
      <RecentReports />
    </div>
  );
}
