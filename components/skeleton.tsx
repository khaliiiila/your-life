"use client";

export function CardSkeleton() {
  return (
    <section className="card" aria-busy="true">
      <div className="card-label">
        <span style={{ height: "16px", width: "150px", background: "#f3f6f4", borderRadius: "8px" }} />
      </div>
      <strong style={{ height: "32px", width: "120px", background: "#e8edea", borderRadius: "8px", display: "block", margin: "10px 0" }} />
      <p style={{ height: "14px", width: "200px", background: "#f3f6f4", borderRadius: "4px" }} />
      <div style={{ height: "42px", marginTop: "14px", display: "flex", gap: "6px" }}>
        {[...Array(5)].map((_, i) => (
          <i key={i} style={{ flex: 1, background: "#d9e2dc", borderRadius: "2px 2px 0 0" }} />
        ))}
      </div>
    </section>
  );
}

export function ListSkeleton({ count = 5 }) {
  return (
    <div className="wallet-list" aria-busy="true">
      {[...Array(count)].map((_, i) => (
        <div key={i} style={{ height: "55px", display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "36px", height: "36px", background: "#f0f5f2", borderRadius: "8px" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: "14px", width: "120px", background: "#e8edea", borderRadius: "4px", marginBottom: "4px" }} />
            <div style={{ height: "11px", width: "80px", background: "#f3f6f4", borderRadius: "4px" }} />
          </div>
          <div style={{ width: "100px", height: "14px", background: "#e8edea", borderRadius: "4px" }} />
        </div>
      ))}
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="transaction-row" aria-busy="true" style={{ display: "flex", gap: "12px", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #e5ebe7" }}>
      <div style={{ width: "36px", height: "36px", background: "#f0f5f2", borderRadius: "8px" }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: "14px", width: "140px", background: "#e8edea", borderRadius: "4px", marginBottom: "4px" }} />
        <div style={{ height: "11px", width: "100px", background: "#f3f6f4", borderRadius: "4px" }} />
      </div>
      <div style={{ width: "80px", height: "12px", background: "#f3f6f4", borderRadius: "4px" }} />
      <div style={{ width: "90px", height: "14px", background: "#e8edea", borderRadius: "4px" }} />
    </div>
  );
}

export function GridSkeleton({ columns = 3 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "16px" }}>
      {[...Array(columns)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
