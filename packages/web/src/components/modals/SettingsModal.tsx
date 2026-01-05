import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import toast from 'react-hot-toast';
import { getProfile, updateProfile, logout } from '@/services/api/auth.api';
import { UserApiResponse } from '@fylr/types';
import SessionsManager from '@/components/features/profile/SessionsManager';
import SubscriptionManager from '@/components/features/profile/SubscriptionManager';

import Button from '../ui/Button';

type SettingsType = 'Subscription' | 'Profile' | 'Sessions' | 'Info';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SETTINGS_TYPES: SettingsType[] = [
  'Subscription',
  'Profile',
  'Sessions',
  'Info',
];

const HeaderSection = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="flex items-center">
      <button
        onClick={onClose}
        className="mr-4 text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-lg"
      >
        <Icon icon="weui:back-outlined" className="text-2xl" />
      </button>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account information</p>
      </div>
    </div>
  );
};

const SubscriptionSection = () => {
  return <SubscriptionManager />;
};

const ProfileSection = ({
  handleUpdateProfile,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  isSaving,
  handleLogout,
}: {
  handleUpdateProfile: (e: React.FormEvent) => Promise<void>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  isSaving: boolean;
  handleLogout: () => Promise<void>;
}) => {
  return (
    <form onSubmit={handleUpdateProfile}>
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
  );
};

const SessionsSection = () => {
  return (
    <div className="overflow-y-scroll">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Active Sessions
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        This is a list of devices that have logged into your account. Revoke any
        sessions that you do not recognize.
      </p>
      <SessionsManager />
    </div>
  );
};

const InfoSection = ({ user }: { user: UserApiResponse | null }) => {
  return (
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
  );
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<UserApiResponse | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    }
  };

  const [settingsType, setSettingsType] =
    useState<SettingsType>('Subscription');

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const renderContent = () => {
    switch (settingsType) {
      case 'Subscription':
        return <SubscriptionSection />;
      case 'Profile':
        return (
          <ProfileSection
            handleUpdateProfile={handleUpdateProfile}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            isSaving={isSaving}
            handleLogout={handleLogout}
          />
        );
      case 'Sessions':
        return <SessionsSection />;
      case 'Info':
        return <InfoSection user={user} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-16">
      <div className="bg-blue-50 w-full h-full p-2 rounded-3xl flex gap-4">
        <div className="bg-blue-100 rounded-2xl p-4 w-1/4 h-full">
          <HeaderSection onClose={onClose} />
          <div className="flex flex-col gap-2 mt-4">
            {SETTINGS_TYPES.map((type) => (
              <Button
                key={type}
                variant={settingsType === type ? 'primary' : 'secondary'}
                disabled={settingsType === type}
                name={type}
                onClick={() => setSettingsType(type)}
              />
            ))}
          </div>
        </div>
        <div className="w-full flex justify-center">
          <div className="bg-white rounded-2xl p-6 w-full h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full w-full">
                  <Icon
                    icon="line-md:loading-loop"
                    className="w-12 h-12 text-blue-500"
                  />
                </div>
              ) : (
                renderContent()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
