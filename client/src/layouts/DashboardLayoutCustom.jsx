import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/SidebarCustom";
import Footer from "../components/Footer";

export default function C_DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-50/40 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>

        <Footer />
      </div>
    </div>
  );
}
