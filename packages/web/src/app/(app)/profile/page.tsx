'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { getProfile, updateProfile, logout } from '@/services/api/auth.api';
import { UserApiResponse } from '@fylr/types';
import SessionsManager from '@/components/features/profile/SessionsManager';
import SubscriptionManager from '@/components/features/profile/SubscriptionManager';

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<UserApiResponse | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
      setName(profile.name);
      setEmail(profile.email);
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password match if password is being changed
    if (password && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSaving(true);

    try {
      const updateData: Partial<{
        name: string;
        email: string;
        password: string;
      }> = {};

      if (name !== user?.name) updateData.name = name;
      if (email !== user?.email) updateData.email = email;
      if (password) updateData.password = password;

      if (Object.keys(updateData).length === 0) {
        toast.error('No changes to save');
        setIsSaving(false);
        return;
      }

      const updatedUser = await updateProfile(updateData);
      setUser(updatedUser);
      setName(updatedUser.name);
      setEmail(updatedUser.email);
      setPassword('');
      setConfirmPassword('');

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      // Error toast is handled by axios interceptor
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/auth/login');
    } catch (error) {
      console.error('Failed to logout:', error);
      // Error toast is handled by axios interceptor
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Icon icon="line-md:loading-loop" className="w-12 h-12 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-100 p-4">
      <div className="w-full max-w-2xl bg-blue-50 rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.back()}
            className="mr-4 text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-lg"
          >
            <Icon icon="weui:back-outlined" className="text-2xl" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Profile Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your account information
            </p>
          </div>
        </div>

        {/* Subscription Section (ADD THIS) */}
        <div className="mt-8 pt-6 border-t">
          <SubscriptionManager />
        </div>

        {/* Profile Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your name"
              required
            />
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your.email@example.com"
              required
            />
          </div>

          {/* Password Section */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Change Password
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Leave blank if you don't want to change your password
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new password (min. 8 characters)"
                  minLength={8}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm new password"
                  minLength={8}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSaving ? (
                <span className="flex items-center justify-center">
                  <Icon icon="line-md:loading-loop" className="w-5 h-5 mr-2" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors font-medium"
            >
              <span className="flex items-center justify-center">
                <Icon
                  icon="heroicons:arrow-right-on-rectangle"
                  className="w-5 h-5 mr-2"
                />
                Logout
              </span>
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active Sessions
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            This is a list of devices that have logged into your account. Revoke
            any sessions that you do not recognize.
          </p>
          <SessionsManager />
        </div>

        {/* User Info */}
        <div className="mt-8 pt-6 border-t">
          <h2 className="text-sm font-medium text-gray-700 mb-2">
            Account Information
          </h2>
          <div className="text-sm text-gray-600">
            <p>
              User ID: <span className="font-mono text-xs">{user?.id}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
