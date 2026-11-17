'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AdminChallenge, ChallengeRuntime, ConnectionType } from '@/types';
import {
  getAdminChallenges,
  createAdminChallenge,
  updateAdminChallenge,
  deleteAdminChallenge,
  getProxmoxNodes,
  getProxmoxTemplates,
  getProxmoxStorages,
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
  const [liveNodes, setLiveNodes] = useState<{ id: string; name: string }[]>([
    { id: 'pms1', name: 'pms1 (online)' },
    { id: 'pms2', name: 'pms2 (online)' },
    { id: 'pms3', name: 'pms3 (online)' },
  ]);
  const [liveTemplates, setLiveTemplates] = useState<any[]>([]);
  const [liveStorages, setLiveStorages] = useState<string[]>(['TrueNas', 'local-lvm', 'local']);
  const [templateSearch, setTemplateSearch] = useState<string>('');

  // Sinkronizimi i dyanshëm midis formës kryesore dhe listës së shablloneve të Proxmox
  const filteredLiveTemplates = useMemo(() => {
    return liveTemplates.filter((t) => {
      // Nëse në formë është zgjedhur nyje specifike, shfaq vetëm ato të asaj nyjeje
      const matchNode =
        !formData.proxmoxNode ||
        formData.proxmoxNode === 'ALL' ||
        t.node === formData.proxmoxNode;

      // Nëse është zgjedhur PROXMOX_CT ose PROXMOX_VM, filtro automatikisht
      const matchType =
        formData.runtimeType === 'DOCKER' ||
        !formData.runtimeType ||
        t.type === formData.runtimeType;

      const matchSearch =
        !templateSearch ||
        String(t.vmid).includes(templateSearch) ||
        (t.name && t.name.toLowerCase().includes(templateSearch.toLowerCase()));

      return matchNode && matchType && matchSearch;
    });
  }, [liveTemplates, formData.proxmoxNode, formData.runtimeType, templateSearch]);

  // Form data supporting Proxmox Hardware specifications & Docker
  const defaultFormData = {
    name: '',
    slug: '',
    description: '',
    category: 'Web Security',
    difficulty: 'Medium',
    points: 500,
    runtimeType: 'PROXMOX_CT' as ChallengeRuntime,
    proxmoxNode: 'pms1',
    templateId: 101,
    cpuCores: 1,
    ramMB: 1024,
    diskGB: 8,
    storagePool: 'TrueNas',
    connectionType: 'HTTP' as ConnectionType,
    dockerImage: 'bkimminich/juice-shop:v16.0.0',
    internalPort: 3000,
  };

  const [formData, setFormData] = useState(defaultFormData);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [challengesData, nodesData, templatesData, storagesData] = await Promise.all([
        getAdminChallenges(),
        getProxmoxNodes().catch(() => []),
        getProxmoxTemplates().catch(() => []),
        getProxmoxStorages().catch(() => []),
      ]);
      setChallenges(challengesData);
      if (nodesData && nodesData.length > 0) {
        setLiveNodes(nodesData);
      }
      if (templatesData && templatesData.length > 0) {
        setLiveTemplates(templatesData);
      }
      if (storagesData && storagesData.length > 0) {
        setLiveStorages(storagesData.map((s: any) => s.storage));
      }
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
        (c.proxmoxNode && c.proxmoxNode.toLowerCase().includes(q)) ||
        c.description.toLowerCase().includes(q);
      return matchesDiff && matchesSearch;
    });
  }, [challenges, difficultyFilter, search]);

  const openAdd = () => {
    setFormData(defaultFormData);
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
      runtimeType: (c.runtimeType as ChallengeRuntime) || 'PROXMOX_CT',
      proxmoxNode: c.proxmoxNode || 'pms1',
      templateId: c.templateId || 101,
      cpuCores: c.cpuCores || 1,
      ramMB: c.ramMB || 1024,
      diskGB: c.diskGB || 8,
      storagePool: c.storagePool || 'local-lvm',
      connectionType: (c.connectionType as ConnectionType) || 'HTTP',
      dockerImage: c.dockerImage || 'bkimminich/juice-shop:v16.0.0',
      internalPort: c.internalPort || 3000,
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
      setFormError(err?.response?.data?.details || err?.response?.data?.error || 'Dështoi krijimi i sfidës.');
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
      setFormError(err?.response?.data?.details || err?.response?.data?.error || 'Dështoi përditësimi i sfidës.');
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
      setError(err?.response?.data?.details || err?.response?.data?.error || 'Dështoi fshirja e sfidës.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-dark-bg border border-cyber-yellow/40 rounded-xl shadow-[0_0_50px_rgba(255,180,0,0.15)] w-full max-w-7xl my-8 flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-dark-card border-b border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded border border-cyber-yellow/50 text-cyber-yellow bg-cyber-yellow/10">
              PROXMOX & CTF ORCHESTRATION
            </span>
            <div>
              <h2 className="font-mono text-lg font-bold text-gray-100 flex items-center gap-2">
                ▶ Drejtoriumi i Sfidave & Hardware Specs (Proxmox VE)
              </h2>
              <p className="font-mono text-xs text-gray-400">
                Përcakto nga merret në Proxmox (pms1/pms2/pms3), specifikimet hardware (CPU/RAM/Disk), dhe orkestrimin në ChallengeHoste
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
              placeholder="Filtro sipas emrit, nyjes Proxmox, shabllonit ose kategorisë..."
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
                Po ngarkohen sfidat dhe konfigurimet Proxmox...
              </span>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-dark-border rounded-lg">
              <p className="font-mono text-gray-500 text-sm mb-2">Nuk u gjet asnjë sfidë me këtë filtër.</p>
              <button
                onClick={openAdd}
                className="font-mono text-xs text-cyber-yellow hover:underline uppercase"
              >
                Krijo një sfidë të re Proxmox tani
              </button>
            </div>
          ) : (
            <div className="border border-dark-border rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-dark-card border-b border-dark-border">
                  <tr>
                    {[
                      'Sfida',
                      'Lloji & Nyja Proxmox',
                      'Specifikimet Hardware',
                      'Shablloni Burimor',
                      'Kategoria',
                      'Pikët',
                      'Lidhja',
                      'Zgjidhje',
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
                      {/* Emri & Slug */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-200">{c.name}</div>
                        <div className="text-gray-500 text-[11px]">slug: {c.slug}</div>
                      </td>

                      {/* Lloji & Nyja Proxmox */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-[10px] font-bold uppercase border',
                              c.runtimeType === 'PROXMOX_VM'
                                ? 'border-purple-400/50 text-purple-300 bg-purple-950/20'
                                : c.runtimeType === 'DOCKER'
                                ? 'border-blue-400/50 text-blue-300 bg-blue-950/20'
                                : 'border-cyber-cyan/50 text-cyber-cyan bg-cyber-cyan/10'
                            )}
                          >
                            {c.runtimeType === 'PROXMOX_VM' ? 'VM' : c.runtimeType === 'DOCKER' ? 'Docker' : 'LXC (CT)'}
                          </span>
                          <span className="text-gray-400 text-[11px] font-semibold">
                            @{c.proxmoxNode || 'pms1'}
                          </span>
                        </div>
                      </td>

                      {/* Specifikimet Hardware */}
                      <td className="px-4 py-3">
                        <div className="text-gray-200 font-semibold">
                          {c.cpuCores || 1} vCPU · {c.ramMB || 1024} MB
                        </div>
                        <div className="text-gray-500 text-[11px]">
                          Disk: {c.diskGB || 8} GB ({c.storagePool || 'local-lvm'})
                        </div>
                      </td>

                      {/* Shablloni Burimor */}
                      <td className="px-4 py-3 text-cyber-yellow">
                        {c.runtimeType === 'DOCKER' ? (
                          <span className="text-gray-400 text-[11px] truncate max-w-[120px] block" title={c.dockerImage}>
                            {c.dockerImage}
                          </span>
                        ) : (
                          <span>ID: {c.templateId || 101}</span>
                        )}
                      </td>

                      {/* Kategoria & Veshtiresia */}
                      <td className="px-4 py-3">
                        <div className="text-gray-300">{c.category}</div>
                        <span
                          className={clsx(
                            'text-[10px] font-bold uppercase',
                            c.difficulty.toLowerCase() === 'easy'
                              ? 'text-cyber-green'
                              : c.difficulty.toLowerCase() === 'hard'
                              ? 'text-cyber-red'
                              : 'text-cyber-yellow'
                          )}
                        >
                          {c.difficulty}
                        </span>
                      </td>

                      {/* Pikët */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-cyber-yellow text-sm">
                          {c.points}
                        </span>
                        <span className="text-gray-500 text-[10px] ml-1">pts</span>
                      </td>

                      {/* Lidhja */}
                      <td className="px-4 py-3 text-gray-300">
                        <span className="px-1.5 py-0.5 rounded border border-dark-border text-[10px] uppercase bg-dark-bg mr-1 text-gray-400">
                          {c.connectionType || 'HTTP'}
                        </span>
                        <span className="text-gray-500">:{c.internalPort}</span>
                      </td>

                      {/* Zgjidhje */}
                      <td className="px-4 py-3 text-cyber-green font-bold">
                        {c.solvedCount ?? 0}
                      </td>

                      {/* Veprime */}
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
          <span>Orkestrimi: ChallengeHoste (192.168.200.15) ➜ Proxmox Datacenter (CHF1)</span>
        </div>
      </div>

      {/* ===================== SHTO SFIDË (ADD MODAL) ===================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-yellow/40 rounded-lg max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            <h3 className="font-mono text-base font-bold text-cyber-yellow mb-3 flex items-center gap-2">
              ▶ Shto Sfidë të Re & Specifiko Hardware në Proxmox
            </h3>
            {formError && (
              <div className="mb-4 p-2.5 border border-cyber-red/40 bg-cyber-red/10 rounded font-mono text-cyber-red text-xs">
                ⚠ {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
              {/* Informacioni Baze */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Emri i Sfidës *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="p.sh. OWASP Juice Shop Lab"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Slug (Opsionale)
                  </label>
                  <input
                    type="text"
                    placeholder="p.sh. juice-shop-lab"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase tracking-widest mb-1">
                  Përshkrimi i Sfidës *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Përshkruaj laboratorin, objektivat dhe flamurin..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                />
              </div>

              {/* SEKSIONI 1: PROXMOX PROVISIONING & AMBIENTI */}
              <div className="border border-cyber-cyan/30 rounded p-3 bg-cyber-cyan/5 space-y-3">
                <span className="font-bold text-cyber-cyan text-xs uppercase tracking-wider block">
                  ⚙️ Nga do të merret në Proxmox & Lloji i Ambientit
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      Lloji i Ambientit *
                    </label>
                    <select
                      value={formData.runtimeType}
                      onChange={(e) => setFormData({ ...formData, runtimeType: e.target.value as ChallengeRuntime })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-cyber-cyan font-bold focus:outline-none focus:border-cyber-cyan"
                    >
                      <option value="PROXMOX_CT">Proxmox LXC Container (CT)</option>
                      <option value="PROXMOX_VM">Proxmox QEMU Machine (VM)</option>
                      <option value="DOCKER">Docker Container</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      Nyja Proxmox (Target Node) *
                    </label>
                    <select
                      value={formData.proxmoxNode}
                      onChange={(e) => setFormData({ ...formData, proxmoxNode: e.target.value })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    >
                      {liveNodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SELEKTIMI DHE FILTRIMI I TEMPLATE-VE NGA PROXMOX */}
                  <div className="col-span-3 bg-black/40 border border-cyber-yellow/30 rounded p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-cyber-yellow text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span>⚡ Shablloni Burimor nga Proxmox (Live Templates & Machines)</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          ({filteredLiveTemplates.length} gjetur)
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={fetchChallenges}
                        className="text-[10px] text-cyber-cyan hover:underline font-mono"
                      >
                        [ Rifresko nga Proxmox ↻ ]
                      </button>
                    </div>

                    {/* Filtra të shpejtë për Shabllonet */}
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Filtro sipas ID ose emrit (p.sh. 101, juice)..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyber-yellow"
                      />
                      <select
                        value={templateFilterNode}
                        onChange={(e) => setTemplateFilterNode(e.target.value)}
                        className="bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyber-yellow"
                      >
                        <option value="ALL">Të gjitha Nyjet (All Nodes)</option>
                        {liveNodes.map((n) => (
                          <option key={n.id} value={n.id}>Nyja {n.id}</option>
                        ))}
                      </select>
                      <select
                        value={templateFilterType}
                        onChange={(e) => setTemplateFilterType(e.target.value)}
                        className="bg-dark-bg border border-dark-border rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyber-yellow"
                      >
                        <option value="ALL">Të gjitha Llojet (LXC & VM)</option>
                        <option value="PROXMOX_CT">Vetëm LXC Containers</option>
                        <option value="PROXMOX_VM">Vetëm QEMU VMs</option>
                      </select>
                    </div>

                    {/* Zgjedhja e Shabllonit */}
                    {filteredLiveTemplates.length > 0 ? (
                      <select
                        value={formData.templateId}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          const selectedTpl = liveTemplates.find((t) => t.vmid === val);
                          if (selectedTpl) {
                            setFormData({
                              ...formData,
                              templateId: val,
                              runtimeType: selectedTpl.type,
                              proxmoxNode: selectedTpl.node || formData.proxmoxNode,
                              cpuCores: selectedTpl.maxcpu || formData.cpuCores,
                              ramMB: selectedTpl.maxmemMB || formData.ramMB,
                              diskGB: selectedTpl.maxdiskGB || formData.diskGB,
                            });
                          } else {
                            setFormData({ ...formData, templateId: val });
                          }
                        }}
                        className="w-full bg-dark-bg border border-cyber-yellow/60 rounded px-3 py-2 text-cyber-yellow font-bold text-sm focus:outline-none focus:border-cyber-yellow shadow-inner"
                      >
                        {filteredLiveTemplates.map((tpl) => (
                          <option key={tpl.vmid} value={tpl.vmid}>
                            [ID: {tpl.vmid}] {tpl.name} | {tpl.type === 'PROXMOX_CT' ? 'LXC' : 'VM'} | Nyja: {tpl.node} | {tpl.maxcpu} Core / {tpl.maxmemMB}MB RAM / {tpl.maxdiskGB}GB Disk
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          required
                          min={100}
                          max={9999}
                          value={formData.templateId}
                          onChange={(e) => setFormData({ ...formData, templateId: parseInt(e.target.value, 10) || 101 })}
                          placeholder="Shkruaj VMID me dorë (p.sh. 101)"
                          className="flex-1 bg-dark-bg border border-dark-border rounded px-3 py-2 text-cyber-yellow font-bold focus:outline-none focus:border-cyber-yellow text-sm"
                        />
                        <span className="text-[11px] text-gray-500 font-mono">
                          (Nuk ka shabllon që përputhet me filtrin)
                        </span>
                      </div>
                    )}

                    <div className="text-[11px] text-gray-400 flex items-center justify-between px-1">
                      <span>✓ Kur zgjidhni një shabllon, CPU, RAM, Disk dhe Nyja sinkronizohen automatikisht.</span>
                      <span className="text-cyber-green font-mono">Live Proxmox Sync</span>
                    </div>
                  </div>
                </div>

                {/* SPECIFIKIMET HARDWARE */}
                <div className="grid grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      CPU Cores
                    </label>
                    <select
                      value={formData.cpuCores}
                      onChange={(e) => setFormData({ ...formData, cpuCores: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-2.5 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    >
                      <option value={1}>1 Core</option>
                      <option value={2}>2 Cores</option>
                      <option value={4}>4 Cores</option>
                      <option value={8}>8 Cores</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      RAM (MB)
                    </label>
                    <select
                      value={formData.ramMB}
                      onChange={(e) => setFormData({ ...formData, ramMB: parseInt(e.target.value, 10) || 1024 })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-2.5 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    >
                      <option value={512}>512 MB</option>
                      <option value={1024}>1024 MB (1GB)</option>
                      <option value={2048}>2048 MB (2GB)</option>
                      <option value={4096}>4096 MB (4GB)</option>
                      <option value={8192}>8192 MB (8GB)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      Disk (GB)
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={200}
                      value={formData.diskGB}
                      onChange={(e) => setFormData({ ...formData, diskGB: parseInt(e.target.value, 10) || 8 })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-2.5 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      Storage Pool
                    </label>
                    <select
                      value={formData.storagePool}
                      onChange={(e) => setFormData({ ...formData, storagePool: e.target.value })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-2.5 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    >
                      <option value="TrueNas">TrueNas (Default)</option>
                      <option value="local-lvm">local-lvm</option>
                      <option value="local">local</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SEKSIONI 2: LIDHJA DHE PARAMETRAT CTF */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Lloji i Lidhjes
                  </label>
                  <select
                    value={formData.connectionType}
                    onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as ConnectionType })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  >
                    <option value="HTTP">HTTP (Web)</option>
                    <option value="SSH">SSH (Terminal)</option>
                    <option value="TCP">TCP Port</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Porta e Shërbimit *
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
                    <option value="Privilege Escalation">Privilege Escalation</option>
                    <option value="Reverse Engineering">Reverse Engineering</option>
                    <option value="Forensics">Forensics</option>
                    <option value="Cryptography">Cryptography</option>
                    <option value="Misc">Misc</option>
                  </select>
                </div>

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
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-cyber-yellow font-bold focus:outline-none focus:border-cyber-yellow"
                  />
                </div>
              </div>

              {formData.runtimeType === 'DOCKER' && (
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
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-border">
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
                  className="px-5 py-2 bg-cyber-yellow text-dark-bg font-bold rounded uppercase hover:bg-cyber-yellow/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Duke regjistruar...' : 'Krijo Sfidë në Proxmox'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== EDIT SFIDË (EDIT MODAL) ===================== */}
      {editingChallenge && (
        <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-cyber-yellow/40 rounded-lg max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
            <h3 className="font-mono text-base font-bold text-cyber-yellow mb-3 flex items-center gap-2">
              ▶ Modifiko Sfidën & Parametrat Proxmox: {editingChallenge.name}
            </h3>
            {formError && (
              <div className="mb-4 p-2.5 border border-cyber-red/40 bg-cyber-red/10 rounded font-mono text-cyber-red text-xs">
                ⚠ {formError}
              </div>
            )}
            <form onSubmit={handleUpdate} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
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

              {/* SEKSIONI HARDWARE PROXMOX */}
              <div className="border border-cyber-cyan/30 rounded p-3 bg-cyber-cyan/5 space-y-3">
                <span className="font-bold text-cyber-cyan text-xs uppercase tracking-wider block">
                  ⚙️ Konfigurimi Proxmox & Hardware Specs
                </span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      Lloji i Ambientit *
                    </label>
                    <select
                      value={formData.runtimeType}
                      onChange={(e) => setFormData({ ...formData, runtimeType: e.target.value as ChallengeRuntime })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-cyber-cyan font-bold focus:outline-none focus:border-cyber-cyan"
                    >
                      <option value="PROXMOX_CT">Proxmox LXC Container (CT)</option>
                      <option value="PROXMOX_VM">Proxmox QEMU Machine (VM)</option>
                      <option value="DOCKER">Docker Container</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      Nyja Proxmox *
                    </label>
                    <select
                      value={formData.proxmoxNode}
                      onChange={(e) => setFormData({ ...formData, proxmoxNode: e.target.value })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    >
                      {liveNodes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      Template ID *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      max={9999}
                      value={formData.templateId}
                      onChange={(e) => setFormData({ ...formData, templateId: parseInt(e.target.value, 10) || 101 })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-cyber-yellow font-bold focus:outline-none focus:border-cyber-yellow"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      CPU Cores
                    </label>
                    <select
                      value={formData.cpuCores}
                      onChange={(e) => setFormData({ ...formData, cpuCores: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-2.5 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    >
                      <option value={1}>1 Core</option>
                      <option value={2}>2 Cores</option>
                      <option value={4}>4 Cores</option>
                      <option value={8}>8 Cores</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      RAM (MB)
                    </label>
                    <select
                      value={formData.ramMB}
                      onChange={(e) => setFormData({ ...formData, ramMB: parseInt(e.target.value, 10) || 1024 })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-2.5 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    >
                      <option value={512}>512 MB</option>
                      <option value={1024}>1024 MB (1GB)</option>
                      <option value={2048}>2048 MB (2GB)</option>
                      <option value={4096}>4096 MB (4GB)</option>
                      <option value={8192}>8192 MB (8GB)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      Disk (GB)
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={200}
                      value={formData.diskGB}
                      onChange={(e) => setFormData({ ...formData, diskGB: parseInt(e.target.value, 10) || 8 })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-2.5 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 uppercase tracking-widest mb-1">
                      Storage Pool
                    </label>
                    <select
                      value={formData.storagePool}
                      onChange={(e) => setFormData({ ...formData, storagePool: e.target.value })}
                      className="w-full bg-dark-bg border border-dark-border rounded px-2.5 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                    >
                      <option value="TrueNas">TrueNas (Default)</option>
                      <option value="local-lvm">local-lvm</option>
                      <option value="local">local</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Lidhja
                  </label>
                  <select
                    value={formData.connectionType}
                    onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as ConnectionType })}
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-gray-200 focus:outline-none focus:border-cyber-yellow"
                  >
                    <option value="HTTP">HTTP (Web)</option>
                    <option value="SSH">SSH (Terminal)</option>
                    <option value="TCP">TCP Port</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase tracking-widest mb-1">
                    Porta *
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
                    className="w-full bg-dark-bg border border-dark-border rounded px-3 py-2 text-cyber-yellow font-bold focus:outline-none focus:border-cyber-yellow"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-border">
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
                  className="px-5 py-2 bg-cyber-yellow text-dark-bg font-bold rounded uppercase hover:bg-cyber-yellow/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION ===================== */}
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
              <span className="text-cyber-red font-semibold">Kujdes:</span> ChallengeHoste do të fshijë
              gjithashtu çdo instancë të hapur të kësaj sfide nga Proxmox VE dhe nga baza e të dhënave.
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
