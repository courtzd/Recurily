import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Settings, LineChart, Zap } from 'lucide-react';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    tooltip: 'View your subscription overview and key metrics'
  },
  { 
    name: 'Subscriptions', 
    href: '/subscriptions', 
    icon: CreditCard,
    tooltip: 'Manage and track all your subscriptions'
  },
  { 
    name: 'Insights', 
    href: '/insights', 
    icon: LineChart,
    tooltip: 'View detailed analytics and spending trends'
  },
  { 
   name: 'Quick Add', 
    href: '/dashboard?setup=true', 
    icon: Zap,
   tooltip: 'Quickly add new subscriptions'
  },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings,
    tooltip: 'Configure your account and preferences'
  },
];

export function Sidebar() {
  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <img
              className="h-8 w-auto"
              src="https://tailwindui.com/img/logos/workflow-logo-indigo-600-mark-gray-800-text.svg"
              alt="Recurily"
            />
          </div>
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                title={item.tooltip}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon
                  className="mr-3 flex-shrink-0 h-6 w-6"
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}