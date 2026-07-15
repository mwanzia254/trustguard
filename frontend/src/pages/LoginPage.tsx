import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const schema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // If already authenticated, redirect — no useEffect needed
  if (!isLoading && isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    });

    if (error) {
      if (error.status === 400 || error.message.toLowerCase().includes('invalid')) {
        toast.error('Incorrect email or password.');
      } else if (error.message.toLowerCase().includes('not confirmed')) {
        toast.error('Please confirm your email before signing in.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    // No navigate() here — bootAuth's onAuthStateChange will set isAuthenticated: true
    // which triggers the Navigate above on the next render
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Shield size={32} className="text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-2">Sign in to your ScamChek account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isSubmitting
                ? <><Loader2 size={18} className="animate-spin" /> Signing in...</>
                : 'Sign In'
              }
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
