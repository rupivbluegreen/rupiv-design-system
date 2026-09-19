import { useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Factory, FileText, Truck, TrendingUp } from 'lucide-react';
import { AppShell, KPICard, Button, StatusBadge, AIInsightCard, type SidebarItemData } from '@omniappsuiux/ui-react';

// Real Arabic UI strings, not placeholder nonsense — Home/Orders/Production/Inventory/Reports plus a search prompt and a KPI set.
const NAV: SidebarItemData[] = [
  { key: 'home', label: 'الرئيسية', icon: <LayoutDashboard />, href: '#', active: true },
  { key: 'orders', label: 'الطلبات', icon: <ShoppingCart />, href: '#' },
  { key: 'production', label: 'الإنتاج', icon: <Factory />, href: '#' },
  { key: 'reports', label: 'التقارير', icon: <FileText />, href: '#' },
];

// Standalone proof page: sets dir="rtl" and lang="ar" on <html>, exactly how the production OmniApps app drives direction from next-intl.
export function RTLPreview() {
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'ar';
    return () => {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    };
  }, []);

  return (
    <AppShell
      logo="OmniApps"
      navItems={NAV}
      user={{ name: 'آية دمير', role: 'مديرة العمليات', initials: 'أد' }}
      tagline="قوة النسيج التركي. غدٌ أذكى."
    >
      <div style={{ display: 'grid', gap: 'var(--tx-space-3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--tx-space-2)' }}>
          <KPICard icon={<FileText />} tone="brand" label="الطلبات النشطة" value="12" delta={20} note="مقارنة بالشهر الماضي" />
          <KPICard icon={<Truck />} tone="orange" label="بانتظار الشحن" value="8" delta={-27} deltaUpIsGood={false} />
        </div>
        {/* The trailing arrow is the directional-icon proof: it must point into the reading direction, i.e. left, in this RTL view. */}
        <AIInsightCard title="اقتراح الذكاء الاصطناعي" action={{ label: 'إنشاء طلب عرض سعر' }}>
          مخزون القطن القطني منخفض. هل تريد إنشاء طلب توريد للأسبوعين القادمين؟
        </AIInsightCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tx-space-2)' }}>
          <Button variant="primary" icon={<TrendingUp size={16} />}>
            إنشاء طلب عرض سعر
          </Button>
          <StatusBadge tone="brand">قيد المراجعة</StatusBadge>
          <StatusBadge tone="red">متأخر</StatusBadge>
        </div>
      </div>
    </AppShell>
  );
}
