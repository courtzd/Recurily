import React from 'react';
import { Bell, Moon, Sun, Shield, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Settings() {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState({
    email: true,
    push: false,
    renewal: true,
    savings: true
  });
  const [theme, setTheme] = React.useState('light');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Profile</h2>
        <div className="flex items-center space-x-4">
          <img
            src={user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop'}
            alt={user?.email || 'Profile'}
            className="w-20 h-20 rounded-full"
          />
          <div>
            <p className="font-medium text-gray-900">{user?.email}</p>
            <p className="text-sm text-gray-500">Free Plan</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Bell className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
        </div>
        <div className="space-y-4">
          {Object.entries(notifications).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 capitalize">{key} Notifications</p>
                <p className="text-sm text-gray-500">
                  Receive {key} notifications about your subscriptions
                </p>
              </div>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key] }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  enabled ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 text-gray-400 mr-2" />
          ) : (
            <Sun className="w-5 h-5 text-gray-400 mr-2" />
          )}
          <h2 className="text-lg font-medium text-gray-900">Theme</h2>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setTheme('light')}
            className={`px-4 py-2 rounded-md ${
              theme === 'light'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`px-4 py-2 rounded-md ${
              theme === 'dark'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Shield className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Security</h2>
        </div>
        <button className="text-indigo-600 hover:text-indigo-700 font-medium">
          Change Password
        </button>
      </div>

      {/* Billing */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <CreditCard className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Billing</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900">Current Plan</p>
            <p className="text-sm text-gray-500">Free Plan</p>
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}