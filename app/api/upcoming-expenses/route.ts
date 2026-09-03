import { NextResponse } from "next/server";
import { createUpcomingExpense, listUpcomingExpenses, updateUpcomingStatuses } from "@/lib/upcoming-expenses";
import { paginationMeta, parsePagination } from "@/lib/pagination";
import { createBulkUpcomingExpenses } from "@/lib/bulk";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await updateUpcomingStatuses();
  const pagination = parsePagination(request);
  const result = await listUpcomingExpenses(pagination);
  return NextResponse.json({ expenses: result.rows, pagination: paginationMeta(pagination, result.total) });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (Array.isArray(body.expenses)) return NextResponse.json(await createBulkUpcomingExpenses(body.expenses), { status: 201 });
    if (!body.name?.trim() || !Number.isInteger(body.amount) || body.amount <= 0 || !body.category || !body.dueDate || !["once", "weekly", "monthly", "yearly"].includes(body.recurrence)) {
      return NextResponse.json({ error: "Lengkapi nama, nominal positif, kategori, tanggal, dan pengulangan." }, { status: 400 });
    }
    return NextResponse.json({ id: await createUpcomingExpense(body) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Pengeluaran mendatang tidak dapat disimpan." }, { status: 500 });
  }
}
