import { numbers, query } from "./db";
import type { Pagination } from "./pagination";

export async function listWishlists(pagination: Pagination) {
  const total=Number((await query<{total:string}>("SELECT COUNT(*) total FROM wishlists WHERE status='active'")).rows[0].total);
  const rows=(await query("SELECT * FROM wishlists WHERE status='active' ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,target_date IS NULL,target_date,name LIMIT $1 OFFSET $2",[pagination.pageSize,pagination.offset])).rows.map(r=>numbers(r,["target_amount","saved_amount"])); return {rows,total};
}
export async function createWishlist(input:{name:string;targetAmount:number;savedAmount:number;priority:string;targetDate?:string;note?:string}){const id=`wish_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;await query("INSERT INTO wishlists (id,name,target_amount,saved_amount,priority,target_date,note) VALUES ($1,$2,$3,$4,$5,$6,$7)",[id,input.name.trim(),input.targetAmount,input.savedAmount,input.priority,input.targetDate||null,input.note?.trim()||null]);return id;}
export async function updateWishlist(id:string,savedAmount:number,status?:"active"|"purchased"|"cancelled"){if(!(await query("UPDATE wishlists SET saved_amount=$1,status=COALESCE($2,status),updated_at=NOW() WHERE id=$3",[savedAmount,status||null,id])).rowCount)throw new Error("Wishlist tidak ditemukan.");}
export async function deleteWishlist(id:string){if(!(await query("DELETE FROM wishlists WHERE id=$1",[id])).rowCount)throw new Error("Wishlist tidak ditemukan.");}
