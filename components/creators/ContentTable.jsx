"use client";

import { useState } from "react";
import { ExternalLink, Trash2, Loader2 } from "lucide-react";
import { creatorFetch } from "@/lib/creatorAuthService";

const PLATFORM_LABELS = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  twitter: "Twitter / X",
  blog: "Blog",
  other: "Other",
};

const STATUS_STYLES = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-400 border-green-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function ContentTable({ items, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm("Delete this submission?")) return;
    setDeletingId(id);
    try {
      await creatorFetch(`/api/creator/content/${id}`, { method: "DELETE" });
      onDeleted?.(id);
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  if (!items?.length) {
    return (
      <div className="text-center py-16 text-white/25 text-sm">
        No content submitted yet.
        <br />
        Share your Epocheye experience and submit the link above.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            {["Title / URL", "Platform", "Status", "Submitted", ""].map((h) => (
              <th
                key={h}
                className="text-left text-xs text-white/25 uppercase tracking-wider pb-3 px-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {items.map((item) => (
            <tr key={item.id} className="group hover:bg-white/[0.015] transition-colors">
              <td className="py-4 px-2 max-w-xs">
                <p className="text-white/80 truncate">{item.title || "—"}</p>
                <a
                  href={item.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors mt-0.5 truncate">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  {item.content_url.replace(/^https?:\/\//, "").slice(0, 40)}…
                </a>
              </td>
              <td className="py-4 px-2 text-white/50">
                {PLATFORM_LABELS[item.platform] ?? item.platform}
              </td>
              <td className="py-4 px-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    STATUS_STYLES[item.status] ?? STATUS_STYLES.pending
                  }`}>
                  {item.status}
                </span>
              </td>
              <td className="py-4 px-2 text-white/30 whitespace-nowrap">
                {new Date(item.submitted_at).toLocaleDateString()}
              </td>
              <td className="py-4 px-2">
                {item.status === "pending" && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-white/25 hover:text-red-400 transition-all"
                    aria-label="Delete submission">
                    {deletingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
