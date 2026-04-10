import Link from "next/link";

import StatusBadge from "@/components/admin/StatusBadge";
import { listAllCreatorsWithPromo } from "@/lib/server/creatorRepository";

export const revalidate = 60;

export default async function AdminCreatorsPage() {
  const creators = await listAllCreatorsWithPromo();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-white">Creators</h1>
        <p className="text-sm text-white/30">{creators.length} total</p>
      </div>

      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
        {creators.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/30 text-center">No creators yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Name</th>
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Email</th>
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Code</th>
                  <th className="px-5 py-3 text-center text-xs text-white/35 font-medium">Commission</th>
                  <th className="px-5 py-3 text-center text-xs text-white/35 font-medium">Discount</th>
                  <th className="px-5 py-3 text-center text-xs text-white/35 font-medium">Status</th>
                  <th className="px-5 py-3 text-right text-xs text-white/35 font-medium">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {creators.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 text-white/80 font-medium">{c.name}</td>
                    <td className="px-5 py-3 text-white/40 text-xs">{c.email}</td>
                    <td className="px-5 py-3 font-mono text-white/50 text-xs">
                      {c.promo_code ?? <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center text-white/60">{c.commission_rate}%</td>
                    <td className="px-5 py-3 text-center text-white/60">{c.customer_discount}%</td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3 text-right text-white/30 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/creators/${c.id}`}
                        className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-2.5 py-1 rounded-md transition-colors">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
