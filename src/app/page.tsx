"use client";

import { useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardPage from "@/components/pages/DashboardPage";
import TopicsPage from "@/components/pages/TopicsPage";
import ScriptsPage from "@/components/pages/ScriptsPage";
import VoicePage from "@/components/pages/VoicePage";
import CampaignsPage from "@/components/pages/CampaignsPage";
import SchedulesPage from "@/components/pages/SchedulesPage";
import SettingsPage from "@/components/pages/SettingsPage";

export type Page = "dashboard" | "topics" | "scripts" | "voice" | "campaigns" | "schedules" | "settings";

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage key={refreshKey} onNavigate={setCurrentPage} />;
      case "topics":
        return <TopicsPage key={refreshKey} onNavigate={setCurrentPage} />;
      case "scripts":
        return <ScriptsPage key={refreshKey} />;
      case "voice":
        return <VoicePage key={refreshKey} />;
      case "campaigns":
        return <CampaignsPage key={refreshKey} />;
      case "schedules":
        return <SchedulesPage key={refreshKey} />;
      case "settings":
        return <SettingsPage key={refreshKey} />;
      default:
        return <DashboardPage key={refreshKey} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onRefresh={handleRefresh}
      />
      <main className="main-content">{renderPage()}</main>
    </div>
  );
}
