export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Página no encontrada / Page Not Found</p>
        <a href="/" className="text-primary-600 font-semibold hover:underline">Volver al Inicio / Return Home</a>
      </div>
    </div>
  );
}
