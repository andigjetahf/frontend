'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AdminChallenge } from '@/types';
import {
  getAdminChallenges,
  createAdminChallenge,
  updateAdminChallenge,
  deleteAdminChallenge,
} from '@/lib/backendApi';
import clsx from 'clsx';

interface ChallengeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeCountChanged?: () => void;
}

function formatAlbanianDate(dateStr?: string): string {
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

export default function ChallengeManagementModal({
  isOpen,
  onClose,
  onChallengeCountChanged,
}: ChallengeManagementModalProps) {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

  // Sub-dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<AdminChallenge | null>(null);
  const [deletingChallenge, setDeletingChallenge] = useState<AdminChallenge | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'Web Security',
    difficulty: 'Medium',
    points: 500,
    dockerImage: 'bkimminich/juice-shop:v16.0.0',
    internalPort: 3000,
  });

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminChallenges();
      setChallenges(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Dështoi ngarkimi i listës së sfidave.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchChallenges();
    }
  }, [isOpen, fetchChallenges]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const matchesDiff =
        difficultyFilter === 'ALL' ||
        c.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      return matchesDiff && matchesSearch;
    });
  }, [challenges, difficultyFilter, search]);

  const openAdd = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      category: 'Web Security',
      difficulty: 'Medium',
      points: 500,
      dockerImage: 'bkimminich/juice-shop:v16.0.0',
      internalPort: 3000,
    });
    setFormError(null);
    setIsAddOpen(true);
  };

  const openEdit = (c: AdminChallenge) => {
    setEditingChallenge(c);
    setFormData({
      name: c.name,
      slug: c.slug,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      points: c.points,
      dockerImage: c.dockerImage,
      internalPort: c.internalPort,
    });
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      setFormError('Emri dhe përshkrimi janë të detyrueshëm.');
      return;
    }
    setActionLoading(true);
    setFormError(null);
    try {
      await createAdminChallenge(formData);
      setIsAddOpen(false);
      await fetchChallenges();
      onChallengeCountChanged?.();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Dështoi krijimi i sfidës.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChallenge) return;
    setActionLoading(true);
    setFormError(null);
    try {
      await updateAdminChallenge(editingChallenge.id, formData);
      setEditingChallenge(null);
      await fetchChallenges();
      onChallengeCountChanged?.();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || 'Dështoi përditësimi i sfidës.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingChallenge) return;
    setActionLoading(true);
    try {
      await deleteAdminChallenge(deletingChallenge.id);
      setDeletingChallenge(null);
      await fetchChallenges();
      onChallengeCountChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Dështoi fshirja e sfidës.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-dark-bg border border-cyber-yellow/40 rounded-xl shadow-[0_0_50px_rgba(255,180,0,0.15)] w-full max-w-6xl my-8 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-dark-card border-b border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded border border-cyber-yellow/50 text-cyber-yellow bg-cyber-yellow/10">
              CHALLENGES DIRECTORY
            </span>
            <div>
              <h2 className="font-mono text-lg font-bold text-gray-100 flex items-center gap-2">
                ▶ Drejtoriumi i Sfidave CTF
              </h2>
              <p className="font-mono text-xs text-gray-400">
                Menaxho sfidat, imazhet Docker, vështirësitë dhe pikët e platformës
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
              placeholder="Filtro sipas emrit, kategorisë ose përshkrimit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-dark-card border border-dark-border rounded px-3 py-2 font-mono text-xs text-gray-200 placeholder-gray-500 w-full max-w-md focus:outline-none focus:border-cyber-yellow transition-colors"
            />

            <div className="flex items-center border border-dark-border rounded overflow-hidden">
              {(['ALL', 'Easy', 'Medium', 'Hard'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficultyFilter(d)}
                  className={clsx(
                    'font-mono text-xs px-3 py-1.5 uppercase transition-colors',
                    difficultyFilter === d
                      ? 'bg-cyber-yellow/20 text-cyber-yellow font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  {d === 'ALL' ? 'TË GJITHA' : d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => fetchChallenges()}
              className="font-mono text-xs text-gray-400 hover:text-cyber-yellow transition-colors px-3 py-2 rounded border border-dark-border hover:border-cyber-yellow/40 uppercase"
            >
              [ ↻ RIFRESKO ]
            </button>
            <button
              onClick={openAdd}
              className="font-mono text-xs font-bold text-dark-bg bg-cyber-yellow hover:bg-cyber-yellow/90 transition-all px-4 py-2 rounded uppercase shadow-[0_0_15px_rgba(255,180,0,0.3)]"
            >
              + SHTO SFIDË TË RE
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
              <div className="w-8 h-8 border-2 border-cyber-yellow border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs text-cyber-yellow animate-pulse">
                Po ngarkohen sfidat...
              </span>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-dark-border rounded-lg">
              <p className="font-mono text-gray-500 text-sm mb-2">Nuk u gjet asnjë sfidë me këtë filtër.</p>
              <button
                onClick={openAdd}
                className="font-mono text-xs text-cyber-yellow hover:underline uppercase"
              >
                Krijo një sfidë të re tani
              </button>
            </div>
          ) : (
            <div className="border border-dark-border rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-dark-card border-b border-dark-border">
                  <tr>
                    {[
                      'Sfida',
                      'Kategoria',
                      'Vështirësia',
                      'Pikët',
                      'Docker Image',
                      'Porta',
                      'Zgjidhje',
                      'Data e Krijimit',
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
                  {filteredChallenges.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-dark-hover transition-colors font-mono text-xs"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-200">{c.name}</div>
                        <div className="text-gray-500 text-[11px]">slug: {c.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase border border-dark-border text-gray-300 bg-dark-bg">
                          {c.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                            c.difficulty.toLowerCase() === 'easy'
                              ? 'border-cyber-green/50 text-cyber-green bg-cyber-green/10'
                              : c.difficulty.toLowerCase() === 'hard'
                              ? 'border-cyber-red/50 text-cyber-red bg-cyber-red/10'
                              : 'border-cyber-yellow/50 text-cyber-yellow bg-cyber-yellow/10'
                          )}
                        >
                          {c.difficulty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-cyber-yellow text-sm">
                          {c.points}
                        </span>
                        <span className="text-gray-500 text-[10px] ml-1">pts</span>
                      </td>
                      <td className="px-4 py-3 text-cyber-cyan max-w-[200px] truncate" title={c.dockerImage}>
                        {c.dockerImage}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        :{c.internalPort}
                      </td>
                      <td className="px-4 py-3 text-cyber-green">
                        {c.solvedCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-gray-300 tabular-nums">
                        {formatAlbanianDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="px-2 py-1 rounded border border-cyber-yellow/40 text-cyber-yellow hover:bg-cyber-yellow hover:text-dark-bg transition-colors"
                          >
                            [ EDIT ]
                          </button>
                          <button
                            onClick={() => setDeletingChallenge(c)}
                            className="px-2 py-1 rounded border border-cyber-red/40 text-cyber-red hover:bg-cyber-red hover:text-dark-bg transition-colors"
                          >
                            [ FSHIJ ]
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
          <span>Shfaqur: {filteredChallenges.length} nga {challenges.length} sfida gjithsej</span>
          <span>Formati i kohës: Standarti Shqiptar (DD/MM/YYYY)</span>
        </div>
      </div>

      {/* ===================== SHTO SFIDË ===================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-yellow/40 rounded-lg max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-mono text-base font-bold text-cyber-yellow mb-4 flex items-center gap-2">
              ▶ Shto Sfidë të Re CTF
            </h3>
            {formError && (
              <div className="mb-4 p-2.5 border border-cyber-red/40 bg-cyber-red/10 rounded font-mono text-cyber-red text-xs">
                ⚠ {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Emri i Sfidës *
                </label>
                <input
                  type="text"
                  required
                  placeholder="p.sh. OWASP Juice Shop"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Slug (Opsionale - automatike)
                </label>
                <input
                  type="text"
                  placeholder="p.sh. juice-shop"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Përshkrimi *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Përshkruaj qëllimin e sfidës..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Kategoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  >
                    <option value="Web Security">Web Security</option>
                    <option value="Network">Network</option>
                    <option value="Cryptography">Cryptography</option>
                    <option value="Reverse Engineering">Reverse Engineering</option>
                    <option value="Forensics">Forensics</option>
                    <option value="Privilege Escalation">Privilege Escalation</option>
                    <option value="Misc">Misc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Vështirësia
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Insane">Insane</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Pikët *
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={5000}
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value, 10) || 500 })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Porta e Brendshme *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={65535}
                    value={formData.internalPort}
                    onChange={(e) => setFormData({ ...formData, internalPort: parseInt(e.target.value, 10) || 3000 })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Docker Image *
                </label>
                <input
                  type="text"
                  required
                  placeholder="p.sh. bkimminich/juice-shop:v16.0.0"
                  value={formData.dockerImage}
                  onChange={(e) => setFormData({ ...formData, dockerImage: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                />
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
                  className="px-4 py-2 bg-cyber-yellow text-dark-bg font-bold rounded uppercase hover:bg-cyber-yellow/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Duke krijuar...' : 'Krijo Sfidë'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== EDIT SFIDË ===================== */}
      {editingChallenge && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-yellow/40 rounded-lg max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="font-mono text-base font-bold text-cyber-yellow mb-4 flex items-center gap-2">
              ▶ Modifiko Sfidën: {editingChallenge.name}
            </h3>
            {formError && (
              <div className="mb-4 p-2.5 border border-cyber-red/40 bg-cyber-red/10 rounded font-mono text-cyber-red text-xs">
                ⚠ {formError}
              </div>
            )}
            <form onSubmit={handleUpdate} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Emri i Sfidës *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                />
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Përshkrimi *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Kategoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  >
                    <option value="Web Security">Web Security</option>
                    <option value="Network">Network</option>
                    <option value="Cryptography">Cryptography</option>
                    <option value="Reverse Engineering">Reverse Engineering</option>
                    <option value="Forensics">Forensics</option>
                    <option value="Privilege Escalation">Privilege Escalation</option>
                    <option value="Misc">Misc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Vështirësia
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Insane">Insane</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Pikët *
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={5000}
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value, 10) || 500 })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Porta e Brendshme *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={65535}
                    value={formData.internalPort}
                    onChange={(e) => setFormData({ ...formData, internalPort: parseInt(e.target.value, 10) || 3000 })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Docker Image *
                </label>
                <input
                  type="text"
                  required
                  value={formData.dockerImage}
                  onChange={(e) => setFormData({ ...formData, dockerImage: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingChallenge(null)}
                  className="px-3 py-2 border border-dark-border rounded text-gray-400 hover:text-gray-200 uppercase"
                >
                  Anulo
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-cyber-yellow text-dark-bg font-bold rounded uppercase hover:bg-cyber-yellow/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== KONFIRMIMI I FSHIRJES ===================== */}
      {deletingChallenge && (
        <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-red/50 rounded-lg max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-mono text-base font-bold text-cyber-red mb-2 flex items-center gap-2">
              ⚠ Konfirmo Fshirjen e Sfidës
            </h3>
            <p className="font-mono text-xs text-gray-300 mb-4 leading-relaxed">
              A jeni i sigurt që dëshironi të fshini sfidën{' '}
              <span className="text-white font-bold">"{deletingChallenge.name}"</span>?
              <br />
              <br />
              <span className="text-cyber-red font-semibold">Kujdes:</span> Të gjitha instancat
              aktive dhe të gjitha zgjidhjet/pikët e regjistruara për këtë sfidë do të fshihen.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingChallenge(null)}
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
                {actionLoading ? 'Duke fshirë...' : 'Fshij Sfidën'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
