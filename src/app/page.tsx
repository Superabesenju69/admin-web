// Root page: client-side auth check via localStorage (simple usuarios auth)
// We can't use Supabase Auth session anymore since we use a custom table.
// Redirect to /login is handled by Dashboard.tsx on mount.
import Dashboard from './Dashboard';

export default function Page() {
  return <Dashboard />;
}
