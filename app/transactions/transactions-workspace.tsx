"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CircleAlert, Filter, LoaderCircle, Plus, RotateCw, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { formatDate, idr } from "@/lib/formatters";
import { MobileNav } from "@/components/mobile-nav";
import { ToastContainer, useToast } from "@/components/toast";
import { PaginationBar } from "@/components/pagination";

type Wallet = { id: string; name: string; type: string };
type Transaction = { id: string; type: string; wallet_id: string; wallet_name: string; amount: number; category: string; description: string | null; date: string };
const categories = ["makanan", "transport", "tagihan", "kos", "family", "donasi", "gaji", "kesehatan", "hiburan", "investasi", "lainnya"];
const initialForm = { type: "expense", walletId: "", amount: "", category: "makanan", description: "", date: new Date().toISOString().slice(0, 10), note: "" };
const PAGE_SIZE = 20;

export function TransactionsWorkspace() {
  const { toasts, addToast, removeToast } = useToast();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"transaction" | "transfer">("transaction");
  const [form, setForm] = useState(initialForm);
  const [transfer, setTransfer] = useState({ sourceWalletId: "", destinationWalletId: "", amount: "", fee: "0", date: initialForm.date, description: "" });
  const [submitState, setSubmitState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const amountRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true); setLoadError("");
    try {
      const typeParam = filter === "all" ? "" : `&type=${filter}`;
      const [walletResponse, transactionResponse] = await Promise.all([fetch("/api/wallets"), fetch(`/api/transactions?page=${page}&pageSize=${PAGE_SIZE}${typeParam}`)]);
      if (!walletResponse.ok || !transactionResponse.ok) throw new Error();
      const walletData = await walletResponse.json(); const transactionData = await transactionResponse.json();
      setWallets(walletData.wallets); setTransactions(transactionData.transactions);
      setTotalPages(transactionData.pagination.totalPages); setTotal(transactionData.pagination.total);
      setForm((current) => ({ ...current, walletId: current.walletId || walletData.wallets[0]?.id || "" }));
      setTransfer((current) => ({ ...current, sourceWalletId: current.sourceWalletId || walletData.wallets[0]?.id || "", destinationWalletId: current.destinationWalletId || walletData.wallets[1]?.id || "" }));
    } catch { setLoadError("Data transaksi belum dapat dimuat. Periksa koneksi lalu coba lagi."); } finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [page, filter]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage(""); setSubmitState("pending");
    const payload = mode === "transaction" ? { ...form, amount: Number(form.amount) } : { ...transfer, amount: Number(transfer.amount), fee: Number(transfer.fee || 0) };
    if (!Number.isInteger(payload.amount) || payload.amount <= 0) { 
      setMessage("Nominal harus berupa angka bulat lebih dari nol."); 
      addToast("Nominal harus valid", "error");
      setSubmitState("error"); 
      amountRef.current?.focus(); 
      return; 
    }
    if (mode === "transfer" && transfer.sourceWalletId === transfer.destinationWalletId) { 
      setMessage("Wallet sumber dan tujuan harus berbeda."); 
      addToast("Wallet harus berbeda", "error");
      setSubmitState("error"); 
      return; 
    }
    try {
      const response = await fetch(mode === "transaction" ? "/api/transactions" : "/api/transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json(); 
      if (!response.ok) throw new Error(result.error);
      setSubmitState("success"); 
      const successMsg = mode === "transaction" ? "Transaksi berhasil dicatat." : "Transfer berhasil dipindahkan.";
      setMessage(successMsg);
      addToast(successMsg, "success");
      if (mode === "transaction") setForm((current) => ({ ...initialForm, walletId: current.walletId, type: current.type }));
      else setTransfer((current) => ({ ...current, amount: "", fee: "0", description: "" }));
      await load();
    } catch (error) { 
      setSubmitState("error"); 
      const errorMsg = error instanceof Error ? error.message : "Data tidak dapat disimpan.";
      setMessage(errorMsg);
      addToast(errorMsg, "error");
    }
  }

  const visible = transactions;
  return <><ToastContainer toasts={toasts} onClose={removeToast} /><a className="skip-link" href="#transaction-list">Lewati ke daftar transaksi</a><header className="mobile-page-bar"><MobileNav /></header><div className="content transaction-page">
    <div className="page-heading"><div><p className="eyebrow">PENCATATAN HARIAN</p><h1>Transaksi</h1><p className="muted">Catat setiap pergerakan uang agar saldomu selalu akurat.</p></div></div>
    <div className="transaction-layout">
      <section className="card form-card" aria-labelledby="entry-title"><div className="mode-tabs" role="tablist" aria-label="Jenis pencatatan"><button role="tab" aria-selected={mode === "transaction"} className={mode === "transaction" ? "active" : ""} onClick={() => setMode("transaction")}><Plus size={17} />Transaksi</button><button role="tab" aria-selected={mode === "transfer"} className={mode === "transfer" ? "active" : ""} onClick={() => setMode("transfer")}><ArrowLeftRight size={17} />Transfer</button></div>
        <h2 id="entry-title">{mode === "transaction" ? "Tambah transaksi" : "Transfer antar-wallet"}</h2><p className="muted form-intro">{mode === "transaction" ? "Pilih pemasukan atau pengeluaran, lalu lengkapi rinciannya." : "Pemindahan saldo tidak memengaruhi arus kas."}</p>
        <form onSubmit={submit} aria-describedby={message ? "form-message" : undefined}>
          {mode === "transaction" ? <>
            <fieldset className="type-picker"><legend>Tipe transaksi</legend><label><input type="radio" name="type" value="expense" checked={form.type === "expense"} onChange={() => setForm({ ...form, type: "expense" })} /><span><ArrowUpRight size={17} />Pengeluaran</span></label><label><input type="radio" name="type" value="income" checked={form.type === "income"} onChange={() => setForm({ ...form, type: "income" })} /><span><ArrowDownLeft size={17} />Pemasukan</span></label></fieldset>
            <Field label="Wallet" id="wallet"><select id="wallet" value={form.walletId} onChange={(event) => setForm({ ...form, walletId: event.target.value })} required>{wallets.map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select></Field>
            <Field label="Nominal" id="amount"><input ref={amountRef} id="amount" inputMode="numeric" min="1" step="1" type="number" placeholder="Contoh: 50000" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></Field>
            <div className="form-grid"><Field label="Kategori" id="category"><select id="category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field><Field label="Tanggal" id="date"><input id="date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></Field></div>
            <Field label="Deskripsi" id="description"><input id="description" placeholder="Contoh: makan siang" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          </> : <>
            <Field label="Dari wallet" id="source-wallet"><select id="source-wallet" value={transfer.sourceWalletId} onChange={(event) => setTransfer({ ...transfer, sourceWalletId: event.target.value })} required>{wallets.map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select></Field>
            <Field label="Ke wallet" id="destination-wallet"><select id="destination-wallet" value={transfer.destinationWalletId} onChange={(event) => setTransfer({ ...transfer, destinationWalletId: event.target.value })} required>{wallets.map((wallet) => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select></Field>
            <Field label="Nominal" id="transfer-amount"><input ref={amountRef} id="transfer-amount" inputMode="numeric" min="1" step="1" type="number" value={transfer.amount} onChange={(event) => setTransfer({ ...transfer, amount: event.target.value })} required /></Field>
            <div className="form-grid"><Field label="Biaya admin" id="fee"><input id="fee" inputMode="numeric" min="0" step="1" type="number" value={transfer.fee} onChange={(event) => setTransfer({ ...transfer, fee: event.target.value })} /></Field><Field label="Tanggal" id="transfer-date"><input id="transfer-date" type="date" value={transfer.date} onChange={(event) => setTransfer({ ...transfer, date: event.target.value })} required /></Field></div>
            <Field label="Keterangan" id="transfer-description"><input id="transfer-description" placeholder="Contoh: pindah dana bulanan" value={transfer.description} onChange={(event) => setTransfer({ ...transfer, description: event.target.value })} /></Field>
          </>}
          {message && <div id="form-message" role="status" className={`form-message ${submitState}`}><span>{submitState === "error" ? <CircleAlert size={17} /> : null}{message}</span><button type="button" aria-label="Tutup pesan" onClick={() => setMessage("")}><X size={16} /></button></div>}
          <button className="button primary submit-button" disabled={submitState === "pending"}>{submitState === "pending" ? <LoaderCircle className="spin" size={17} /> : mode === "transaction" ? <Plus size={17} /> : <ArrowLeftRight size={17} />}{submitState === "pending" ? "Menyimpan..." : mode === "transaction" ? "Simpan transaksi" : "Lakukan transfer"}</button>
        </form>
      </section>
      <section className="card list-card" id="transaction-list" aria-labelledby="list-title"><div className="section-header"><div><h2 id="list-title">Riwayat transaksi</h2><p className="muted">{total} transaksi ditemukan</p></div><div className="filter-control"><Filter size={15} /><select aria-label="Filter tipe transaksi" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}><option value="all">Semua</option><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option><option value="adjustment">Penyesuaian</option></select></div></div>
        {loading ? <div className="state-panel" aria-busy="true"><LoaderCircle className="spin" size={24} />Memuat transaksi...</div> : loadError ? <div className="state-panel error"><CircleAlert size={24} /><strong>Gagal memuat data</strong><span>{loadError}</span><button className="button subtle" onClick={() => void load()}><RotateCw size={16} />Coba lagi</button></div> : visible.length === 0 ? <div className="state-panel"><ArrowLeftRight size={24} /><strong>Belum ada transaksi</strong><span>Catat transaksi pertama melalui formulir.</span></div> : <div className="transaction-list workspace-list">{visible.map((tx) => <div className="transaction-row" key={tx.id}><div className={`transaction-icon ${tx.type}`}>{tx.type === "income" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</div><div className="transaction-info"><strong>{tx.description || tx.category}</strong><small>{tx.wallet_name} · {formatDate(tx.date)}</small></div><div className="transaction-category">{tx.category}</div><strong className={tx.type === "income" ? "income-text" : "negative"}>{tx.type === "income" ? "+" : "-"}{idr.format(tx.amount)}</strong></div>)}</div>}
        <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </section>
    </div>
  </div></>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="field"><label htmlFor={id}>{label}</label>{children}</div>;
}
