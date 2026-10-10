import { Route, Routes } from "react-router-dom";
import Navbar from "./components/layout/Navbar.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Garden from "./pages/Garden.jsx";
import AIChat from "./pages/AIChat.jsx";
import PlantDetail from "./pages/PlantDetail.jsx";
import GardenTasks from "./pages/GardenTasks.jsx";
import GrowthJournal from "./pages/GrowthJournal.jsx";

function NotFound() {
  return (
    <div className="panel">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink/70">Use the menu to get back to your garden.</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 sm:px-6 md:pb-12">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/garden" element={<Garden />} />
            <Route path="/ask" element={<AIChat />} />
            <Route path="/plants/:id" element={<PlantDetail />} />
            <Route path="/tasks" element={<GardenTasks />} />
            <Route path="/journal" element={<GrowthJournal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
