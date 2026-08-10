"use client";

import { CalendarClock, CircleAlert, Clock3, LoaderCircle, Plus, RotateCw, Trash2, WalletCards, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { idr } from "@/lib/formatters";
import { MobileNav } from "@/components/mobile-nav";
import { ToastContainer, useToast } from "@/components/toast";
import { PaginationBar } from "@/components/pagination";

type Wallet = { id: string; name: string; type: string };
type Expense = { id: string; name: string; amount: number; wallet_id: string | null; wallet_name: string | null; category: string; due_date: string; recurrence: string; status: string };
const categories = ["tagihan", "kos", "makanan", "transport", "family", "kesehatan", "hiburan", "lainnya"];
const blankForm = { name: "", amount: "", walletId: "", category: "tagihan", dueDate: new Date().toISOString().slice(0, 10), recurrence: "once", note: "" };
const PAGE_SIZE = 20;

export function UpcomingWorkspace() {
  const { toasts, addToast, removeToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(1); const [total, setTotal] = useState(0);
  const amountRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true); setError("");
    try {
      const [expenseResponse, walletResponse] = await Promise.all([fetch(`/api/upcoming-expenses?page=${page}&pageSize=${PAGE_SIZE}`), fetch("/api/wallets")]);
      if (!expenseResponse.ok || !walletResponse.ok) throw new Error();
      const expenseData = await expenseResponse.json(); const walletData = await walletResponse.json();
      setExpenses(expenseData.expenses); setWallets(walletData.wallets); setTotalPages(expenseData.pagination.totalPages); setTotal(expenseData.pagination.total);
      setForm((current) => ({ ...current, walletId: current.walletId || walletData.wallets[0]?.id || "" }));
    } catch { setError("Data pengeluaran belum dapat dimuat. Coba lagi."); } finally { setLoading(false); }
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [page]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    if (!Number.isInteger(Number(form.amount)) || Number(form.amount) <= 0) { setMessage("Nominal harus berupa angka bulat lebih dari nol."); addToast("Nominal harus valid", "error"); setSaving(false); amountRef.current?.focus(); return; }
    try {
      const response = await fetch("/api/upcoming-expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setForm((current) => ({ ...blankForm, walletId: current.walletId })); setMessage("Pengeluaran berhasil dijadwalkan."); addToast("Pengeluaran berhasil dijadwalkan", "success"); await load();
    } catch (submitError) { const errorMsg = submitError instanceof Error ? submitError.message : "Pengeluaran tidak dapat disimpan."; setMessage(errorMsg); addToast(errorMsg, "error"); } finally { setSaving(false); }
  }

  async function pay(expense: Expense) {
    setPendingId(expense.id); setMessage("");
    try { const response = await fetch(`/api/upcoming-expenses/${expense.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletId: expense.wallet_id }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage(`"${expense.name}" dicatat sebagai transaksi.`); await load(); } catch (payError) { setMessage(payError instanceof Error ? payError.message : "Pengeluaran tidak dapat dibayar."); } finally { setPendingId(""); }
  }

  async function remove(expense: Expense) {
    if (!window.confirm(`Hapus jadwal "${expense.name}"?`)) return;
    setPendingId(expense.id); setMessage("");
    try { const response = await fetch(`/api/upcoming-expenses/${expense.id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setMessage("Jadwal pengeluaran dihapus."); addToast("Jadwal pengeluaran dihapus", "success"); await load(); } catch (removeError) { const errorMsg = removeError instanceof Error ? removeError.message : "Jadwal tidak dapat dihapus."; setMessage(errorMsg); addToast(errorMsg, "error"); } finally { setPendingId(""); }
  }

  return <><ToastContainer toasts={toasts} onClose={removeToast} /><a className="skip-link" href="#upcoming-list">Lewati ke daftar pengeluaran</a><header className="mobile-page-bar"><MobileNav /></header><div className="content transaction-page">
    <div className="page-heading"><div><p className="eyebrow">PERENCANAAN KEUANGAN</p><h1>Pengeluaran mendatang</h1><p className="muted">Siapkan tagihan sebelum jatuh tempo dan jaga saldo tetap aman.</p></div></div>
    <div className="transaction-layout upcoming-layout">
      <section className="card form-card" aria-labelledby="upcoming-form-title"><div className="form-title-icon"><CalendarClock size={20} /></div><h2 id="upcoming-form-title">Jadwalkan pengeluaran</h2><p className="muted form-intro">Pengeluaran baru mengurangi saldo setelah kamu menekan “Bayar sekarang”.</p><form onSubmit={submit}><Field label="Nama pengeluaran" id="upcoming-name"><input id="upcoming-name" placeholder="Contoh: listrik bulanan" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field><Field label="Nominal" id="upcoming-amount"><input ref={amountRef} id="upcoming-amount" type="number" inputMode="numeric" min="1" step="1" placeholder="Contoh: 250000" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></Field><Field label="Wallet sumber" id="upcoming-wallet"><select id="upcoming-wallet" value={form.walletId} onChange={(event) => setForm({ ...form, walletId: event.target.value })}>{wallets.map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select></Field><div className="form-grid"><Field label="Kategori" id="upcoming-category"><select id="upcoming-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field><Field label="Jatuh tempo" id="upcoming-date"><input id="upcoming-date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required /></Field></div><Field label="Pengulangan" id="upcoming-recurrence"><select id="upcoming-recurrence" value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value })}><option value="once">Sekali saja</option><option value="weekly">Setiap minggu</option><option value="monthly">Setiap bulan</option><option value="yearly">Setiap tahun</option></select></Field>{message && <div className="form-message success" role="status"><span>{message}</span><button type="button" aria-label="Tutup pesan" onClick={() => setMessage("")}><X size={16} /></button></div>}<button className="button primary submit-button" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}{saving ? "Menyimpan..." : "Jadwalkan"}</button></form></section>
      <section className="card list-card" id="upcoming-list" aria-labelledby="upcoming-list-title"><div className="section-header"><div><h2 id="upcoming-list-title">Daftar terjadwal</h2><p className="muted">{total} kewajiban aktif</p></div><Clock3 size={20} className="section-icon" /></div>{loading ? <div className="state-panel" aria-busy="true"><LoaderCircle className="spin" size={24} />Memuat jadwal...</div> : error ? <div className="state-panel error"><CircleAlert size={24} /><strong>Gagal memuat data</strong><span>{error}</span><button className="button subtle" onClick={() => void load()}><RotateCw size={16} />Coba lagi</button></div> : expenses.length === 0 ? <div className="state-panel"><CalendarClock size={24} /><strong>Belum ada jadwal</strong><span>Tambahkan tagihan pertama melalui formulir.</span></div> : <div className="upcoming-list">{expenses.map((expense) => <div className={`planned-row ${expense.status}`} key={expense.id}><div className="calendar-date"><strong>{new Date(`${expense.due_date}T00:00:00`).getDate()}</strong><small>{new Date(`${expense.due_date}T00:00:00`).toLocaleDateString("id-ID", { month: "short" })}</small></div><div className="planned-info"><strong>{expense.name}</strong><small>{expense.category} · {expense.wallet_name || "Wallet belum dipilih"} · {expense.recurrence === "once" ? "sekali" : expense.recurrence}</small></div><div className="planned-amount"><strong>{idr.format(expense.amount)}</strong>{expense.status === "overdue" && <small className="negative">Terlambat</small>}</div><div className="planned-actions"><button className="button subtle" disabled={pendingId === expense.id} onClick={() => void pay(expense)}>{pendingId === expense.id ? <LoaderCircle className="spin" size={15} /> : <WalletCards size={15} />}Bayar sekarang</button><button className="icon-button danger" aria-label={`Hapus ${expense.name}`} disabled={pendingId === expense.id} onClick={() => void remove(expense)}><Trash2 size={17} /></button></div></div>)}</div>}<PaginationBar page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} /></section>
    </div>
  </div></>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) { return <div className="field"><label htmlFor={id}>{label}</label>{children}</div>; }
