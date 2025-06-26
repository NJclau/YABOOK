import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  HomeIcon, 
  Square3Stack3DIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function Navbar() {
  const { user, school, logout, isSuperAdmin, isSchoolAdmin } = useAuthStore();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Templates', href: '/templates', icon: Square3Stack3DIcon },
  ];

  // Add admin navigation for super admins
  if (isSuperAdmin()) {
    navigation.push({
      name: 'Schools',
      href: '/admin/schools',
      icon: BuildingOfficeIcon
    });
  }

  // Add school management for school admins
  if (isSchoolAdmin() && school) {
    navigation.push({
      name: 'School Settings',
      href: '/school/settings',
      icon: Cog6ToothIcon
    });
  }

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/dashboard" className="text-xl font-bold text-blue-600">
                YABOOK
              </Link>
              {school && (
                <span className="ml-3 text-sm text-gray-500 border-l border-gray-300 pl-3">
                  {school.name}
                </span>
              )}
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-gray-400" />
              <div className="text-sm">
                <div className="text-gray-700">{user?.name}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ')}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}