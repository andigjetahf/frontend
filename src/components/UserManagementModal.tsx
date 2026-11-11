'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AdminUser, UserRole } from '@/types';
import {
  getAdminUsers,
  createAdminUser,
  deleteAdminUser,
} from '@/lib/backendApi';
import clsx from 'clsx';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCountChanged?: () => void;
}

/**
 * Standardi Shqiptar i formatimit te dates: DD/MM/YYYY HH:mm
 */
function formatAlbanianDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
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

  // Sub-states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for creating a new user
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
      setError(err?.response?.data?.error || 'Dështoi ngarkimi i listës së përdoruesve.');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.displayName || !formData.email) {
      setFormError('Ju lutem plotësoni të gjitha fushat e kërkuara.');
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
      setFormError(err?.response?.data?.error || 'Dështoi krijimi i përdoruesit.');
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
      setError(err?.response?.data?.error || 'Dështoi fshirja e përdoruesit.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-dark-bg border border-cyber-cyan/40 rounded-xl shadow-[0_0_50px_rgba(0,255,200,0.15)] w-full max-w-6xl my-8 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-dark-card border-b border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded border border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10">
              USER DIRECTORY
            </span>
            <div>
              <h2 className="font-mono text-lg font-bold text-gray-100 flex items-center gap-2">
                ▶ Drejtoriumi i Përdoruesve
              </h2>
              <p className="font-mono text-xs text-gray-400">
                Lista e plotë e përdoruesve, pikët, instancat dhe të dhënat e llogarive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs text-gray-400 hover:text-cyber-red transition-colors px-3 py-1.5 rounded border border-dark-border hover:border-cyber-red/50 uppercase"
          >
            [ MBYLL ✕ ]
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-dark-bg/60 border-b border-dark-border flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <input
              type="text"
              placeholder="Filtro sipas username, emrit, ose email-it..."
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
                  {r === 'ALL' ? 'TË GJITHË' : r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => fetchUsers()}
              className="font-mono text-xs text-gray-400 hover:text-cyber-cyan transition-colors px-3 py-2 rounded border border-dark-border hover:border-cyber-cyan/40 uppercase"
            >
              [ ↻ RIFRESKO ]
            </button>
            <button
              onClick={openAdd}
              className="font-mono text-xs font-bold text-dark-bg bg-cyber-green hover:bg-cyber-green/90 transition-all px-4 py-2 rounded uppercase shadow-[0_0_15px_rgba(0,255,100,0.3)]"
            >
              + SHTO PËRDORUES
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
                Po ngarkohen të dhënat e përdoruesve...
              </span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-dark-border rounded-lg">
              <p className="font-mono text-gray-500 text-sm mb-2">Nuk u gjet asnjë përdorues me këtë filtër.</p>
              <button
                onClick={openAdd}
                className="font-mono text-xs text-cyber-cyan hover:underline uppercase"
              >
                Krijo një përdorues të ri tani
              </button>
            </div>
          ) : (
            <div className="border border-dark-border rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-dark-card border-b border-dark-border">
                  <tr>
                    {[
                      'Përdoruesi',
                      'Email',
                      'Roli',
                      'Pikët',
                      'Të Zgjidhura',
                      'Instanca',
                      'Data e Regjistrimit',
                      'Veprime',
                    ].map((h) => (
                      <th
                        key={h}
                        className="font-mono text-xs text-gray-500 uppercase tracking-widest px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
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
                      {/* Pikët */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-cyber-yellow text-sm">
                          {u.totalPoints ?? 0}
                        </span>
                        <span className="text-gray-500 text-[10px] ml-1">pts</span>
                      </td>
                      {/* Të zgjidhura */}
                      <td className="px-4 py-3 text-cyber-green">
                        {u.solvedCount ?? 0}
                      </td>
                      {/* Instancat */}
                      <td className="px-4 py-3 text-gray-400">
                        {u.instancesCount ?? 0}
                      </td>
                      {/* Data me formatin Shqiptar: DD/MM/YYYY HH:mm */}
                      <td className="px-4 py-3 text-gray-300 tabular-nums">
                        {formatAlbanianDate(u.createdAt)}
                      </td>
                      {/* Veprimet: Vetëm Fshirje */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="px-2.5 py-1 rounded border border-cyber-red/40 text-cyber-red hover:bg-cyber-red hover:text-dark-bg transition-colors"
                        >
                          [ FSHIJ ]
                        </button>
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
          <span>Shfaqur: {filteredUsers.length} nga {users.length} përdorues gjithsej</span>
          <span>Formati i kohës: Standarti Shqiptar (DD/MM/YYYY)</span>
        </div>
      </div>

      {/* ===================== SHTO PËRDORUES ===================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-green/40 rounded-lg max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-mono text-base font-bold text-cyber-green mb-4 flex items-center gap-2">
              ▶ Shto Përdorues të Ri në Platformë
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
                  placeholder="p.sh. agjeta"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-green"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Emri i Plotë (Display Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="p.sh. Andi Gjeta"
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
                  placeholder="p.sh. andigjeta@harryfultz.local"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-green"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Roli
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-green"
                >
                  <option value="USER">USER (Student / Pjesëmarrës)</option>
                  <option value="ADMIN">ADMIN (Administrator)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-2 border border-dark-border rounded text-gray-400 hover:text-gray-200 uppercase"
                >
                  Anulo
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-cyber-green text-dark-bg font-bold rounded uppercase hover:bg-cyber-green/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Duke krijuar...' : 'Krijo Përdorues'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== KONFIRMIMI I FSHIRJES ===================== */}
      {deletingUser && (
        <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-red/50 rounded-lg max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-mono text-base font-bold text-cyber-red mb-2 flex items-center gap-2">
              ⚠ Konfirmo Fshirjen
            </h3>
            <p className="font-mono text-xs text-gray-300 mb-4 leading-relaxed">
              A jeni i sigurt që dëshironi të fshini përdoruesin{' '}
              <span className="text-white font-bold">"{deletingUser.displayName}"</span> (
              <span className="text-cyber-cyan">@{deletingUser.username}</span>)?
              <br />
              <br />
              <span className="text-cyber-red font-semibold">Kujdes:</span> Të gjitha instancat,
              përgjigjet e sfidave dhe të dhënat e sesioneve të këtij përdoruesi do të fshihen përfundimisht.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-3 py-2 border border-dark-border rounded text-gray-400 hover:text-gray-200 uppercase font-mono text-xs"
              >
                Anulo
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="px-4 py-2 bg-cyber-red text-dark-bg font-bold rounded uppercase hover:bg-cyber-red/90 disabled:opacity-50 font-mono text-xs"
              >
                {actionLoading ? 'Duke fshirë...' : 'Fshij Përdoruesin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
