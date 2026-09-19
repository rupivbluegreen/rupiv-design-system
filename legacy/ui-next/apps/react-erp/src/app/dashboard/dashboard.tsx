import {
  CalendarCheck,
  Cog,
  Factory,
  FileText,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { AppShell, Card, KPICard, AIInsightCard, type SidebarItemData } from '@omniappsuiux/ui-react';
import { RevenueTrendChart, OrderDistributionChart } from './charts.js';
import './dashboard.css';

// English is the base copy; every string below is a candidate for a future i18n layer (next-intl, matching the OmniApps app) rather than a literal to translate by hand later.

const NAV: SidebarItemData[] = [
  { key: 'home', label: 'Home', icon: <LayoutDashboard />, href: '#', active: true },
  { key: 'orders', label: 'Orders', icon: <ShoppingCart />, href: '#' },
  { key: 'production', label: 'Production', icon: <Factory />, href: '#' },
  { key: 'inventory', label: 'Inventory', icon: <Package />, href: '#' },
  { key: 'finance', label: 'Finance', icon: <ReceiptText />, href: '#' },
  { key: 'crm', label: 'Customers (CRM)', icon: <Users />, href: '#' },
  { key: 'suppliers', label: 'Suppliers', icon: <Truck />, href: '#' },
  { key: 'reports', label: 'Reports', icon: <FileText />, href: '#' },
  { key: 'ai', label: 'AI Assistant', icon: <TrendingUp />, href: '#' },
];

const FOOTER_NAV: SidebarItemData[] = [{ key: 'settings', label: 'Settings', icon: <Cog />, href: '#' }];

const UPCOMING = [
  { icon: <CalendarCheck size={16} />, label: 'Production meeting', meta: 'Today 10:00' },
  { icon: <Truck size={16} />, label: 'ORD-2024-031 shipment', meta: 'Tomorrow' },
  { icon: <FileText size={16} />, label: 'Anatolia Home revision request', meta: 'Tomorrow' },
  { icon: <ReceiptText size={16} />, label: 'Monthly finance close', meta: 'Apr 30' },
];

export function Dashboard() {
  return (
    <AppShell
      logo="OmniApps"
      navItems={NAV}
      footerNav={FOOTER_NAV}
      user={{ name: 'Ayşe Demir', role: 'Operations Manager', initials: 'AD' }}
      tagline="Turkey's textile strength. Smarter tomorrows."
    >
      <div className="omni-dashboard">
        <div className="omni-dashboard-header-row">
          <div>
            <h1 className="omni-dashboard-greeting">Good morning, Ayşe 👋</h1>
            <p className="omni-dashboard-subline">Wednesday, April 24, 2024 · OmniApps, one step ahead every day.</p>
          </div>
          <AIInsightCard title="AI Suggestion" action={{ label: 'Create RFQ' }}>
            Your cotton fabric stock is running low. Generate a supply request for the next 2 weeks?
          </AIInsightCard>
        </div>

        <div className="omni-dashboard-kpis">
          <KPICard
            icon={<FileText />}
            tone="brand"
            label="Active Orders"
            value="12"
            delta={20}
            note="vs. last month"
          />
          <KPICard icon={<Factory />} tone="blue" label="In Production" value="24" delta={8} />
          <KPICard icon={<Truck />} tone="orange" label="Awaiting Shipment" value="8" delta={-27} deltaUpIsGood={false} />
          <KPICard icon={<TrendingUp />} tone="brand" label="Monthly Revenue (TL)" value="₺3,245,000" delta={15} />
        </div>

        <div className="omni-dashboard-charts-row">
          <Card padding="md">
            <div className="omni-dashboard-card-header">
              <h2>Revenue Trend</h2>
              <select className="omni-dashboard-period-select" defaultValue="monthly" aria-label="Period">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <RevenueTrendChart />
          </Card>

          <Card padding="md">
            <div className="omni-dashboard-card-header">
              <h2>Order Mix</h2>
            </div>
            <OrderDistributionChart />
            <ul className="omni-dashboard-legend">
              <li>
                <span className="omni-dashboard-legend-dot" style={{ background: 'var(--tx-color-brand-500)' }} />
                Export <b>45%</b>
              </li>
              <li>
                <span className="omni-dashboard-legend-dot" style={{ background: 'var(--tx-color-blue-500)' }} />
                Domestic <b>27%</b>
              </li>
              <li>
                <span className="omni-dashboard-legend-dot" style={{ background: 'var(--tx-color-orange-500)' }} />
                Own brand <b>13%</b>
              </li>
              <li>
                <span className="omni-dashboard-legend-dot" style={{ background: 'var(--tx-color-brand-300)' }} />
                Other <b>15%</b>
              </li>
            </ul>
          </Card>

          <Card padding="md">
            <div className="omni-dashboard-card-header">
              <h2>Upcoming</h2>
              <a href="#" className="omni-dashboard-link">
                View all
              </a>
            </div>
            <ul className="omni-dashboard-upcoming">
              {UPCOMING.map((item) => (
                <li key={item.label}>
                  <span className="omni-dashboard-upcoming-icon">{item.icon}</span>
                  <span className="omni-dashboard-upcoming-body">
                    <span className="omni-dashboard-upcoming-label">{item.label}</span>
                    <span className="omni-dashboard-upcoming-meta">{item.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="omni-dashboard-banner-row">
          <div className="omni-dashboard-editorial">
            <p className="omni-dashboard-editorial-title">
              Sustainable production,
              <br />a stronger future.
            </p>
            <a href="#" className="omni-dashboard-link omni-dashboard-editorial-link">
              View the sustainability report <span className="tx-directional-icon" aria-hidden="true">→</span>
            </a>
          </div>
          <Card padding="lg" className="omni-dashboard-quote">
            <p className="omni-dashboard-quote-text">"A better textile industry, through technology and people."</p>
            <p className="omni-dashboard-quote-attribution">OmniApps</p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
