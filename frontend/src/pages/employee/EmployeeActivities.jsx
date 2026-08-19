import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeActivitiesApi } from "../../api/employeeApi";
import PageHeader from "../../components/common/PageHeader";
import { Activity, Clock } from "lucide-react";

export default function EmployeeActivities() {
  const [page, setPage] = useState(1);
  const limit = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["employeeActivities", page],
    queryFn: async () => {
      const res = await getEmployeeActivitiesApi({ page, limit });
      return res.data;
    },
  });

  const activities = data?.activities || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="page-container">
      <PageHeader title="Recent Activities" icon={Activity} />

      <div className="emp-activities-page mt-4">
        <div className="bg-white dark:bg-[#111C24] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/80">

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading activities...</div>
          ) : activities.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No recent activities found.</div>
          ) : (
            <>
              <div className="emp-activities-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {activities.map((act) => (
                  <div
                    key={act._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingBottom: "16px",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: "#f1f5f9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Activity size={16} color="#6366f1" />
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                          {act.action} <span style={{ color: "#94a3b8", fontWeight: "400" }}>· employee</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {formatTime(act.createdAt)}
                    </div>
                  </div>
                ))}
              </div>

              {pagination.pages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: page === 1 ? "#f8fafc" : "#fff",
                      cursor: page === 1 ? "not-allowed" : "pointer"
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ alignSelf: "center", fontSize: "14px", color: "#64748b" }}>
                    Page {page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: page === pagination.pages ? "#f8fafc" : "#fff",
                      cursor: page === pagination.pages ? "not-allowed" : "pointer"
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}



