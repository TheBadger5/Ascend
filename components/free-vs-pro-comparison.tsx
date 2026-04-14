import { FREE_VS_PRO_AXIS_LABELS, FREE_VS_PRO_ROWS } from "@/lib/pro-value-copy";

export default function FreeVsProComparison({ className = "" }: { className?: string }) {
  return (
    <table className={`w-full text-left text-[11px] ${className}`}>
      <thead>
        <tr className="text-zinc-500">
          <th className="pb-2 pr-3 font-medium" />
          <th className="pb-2 font-medium">Free</th>
          <th className="pb-2 font-medium text-zinc-300">Unlock Full System</th>
        </tr>
      </thead>
      <tbody className="text-zinc-400">
        {FREE_VS_PRO_ROWS.map((row, i) => (
          <tr key={FREE_VS_PRO_AXIS_LABELS[i]} className="border-t border-zinc-800/90">
            <td className="py-2 pr-3 text-zinc-600">{FREE_VS_PRO_AXIS_LABELS[i]}</td>
            <td className="py-2 text-zinc-500">{row.free}</td>
            <td className="py-2 text-zinc-300">{row.pro}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
