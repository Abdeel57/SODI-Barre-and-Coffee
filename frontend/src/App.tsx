import { ReactNode, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useStore } from './store/useStore'
import { Toast } from './components/ui/Toast'
import { BottomNav } from './components/BottomNav'
import { InstallBanner } from './components/InstallBanner'
import { NotificationPrompt } from './components/NotificationPrompt'
import { AdminLayout } from './components/admin/AdminLayout'
import { CoachLayout } from './components/coach/CoachLayout'
import { Skeleton } from './components/ui/Skeleton'

// ── Lazy pages ─────────────────────────────────────────────────────────────────
const LandingPage    = lazy(() => import('./pages/LandingPage'))
const LoginPage      = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))
const BookingsPage = lazy(() => import('./pages/BookingsPage'))
const PackagesPage = lazy(() => import('./pages/PackagesPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AdminDashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const AdminClassesPage   = lazy(() => import('./pages/admin/ClassesPage'))
const AdminStudentsPage  = lazy(() => import('./pages/admin/StudentsPage'))
const AdminPaymentsPage  = lazy(() => import('./pages/admin/PaymentsPage'))
const AdminCoachesPage    = lazy(() => import('./pages/admin/CoachesPage'))
const AdminRedeemPage     = lazy(() => import('./pages/admin/RedeemPage'))
const CoachDashboardPage  = lazy(() => import('./pages/coach/DashboardPage'))
const CoachAttendancePage = lazy(() => import('./pages/coach/AttendancePage'))
const OnboardingOverlay   = lazy(() => import('./components/OnboardingOverlay'))
const DevFramesPage       = import.meta.env.DEV ? lazy(() => import('./pages/DevFramesPage')) : null

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-center gap-6 p-8">
      <img src="/LOGOSODI.png" alt="SODI" className="w-32 h-auto opacity-80" />
      <div className="w-48 flex flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4 mx-auto" />
      </div>
    </div>
  )
}

// ── Private route ──────────────────────────────────────────────────────────────
function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ── Admin layout route — persists sidebar across nested navigations ────────────
function AdminRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN') return <Navigate to="/schedule" replace />
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}

// ── Coach layout route ─────────────────────────────────────────────────────────
function CoachRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'COACH' && user.role !== 'ADMIN') return <Navigate to="/schedule" replace />
  return <CoachLayout />
}

// ── Smart redirect — manda a cada rol a su sección, landing si no hay sesión ───
function SmartRedirect() {
  const user = useStore((s) => s.user)
  if (!user) return <LandingPage />
  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />
  if (user.role === 'COACH') return <Navigate to="/coach/dashboard" replace />
  return <Navigate to="/schedule" replace />
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Dev only */}
          {DevFramesPage && <Route path="/dev-frames" element={<DevFramesPage />} />}

          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Inicio — redirige según rol o muestra landing */}
          <Route path="/" element={<SmartRedirect />} />
          <Route path="/schedule" element={<PrivateRoute><SchedulePage /></PrivateRoute>} />
          <Route path="/bookings" element={<PrivateRoute><BookingsPage /></PrivateRoute>} />
          <Route path="/packages" element={<PrivateRoute><PackagesPage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

          {/* Admin — nested so AdminLayout persists between tabs */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="classes"   element={<AdminClassesPage />} />
            <Route path="students"  element={<AdminStudentsPage />} />
            <Route path="coaches"   element={<AdminCoachesPage />} />
            <Route path="payments"  element={<AdminPaymentsPage />} />
            <Route path="redeem"    element={<AdminRedeemPage />} />
          </Route>

          {/* Coach */}
          <Route path="/coach" element={<CoachRoute />}>
            <Route index element={<Navigate to="/coach/dashboard" replace />} />
            <Route path="dashboard" element={<CoachDashboardPage />} />
            <Route path="attendance" element={<CoachAttendancePage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <Toast />
      <BottomNav />
      <InstallBanner />
      <NotificationPrompt />
      <OnboardingOverlay />
    </>
  )
}
