import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Database, FileText, Filter, Home, Plus, Search, Settings, ShieldCheck, Trash2, Upload, UserCircle2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const CATEGORIES = ['Mamalia', 'Reptil', 'Aves', 'Pisces', 'Amfibi', 'Lainnya'];
const GENDERS = ['Jantan', 'Betina', 'Tidak Diketahui'];

const defaultForm = {
  name: '',
  scientific_name: '',
  category: 'Mamalia',
  habitat: '',
  diet: '',
  gender: 'Jantan',
  age_years: '',
  weight_kg: '',
  origin: '',
  conservation_status: '',
  description: '',
  image_key: ''
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID');
}

async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function StatCard({ title, value, icon: Icon, accent = 'yellow' }) {
  return (
    <div className="rounded-2xl border border-[#333333] bg-[#171717] p-4 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#A3A3A3]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#F5F5F5]">{value}</p>
        </div>
        <div className={`rounded-xl p-2 ${accent === 'yellow' ? 'bg-[#FFD400]/15 text-[#FFD400]' : 'bg-[#0B0B0B] text-[#F5F5F5]'}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [animals, setAnimals] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [habitatFilter, setHabitatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ totalPages: 1, total: 0, page: 1 });
  const [form, setForm] = useState(defaultForm);
  const [selectedImage, setSelectedImage] = useState(null);
  const imageInputRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const habitats = useMemo(() => {
    const values = new Set();
    animals.forEach((item) => {
      if (item.habitat) values.add(item.habitat);
    });
    return [...values];
  }, [animals]);

  const conservationStatuses = useMemo(() => {
    const values = new Set();
    animals.forEach((item) => {
      if (item.conservation_status) values.add(item.conservation_status);
    });
    return [...values];
  }, [animals]);

  const loadDashboard = async () => {
    try {
      const data = await apiFetch('/dashboard/stats');
      setDashboard(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnimals = async () => {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: '8',
        search,
        category: categoryFilter,
        habitat: habitatFilter,
        conservation_status: statusFilter,
        sortBy: 'name',
        sortOrder: 'asc'
      });

      const data = await apiFetch(`/animals?${query.toString()}`);
      setAnimals(data.data || []);
      setPageInfo({ ...(data.pagination || { totalPages: 1, total: 0, page }), page: Number(page), totalPages: Number(data.pagination?.totalPages || 1), total: Number(data.pagination?.total || 0) });
    } catch (err) {
      setError(err.message || 'Gagal memuat data binatang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadAnimals();
  }, [page, search, categoryFilter, habitatFilter, statusFilter]);

  const resetForm = () => {
    setForm(defaultForm);
    setSelectedImage(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        ...form,
        age_years: form.age_years === '' ? null : Number(form.age_years),
        weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg)
      };

      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          body.append(key, value);
        }
      });
      if (selectedImage) {
        body.append('image', selectedImage);
      }

      const endpoint = editingId ? `/animals/${editingId}` : '/animals';
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        body
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Operasi gagal');
      }

      resetForm();
      loadAnimals();
      loadDashboard();
    } catch (err) {
      setError(err.message || 'Operasi gagal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (animal) => {
    setSelectedImage(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
    setEditingId(animal.id);
    setForm({
      name: animal.name || '',
      scientific_name: animal.scientific_name || '',
      category: animal.category || 'Mamalia',
      habitat: animal.habitat || '',
      diet: animal.diet || '',
      gender: animal.gender || 'Jantan',
      age_years: animal.age_years ?? '',
      weight_kg: animal.weight_kg ?? '',
      origin: animal.origin || '',
      conservation_status: animal.conservation_status || '',
      description: animal.description || '',
      image_key: animal.image_key || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/animals/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Penghapusan gagal');
      }
      loadAnimals();
      loadDashboard();
    } catch (err) {
      setError(err.message || 'Penghapusan gagal');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F5]">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-[#333333] bg-[#111111] p-6">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-xl bg-[#FFD400] p-2 text-[#0B0B0B]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#A3A3A3]">Wildlife</p>
              <h1 className="text-xl font-bold">AnimalCare</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              ['Dashboard', Home],
              ['Data Binatang', Database],
              ['Tambah Binatang', Plus],
              ['Kategori', FileText],
              ['Pengaturan', Settings]
            ].map(([label, Icon]) => (
              <button key={label} className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-[#171717] p-3 text-left text-[#F5F5F5] transition hover:border-[#FFD400] hover:text-[#FFD400]">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-[#333333] bg-[#171717] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-[#A3A3A3]">Overview</p>
              <h2 className="text-2xl font-bold text-[#F5F5F5]">Dashboard</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 text-[#A3A3A3]">
                <Search className="h-4 w-4" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari binatang" className="w-52 bg-transparent text-sm outline-none placeholder:text-[#A3A3A3]" />
              </div>
              <button className="flex items-center gap-2 rounded-xl bg-[#FFD400] px-4 py-2 font-semibold text-[#0B0B0B] transition hover:bg-[#E6BE00]">
                <UserCircle2 className="h-4 w-4" />
                Admin
              </button>
            </div>
          </header>

          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Binatang" value={dashboard?.totalAnimals ?? 0} icon={Database} />
            <StatCard title="Kategori" value={dashboard?.totalCategories ?? 0} icon={FileText} />
            <StatCard title="Habitat" value={dashboard?.habitatBreakdown?.length ?? 0} icon={Filter} />
            <StatCard title="Konservasi" value={dashboard?.conservationBreakdown?.length ?? 0} icon={ShieldCheck} />
          </section>

          <section className="mb-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-[#333333] bg-[#171717] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Distribusi Kategori</h3>
              </div>
              <div className="space-y-4">
                {(dashboard?.categoryBreakdown || []).map((item) => (
                  <div key={item.category}>
                    <div className="mb-1 flex justify-between text-sm text-[#A3A3A3]">
                      <span>{item.category}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#0B0B0B]">
                      <div className="h-full rounded-full bg-[#FFD400]" style={{ width: `${(Number(item.count) / Math.max(1, Number(dashboard?.totalAnimals) || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#333333] bg-[#171717] p-5">
              <h3 className="mb-4 text-xl font-semibold">Terakhir Diubah</h3>
              <div className="space-y-3">
                {(dashboard?.recentlyUpdated || []).map((animal) => (
                  <div key={animal.id} className="rounded-xl border border-[#333333] bg-[#0B0B0B] p-3">
                    <p className="font-medium text-[#F5F5F5]">{animal.name}</p>
                    <p className="text-xs text-[#A3A3A3]">{formatDate(animal.updated_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[#333333] bg-[#171717] p-5">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Data Binatang</h3>
                <button onClick={resetForm} className="flex items-center gap-2 rounded-xl bg-[#FFD400] px-3 py-2 text-sm font-semibold text-[#0B0B0B] hover:bg-[#E6BE00]">
                  <Plus className="h-4 w-4" /> Tambah
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-3">
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 text-sm text-[#F5F5F5]">
                  <option value="">Semua Kategori</option>
                  {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>

                <select value={habitatFilter} onChange={(e) => setHabitatFilter(e.target.value)} className="rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 text-sm text-[#F5F5F5]">
                  <option value="">Semua Habitat</option>
                  {habitats.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 text-sm text-[#F5F5F5]">
                  <option value="">Semua Status</option>
                  {conservationStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead>
                    <tr className="text-[#A3A3A3]">
                      <th className="px-3 py-2">Binatang</th>
                      <th className="px-3 py-2">Kategori</th>
                      <th className="px-3 py-2">Habitat</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" className="px-3 py-5 text-center text-[#A3A3A3]">Memuat data...</td></tr>
                    ) : animals.length === 0 ? (
                      <tr><td colSpan="5" className="px-3 py-5 text-center text-[#A3A3A3]">Belum ada data binatang.</td></tr>
                    ) : (
                      animals.map((animal) => (
                        <tr key={animal.id} className="rounded-xl bg-[#1F1F1F] text-[#F5F5F5]">
                          <td className="rounded-l-xl px-3 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-lg border border-[#333333] bg-[#0B0B0B]">
                                <img src={animal.image_key || 'https://placehold.co/120x120/171717/FFD400?text=Animal'} alt={animal.name} className="h-full w-full object-cover" />
                              </div>
                              <div>
                                <p className="font-medium">{animal.name}</p>
                                <p className="text-xs text-[#A3A3A3]">{animal.scientific_name || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">{animal.category}</td>
                          <td className="px-3 py-3">{animal.habitat || '-'}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-full border border-[#FFD400]/30 bg-[#FFD400]/10 px-2 py-1 text-xs text-[#FFD400]">{animal.conservation_status || 'Belum ada'}</span>
                          </td>
                          <td className="rounded-r-xl px-3 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => handleEdit(animal)} className="rounded-lg border border-[#333333] bg-[#0B0B0B] px-2 py-1 text-xs text-[#F5F5F5] hover:border-[#FFD400]">Edit</button>
                              <button onClick={() => handleDelete(animal.id)} className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between text-sm text-[#A3A3A3]">
                <span>Halaman {pageInfo.page || page} dari {pageInfo.totalPages || 1}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-lg border border-[#333333] px-3 py-1 disabled:opacity-30">Sebelumnya</button>
                  <button disabled={page >= (pageInfo.totalPages || 1)} onClick={() => setPage((prev) => prev + 1)} className="rounded-lg border border-[#333333] px-3 py-1 disabled:opacity-30">Berikutnya</button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-2xl border border-[#333333] bg-[#171717] p-5">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-semibold">{editingId ? 'Edit Binatang' : 'Tambah Binatang'}</h3>
                <button type="button" onClick={resetForm} className="text-sm text-[#A3A3A3] hover:text-[#FFD400]">Reset</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-[#A3A3A3]">Nama</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]" required />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[#A3A3A3]">Nama Ilmiah</label>
                  <input value={form.scientific_name} onChange={(e) => setForm({ ...form, scientific_name: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-[#A3A3A3]">Kategori</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]">
                      {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[#A3A3A3]">Jenis Kelamin</label>
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]">
                      {GENDERS.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-[#A3A3A3]">Habitat</label>
                    <input value={form.habitat} onChange={(e) => setForm({ ...form, habitat: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[#A3A3A3]">Jenis Makanan</label>
                    <input value={form.diet} onChange={(e) => setForm({ ...form, diet: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-[#A3A3A3]">Umur (tahun)</label>
                    <input type="number" min="0" step="0.1" value={form.age_years} onChange={(e) => setForm({ ...form, age_years: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[#A3A3A3]">Berat (kg)</label>
                    <input type="number" min="0" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-[#A3A3A3]">Asal</label>
                    <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[#A3A3A3]">Status Konservasi</label>
                    <input value={form.conservation_status} onChange={(e) => setForm({ ...form, conservation_status: e.target.value })} className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-[#A3A3A3]">Deskripsi</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="4" className="w-full rounded-xl border border-[#333333] bg-[#0B0B0B] px-3 py-2 outline-none focus:border-[#FFD400]" />
                </div>

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#FFD400] bg-[#FFD400]/5 px-3 py-4 text-sm text-[#FFD400]">
                  <Upload className="h-4 w-4" />
                  {selectedImage?.name || (form.image_key ? 'Gambar tersimpan - pilih untuk mengganti' : 'Unggah Gambar')}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                  />
                </label>

                {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

                <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#FFD400] px-4 py-3 font-semibold text-[#0B0B0B] transition hover:bg-[#E6BE00] disabled:opacity-60">
                  {isSubmitting ? 'Menyimpan...' : editingId ? 'Update Binatang' : 'Simpan Binatang'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
