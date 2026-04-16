"use client";

import { type Page } from "@/app/page";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onRefresh: () => void;
}

const navSections: {
  label: string;
  items: { page: Page; icon: string; label: string }[];
}[] = [
  {
    label: "Pipeline",
    items: [
      { page: "dashboard", icon: "⚡", label: "Dashboard" },
      { page: "topics", icon: "📊", label: "Validated Topics" },
      { page: "scripts", icon: "✍️", label: "Script Studio" },
      { page: "voice", icon: "🎙️", label: "Voice Profile" },
    ],
  },
  {
    label: "Growth",
    items: [
      { page: "campaigns", icon: "🎯", label: "Campaigns" },
      { page: "schedules", icon: "⏰", label: "Scheduled Runs" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { page: "settings", icon: "📈", label: "Analytics" },
    ],
  },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">P</div>
        <div className="sidebar-brand">
          <h1>Phaze</h1>
          <span>Content Engine</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map((item) => (
              <button
                key={item.page}
                className={`nav-item ${currentPage === item.page ? "active" : ""}`}
                onClick={() => onNavigate(item.page)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}

        <div className="nav-section-label" style={{ marginTop: "auto" }}>
          System
        </div>
        <button className="nav-item" onClick={() => window.location.reload()}>
          <span className="nav-icon">🔄</span>
          Refresh Data
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="api-status">
          <span className="api-dot inactive" />
          <span>Mock Mode Active</span>
        </div>
      </div>
    </aside>
  );
}
