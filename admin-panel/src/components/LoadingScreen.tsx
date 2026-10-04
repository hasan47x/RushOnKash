import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950">
      <div className="text-center">
        <Loader2 className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-dark-400">Loading...</p>
      </div>
    </div>
  );
}