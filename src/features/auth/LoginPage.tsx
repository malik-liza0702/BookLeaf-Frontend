import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, LifeBuoy } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { ROLES, type Role, type User } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { homePathFor } from '@/auth/homePath';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';

const ADMIN_EMAIL_DOMAIN = '@bookleaf.com';

const loginSchema = z
  .object({
    role: z.enum(ROLES),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(1, 'Password is required'),
  })
  .refine((values) => values.role !== 'admin' || values.email.toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN), {
    path: ['email'],
    message: `Admin email must end with ${ADMIN_EMAIL_DOMAIN}`,
  });
type LoginValues = z.infer<typeof loginSchema>;

const ROLE_LABELS: Record<Role, string> = { author: 'Author', admin: 'Admin' };

/** Seeded accounts, shown so reviewers can switch roles quickly. */
const DEMO_ACCOUNTS: { label: string; hint: string; role: Role; email: string; password: string }[] = [
  { label: 'Author', hint: 'Priya Sharma', role: 'author', email: 'priya.sharma@email.com', password: 'Author@123' },
  { label: 'Admin', hint: 'Ops team', role: 'admin', email: 'admin@bookleaf.com', password: 'Admin@123' },
];

/** Only honour a "return to" path that belongs to the signed-in role's area. */
function redirectTarget(user: User, from: unknown): string {
  const area = user.role === 'admin' ? '/admin' : '/author';
  if (typeof from === 'string' && from.startsWith(area)) return from;
  return homePathFor(user.role);
}

export function LoginPage() {
  const { status, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'author', email: '', password: '' },
  });
  const role = watch('role');

  if (status === 'loading') return <FullPageSpinner label="Restoring your session…" />;
  if (user) return <Navigate to={redirectTarget(user, from)} replace />;

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const loggedIn = await login(values.email, values.password, values.role);
      navigate(redirectTarget(loggedIn, from), { replace: true });
    } catch (error) {
      setFormError(errorMessage(error, 'Sign in failed. Please try again.'));
    }
  };

  const fillDemo = (demoRole: Role, email: string, password: string) => {
    setValue('role', demoRole);
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    setFormError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow">
            <LifeBuoy className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">BookLeaf Author Support</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to track your books and support queries.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {formError}
              </div>
            )}
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium text-slate-700">Sign in as</legend>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                {ROLES.map((option) => (
                  <label key={option} className="cursor-pointer">
                    <input
                      type="radio"
                      value={option}
                      className="peer sr-only"
                      {...register('role', { deps: 'email' })}
                    />
                    <span
                      className={cn(
                        'block rounded-md px-3 py-1.5 text-center text-sm font-medium text-slate-600 transition-colors',
                        'hover:text-slate-900 peer-checked:bg-white peer-checked:text-slate-900 peer-checked:shadow-sm',
                        'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30',
                      )}
                    >
                      {ROLE_LABELS[option]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field
              label="Email"
              htmlFor="email"
              error={errors.email?.message}
              hint={role === 'admin' ? `Use your ${ADMIN_EMAIL_DOMAIN} work email.` : undefined}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
              />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...register('password')}
              />
            </Field>
            <Button type="submit" className="w-full" loading={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/70 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Demo accounts</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account.role, account.email, account.password)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-brand-500 hover:bg-brand-50"
              >
                <span className="block font-semibold text-slate-800">{account.label}</span>
                <span className="block truncate text-slate-500">{account.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Fills the form with a seeded account. Click "Sign in" to continue.</p>
        </div>
      </div>
    </div>
  );
}
