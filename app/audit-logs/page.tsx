"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Search, Filter, RefreshCw, Lock, UserCheck, Key, Settings, Package, Database } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      let url = `/api/audit-logs?page=${page}&limit=50`;
      if (actionFilter !== "All") url += `&action=${actionFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.auditLogs || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getActionBadge = (action: string) => {
    if (action.includes("FAILED")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-rose-600" /> {action}
        </span>
      );
    }
    if (action.includes("LOGIN") || action.includes("SIGNUP") || action.includes("OTP") || action.includes("PASSWORD")) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black text-white flex items-center gap-1">
          <Key className="w-3 h-3 text-white" /> {action}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-900 border border-zinc-300">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-black" /> System & Security Audit Logs
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Immutably track logins, security events, profile updates, and administrative resource changes.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Audit Stream
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, email, or user name..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-black font-medium"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-black text-white font-bold rounded-xl">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-bold w-full md:w-auto"
          >
            <option value="All">All Audit Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="USER_SIGNUP">USER_SIGNUP</option>
            <option value="OTP_REQUESTED">OTP_REQUESTED</option>
            <option value="OTP_VERIFIED">OTP_VERIFIED</option>
            <option value="PASSWORD_RESET_SUCCESS">PASSWORD_RESET_SUCCESS</option>
            <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
            <option value="PRODUCT_CREATE">PRODUCT_CREATE</option>
            <option value="PRODUCT_UPDATE">PRODUCT_UPDATE</option>
            <option value="WAREHOUSE_CREATE">WAREHOUSE_CREATE</option>
            <option value="LOCATION_CREATE">LOCATION_CREATE</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-600 uppercase">
            <tr>
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Entity</th>
              <th className="p-3.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 font-medium">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-500">
                  Loading audit log entries...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-400 font-bold">
                  No security or administrative audit records found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="p-3.5 font-mono text-zinc-500 text-[11px] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3.5">{getActionBadge(log.action)}</td>
                  <td className="p-3.5">
                    <p className="font-bold text-zinc-950">{log.user_name || log.user_email || "System/Guest"}</p>
                    {log.user_email && <p className="text-[10px] text-zinc-500 font-mono">{log.user_email}</p>}
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">
                    {log.entity_type ? `${log.entity_type} #${log.entity_id || ""}` : "—"}
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-zinc-600">
                    {log.details ? JSON.stringify(log.details) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs">
          <span className="text-zinc-600 font-medium">
            Showing {logs.length} of {pagination.total} audit records (Page {pagination.page} of {pagination.totalPages})
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
              className="px-3 py-1.5 bg-white border border-zinc-300 font-bold text-zinc-800 rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchLogs(pagination.page + 1)}
              className="px-3 py-1.5 bg-black text-white font-bold rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
