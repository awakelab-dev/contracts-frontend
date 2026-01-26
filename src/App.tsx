import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import StudentsListPage from "./pages/StudentsListPage";
import CompaniesListPage from "./pages/CompaniesListPage";
import CompanyDetailPage from "./pages/CompanyDetailPage";
import VacanciesListPage from "./pages/VacanciesListPage";
import VacancyDetailPage from "./pages/VacancyDetailPage";
import MatchingPage from "./pages/MatchingPage";
import InvitationsPage from "./pages/InvitationsPage";
import InterviewsListPage from "./pages/InterviewsListPage";
import ImportPage from "./pages/ImportPage";
import EmailTemplatesPage from "./pages/EmailTemplatesPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentPracticesPage from "./pages/StudentPracticesPage";
import StudentInsertionsPage from "./pages/StudentInsertionsPage";
import StudentDetailPage from "./pages/StudentDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="students/:id/practicas" element={<StudentPracticesPage />} />
          <Route path="students/:id/inserciones" element={<StudentInsertionsPage />} />
          <Route index element={<DashboardPage />} />
          <Route path="students" element={<StudentsListPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />
          <Route path="companies" element={<CompaniesListPage />} />
          <Route path="companies/:id" element={<CompanyDetailPage />} />
          <Route path="vacancies" element={<VacanciesListPage />} />
          <Route path="vacancies/:id" element={<VacancyDetailPage />} />
          <Route path="matching" element={<MatchingPage />} />
          <Route path="interviews" element={<InterviewsListPage />} />
          <Route path="invitations" element={<InvitationsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="emails" element={<EmailTemplatesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
