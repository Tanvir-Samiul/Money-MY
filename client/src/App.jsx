import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Transactions from "./pages/Transactions.jsx";
import Add from "./pages/Add.jsx";
import AddManual from "./pages/AddManual.jsx";
import ShareReceipt from "./pages/ShareReceipt.jsx";

import More from "./pages/More.jsx";
import Categories from "./pages/Categories.jsx";
import TransactionDetail from "./pages/TransactionDetail.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="add" element={<Add />} />
        <Route path="add/manual" element={<AddManual />} />
        <Route path="add/upload" element={<ShareReceipt />} />

        <Route path="more" element={<More />} />
        <Route path="categories" element={<Categories />} />
        <Route path="transactions/:id" element={<TransactionDetail />} />
      </Route>
    </Routes>
  );
}
