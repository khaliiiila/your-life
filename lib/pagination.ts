export type Pagination = { page: number; pageSize: number; offset: number };

export function parsePagination(request: Request): Pagination {
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get("pageSize") || "20", 10) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginationMeta(pagination: Pagination, total: number) {
  return { page: pagination.page, pageSize: pagination.pageSize, total, totalPages: Math.ceil(total / pagination.pageSize) };
}
