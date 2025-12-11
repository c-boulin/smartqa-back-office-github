import React, { useEffect, useState } from 'react';
import { Users, Loader, Shield } from 'lucide-react';
import { usersApiService, User } from '../services/usersApi';
import { Role } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { state: authState, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const isSuperAdmin = authState.user?.role?.slug === 'superadmin';
  const canAccessSettings = hasPermission(PERMISSIONS.ADMIN_PANEL.READ);

  useEffect(() => {
    if (!canAccessSettings) {
      toast.error('You do not have permission to access this page');
      return;
    }
    loadData();
  }, [canAccessSettings]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        usersApiService.getUsers(),
        usersApiService.getRoles()
      ]);

      console.log('Users API Response:', usersResponse);
      console.log('Roles API Response:', rolesResponse);

      const transformedUsers = usersResponse.data.map(apiUser =>
        usersApiService.transformApiUser(apiUser, usersResponse.included)
      );

      console.log('Transformed Users:', transformedUsers);

      setUsers(transformedUsers);
      setRoles(rolesResponse);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load users and roles');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      setUpdatingUserId(userId);
      await usersApiService.updateUserRole(userId, parseInt(newRoleId));

      const updatedRole = roles.find(r => r.id === parseInt(newRoleId));

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, role_id: newRoleId, role: updatedRole }
            : user
        )
      );

      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Failed to update user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!canAccessSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-gray-400">You do not have permission to access this page</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-gray-400">Manage users and permissions</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-500" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">User Management</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
            Assign roles to users to control their access and permissions
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Current Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  Assign Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {users
                .filter(user => !(authState.user && authState.user.id.toString() === user.id))
                .filter(user => isSuperAdmin || user.role?.slug !== 'superadmin')
                .map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-gray-400">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-gray-400">
                        {user.login}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {user.role ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-700">
                            {user.role.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400">
                            No Role
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role_id || ''}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={updatingUserId === user.id}
                          className="block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <option value="">Select Role</option>
                          {roles
                            .filter(role => isSuperAdmin || role.slug !== 'superadmin')
                            .map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                        </select>
                        {updatingUserId === user.id && (
                          <Loader className="w-4 h-4 text-cyan-500 animate-spin flex-shrink-0" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-400 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
