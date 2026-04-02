"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { creatorFetch } from "@/lib/creatorAuthService";
import ContentTable from "@/components/creators/ContentTable";
import ContentSubmissionForm from "@/components/creators/ContentSubmissionForm";

const API = process.env.NEXT_PUBLIC_CREATOR_API_URL || "http://localhost:3001";

export default function ContentPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadContent() {
    try {
      const res = await creatorFetch(`${API}/api/creator/content`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContent();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white">My Content</h1>
          <p className="text-white/35 text-sm mt-1">
            Track every piece of content you&apos;ve created for Epocheye
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-full text-sm font-medium text-white hover:bg-white hover:text-black transition-all duration-300">
          <Plus className="w-4 h-4" />
          Submit Content
        </button>
      </div>

      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6">
        {loading ? (
          <div className="space-y-3 py-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-white/[0.03] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <ContentTable
            items={items}
            onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
          />
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <ContentSubmissionForm
            onClose={() => setShowForm(false)}
            onSuccess={(newItem) => setItems((prev) => [newItem, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
