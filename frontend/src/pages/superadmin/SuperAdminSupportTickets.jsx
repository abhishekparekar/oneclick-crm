import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupportTicketsApi } from "../../api/superAdminApi";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import { Search, ShieldAlert, CheckCircle, Clock, ExternalLink, MessageCircle } from "lucide-react";

const SuperAdminSupportTickets = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["superAdminTickets"],
    queryFn: () => getSupportTicketsApi(),
  });

  const tickets = data?.data || [
    { _id: 'TCK-1021', subject: 'API Rate Limit Exceeded', company: 'TechFlow', priority: 'High', status: 'Open', lastUpdated: '2026-06-27T09:15:00.000Z' },
    { _id: 'TCK-1022', subject: 'Billing Issue on Renewal', company: 'Acme Corp', priority: 'Medium', status: 'In Progress', lastUpdated: '2026-06-26T14:20:00.000Z' },
    { _id: 'TCK-1023', subject: 'Unable to login to admin panel', company: 'InnovateHub', priority: 'Critical', status: 'Open', lastUpdated: '2026-06-27T10:05:00.000Z' },
    { _id: 'TCK-1024', subject: 'Request for Custom Domain', company: 'GlobalSys', priority: 'Low', status: 'Resolved', lastUpdated: '2026-06-25T11:00:00.000Z' },
  ];

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: "Ticket ID",
      accessor: "_id",
      render: (row) => <span className="font-bold text-sa-text">{row._id}</span>
    },
    {
      header: "Subject & Company",
      accessor: "subject",
      render: (row) => (
        <div>
          <p className="font-bold text-sa-text">{row.subject}</p>
          <p className="text-sm font-medium text-sa-text-secondary mt-0.5">{row.company}</p>
        </div>
      )
    },
    {
      header: "Priority",
      accessor: "priority",
      render: (row) => {
        let color = "bg-sa-bg text-sa-text";
        if (row.priority === 'Critical') color = "bg-sa-danger/15 text-sa-danger border border-sa-danger/40 animate-pulse";
        if (row.priority === 'High') color = "bg-sa-warning-bg text-sa-warning-text";
        if (row.priority === 'Medium') color = "bg-sa-info-bg text-sa-info-text";
        return <span className={`px-2 py-0.5 rounded text-[12px] font-bold uppercase tracking-wider ${color}`}>{row.priority}</span>;
      }
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: "Last Updated",
      accessor: "lastUpdated",
      render: (row) => (
        <span className="text-base font-medium text-sa-text-secondary flex items-center">
          <Clock size={12} className="mr-1.5 text-sa-text-secondary" />
          {new Date(row.lastUpdated).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Action",
      accessor: "action",
      render: () => (
        <button className="flex items-center space-x-1 px-3 py-1.5 bg-sa-card border border-sa-border hover:bg-sa-bg rounded-[10px] text-sm font-bold text-sa-text transition-colors">
          <MessageCircle size={14} /> <span>Reply</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-3 w-full pb-10">
      <div>
        <h1 className="text-3xl font-bold text-sa-text">Support Tickets</h1>
        <p className="text-base text-sa-text-secondary mt-1">Manage global support requests from tenant admins.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-sa-card rounded-[16px] p-4 border border-sa-border shadow-[0_2px_10px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-sa-danger/15 text-sa-danger flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-sa-text">12</p>
            <p className="text-sm font-bold text-sa-text-secondary uppercase">Open Tickets</p>
          </div>
        </div>
        <div className="bg-sa-card rounded-[16px] p-4 border border-sa-border shadow-[0_2px_10px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-sa-primary/15 text-sa-primary flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-sa-text">5</p>
            <p className="text-sm font-bold text-sa-text-secondary uppercase">In Progress</p>
          </div>
        </div>
        <div className="bg-sa-card rounded-[16px] p-4 border border-sa-border shadow-[0_2px_10px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-sa-success/15 text-sa-success flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-sa-text">1,492</p>
            <p className="text-sm font-bold text-sa-text-secondary uppercase">Resolved</p>
          </div>
        </div>
      </div>

      <div className="bg-sa-card p-4 rounded-[16px] shadow-[0_2px_10px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-sa-border flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sa-text-secondary" />
          <input
            type="text"
            placeholder="Search tickets..."
            className="input-field pl-9 rounded-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="input-field w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-sa-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sa-text-secondary font-medium">Loading tickets...</p>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredTickets} pagination={{ total: filteredTickets.length }} />
      )}
    </div>
  );
};

export default SuperAdminSupportTickets;
