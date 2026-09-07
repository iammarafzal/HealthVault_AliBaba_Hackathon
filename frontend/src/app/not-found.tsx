import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="mx-auto w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
            404 Error
          </span>
          <h1 className="text-2xl font-bold tracking-tight pt-2">Page Not Found</h1>
          <p className="text-sm text-slate-400">
            The page or medical record you are looking for does not exist or has been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition-colors shadow-lg shadow-teal-900/20"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
