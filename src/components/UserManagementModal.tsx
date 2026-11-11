'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AdminUser, UserRole } from '@/types';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from '@/lib/backendApi';
import clsx from 'clsx';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCountChanged?: () => void;
}

export default function UserManagementModal({
  isOpen,
  onClose,
  onUserCountChanged,
}: UserManagementModalProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');

  // Modal sub-states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    role: 'USER' as UserRole,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

  const openAdd = () => {
    setFormData({
      username: '',
      displayName: '',
      email: '',
      role: 'USER',
    });
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
    });
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.displayName || !formData.email) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setActionLoading(true);
    setFormError(null);
    try {
      await createAdminUser(formData);
      setIsAddOpen(false);
      await fetchUsers();
      onUserCountChanged?.();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    setFormError(null);
    try {
      await updateAdminUser(editingUser.id, formData);
      setEditingUser(null);
      await fetchUsers();
      onUserCountChanged?.();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setActionLoading(true);
    try {
      await deleteAdminUser(deletingUser.id);
      setDeletingUser(null);
      await fetchUsers();
      onUserCountChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-dark-bg border border-cyber-cyan/40 rounded-xl shadow-[0_0_50px_rgba(0,255,200,0.15)] w-full max-w-5xl my-8 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-dark-card border-b border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded border border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10">
              USER MGMT
            </span>
            <div>
              <h2 className="font-mono text-lg font-bold text-gray-100 flex items-center gap-2">
                ▶ Platform Users Directory
              </h2>
              <p className="font-mono text-xs text-gray-400">
                View, create, edit roles and manage Active Directory & platform user profiles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs text-gray-400 hover:text-cyber-red transition-colors px-3 py-1.5 rounded border border-dark-border hover:border-cyber-red/50 uppercase"
          >
            [ CLOSE ✕ ]
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-dark-bg/60 border-b border-dark-border flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <input
              type="text"
              placeholder="Filter by username, name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-dark-card border border-dark-border rounded px-3 py-2 font-mono text-xs text-gray-200 placeholder-gray-500 w-full max-w-md focus:outline-none focus:border-cyber-cyan transition-colors"
            />

            <div className="flex items-center border border-dark-border rounded overflow-hidden">
              {(['ALL', 'ADMIN', 'USER'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={clsx(
                    'font-mono text-xs px-3 py-1.5 uppercase transition-colors',
                    roleFilter === r
                      ? 'bg-cyber-cyan/20 text-cyber-cyan font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => fetchUsers()}
              className="font-mono text-xs text-gray-400 hover:text-cyber-cyan transition-colors px-3 py-2 rounded border border-dark-border hover:border-cyber-cyan/40 uppercase"
            >
              [ ↻ REFRESH ]
            </button>
            <button
              onClick={openAdd}
              className="font-mono text-xs font-bold text-dark-bg bg-cyber-green hover:bg-cyber-green/90 transition-all px-4 py-2 rounded uppercase shadow-[0_0_15px_rgba(0,255,100,0.3)]"
            >
              + ADD NEW USER
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 border border-cyber-red/40 bg-cyber-red/10 rounded font-mono text-cyber-red text-xs">
            ⚠ {error}
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs text-cyber-cyan animate-pulse">
                Fetching users directory...
              </span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-dark-border rounded-lg">
              <p className="font-mono text-gray-500 text-sm mb-2">No users found matching query.</p>
              <button
                onClick={openAdd}
                className="font-mono text-xs text-cyber-cyan hover:underline uppercase"
              >
                Create a new user now
              </button>
            </div>
          ) : (
            <div className="border border-dark-border rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-dark-card border-b border-dark-border">
                  <tr>
                    {['User', 'Email', 'Role', 'Instances', 'Solves', 'Joined', 'Actions'].map(
                      (h) => (
                        <th
                          key={h}
                          className="font-mono text-xs text-gray-500 uppercase tracking-widest px-4 py-3"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-dark-hover transition-colors font-mono text-xs"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-200">{u.displayName}</div>
                        <div className="text-gray-500 text-[11px]">@{u.username}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                            u.role === 'ADMIN'
                              ? 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
                              : 'border-cyber-green/50 text-cyber-green bg-cyber-green/10'
                          )}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {u.instancesCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {u.solvedCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="px-2.5 py-1 rounded border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan hover:text-dark-bg transition-colors"
                          >
                            [ EDIT ]
                          </button>
                          <button
                            onClick={() => setDeletingUser(u)}
                            className="px-2.5 py-1 rounded border border-cyber-red/40 text-cyber-red hover:bg-cyber-red hover:text-dark-bg transition-colors"
                          >
                            [ DELETE ]
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-dark-card border-t border-dark-border flex items-center justify-between font-mono text-xs text-gray-500">
          <span>Showing {filteredUsers.length} of {users.length} total users</span>
          <span>Role changes take effect upon next login/token refresh</span>
        </div>
      </div>

      {/* ===================== ADD USER MODAL ===================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-green/40 rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-mono text-base font-bold text-cyber-green mb-4 flex items-center gap-2">
              ▶ Add New Platform User
            </h3>
            {formError && (
              <div className="mb-4 p-2.5 border border-cyber-red/40 bg-cyber-red/10 rounded font-mono text-cyber-red text-xs">
                ⚠ {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. agjeta"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-green"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Andi Gjeta"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-green"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. andigjeta@harryfultz.local"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-green"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-green"
                >
                  <option value="USER">USER (Student / Participant)</option>
                  <option value="ADMIN">ADMIN (Full Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 border border-dark-border rounded text-gray-400 hover:text-gray-200 uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-cyber-green text-dark-bg font-bold rounded uppercase hover:bg-cyber-green/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== EDIT USER MODAL ===================== */}
      {editingUser && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-cyan/40 rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-mono text-base font-bold text-cyber-cyan mb-4 flex items-center gap-2">
              ▶ Edit User: {editingUser.username}
            </h3>
            {formError && (
              <div className="mb-4 p-2.5 border border-cyber-red/40 bg-cyber-red/10 rounded font-mono text-cyber-red text-xs">
                ⚠ {formError}
              </div>
            )}
            <form onSubmit={handleUpdate} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-cyan"
                >
                  <option value="USER">USER (Student / Participant)</option>
                  <option value="ADMIN">ADMIN (Full Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-2 border border-dark-border rounded text-gray-400 hover:text-gray-200 uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-cyber-cyan text-dark-bg font-bold rounded uppercase hover:bg-cyber-cyan/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {deletingUser && (
        <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-red/50 rounded-lg max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-mono text-base font-bold text-cyber-red mb-2 flex items-center gap-2">
              ⚠ Confirm Delete User
            </h3>
            <p className="font-mono text-xs text-gray-300 mb-4 leading-relaxed">
              Are you sure you want to permanently delete user{' '}
              <span className="text-white font-bold">"{deletingUser.displayName}"</span> (
              <span className="text-cyber-cyan">@{deletingUser.username}</span>)?
              <br />
              <br />
              <span className="text-cyber-red font-semibold">Warning:</span> All instances,
              submissions, and sessions associated with this user will be deleted permanently.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-3 py-2 border border-dark-border rounded text-gray-400 hover:text-gray-200 uppercase font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="px-4 py-2 bg-cyber-red text-dark-bg font-bold rounded uppercase hover:bg-cyber-red/90 disabled:opacity-50 font-mono text-xs"
              >
                {actionLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
