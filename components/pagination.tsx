"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationBar({ page, totalPages, total, pageSize = 20, onPageChange }: { page: number; totalPages: number; total: number; pageSize?: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <nav className="pagination" aria-label="Navigasi halaman">
      <span className="pagination-info">{start}–{end} dari {total}</span>
      <div className="pagination-controls">
        <button className="icon-button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Halaman sebelumnya"><ChevronLeft size={18} /></button>
        <span className="pagination-page">{page} / {totalPages}</span>
        <button className="icon-button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Halaman berikutnya"><ChevronRight size={18} /></button>
      </div>
    </nav>
  );
}
