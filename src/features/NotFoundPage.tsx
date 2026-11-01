import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        title="Page not found"
        description="The page you are looking for doesn't exist or has moved."
        action={
          <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
            Go to your home page
          </Link>
        }
      />
    </div>
  );
}
