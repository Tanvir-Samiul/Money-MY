import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Transactions from "./pages/Transactions.jsx";
import Add from "./pages/Add.jsx";
import Friends from "./pages/Friends.jsx";
import More from "./pages/More.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="add" element={<Add />} />
        <Route path="friends" element={<Friends />} />
        <Route path="more" element={<More />} />
      </Route>
    </Routes>
  );
}
