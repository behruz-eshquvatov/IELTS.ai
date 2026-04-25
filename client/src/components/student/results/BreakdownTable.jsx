function BreakdownTable({ title, columns = [], rows = [] }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2 rounded-none border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="overflow-x-auto border border-slate-200">
        <table className="min-w-full border-collapse text-sm text-slate-700">
          <thead className="bg-slate-50">
            <tr>
              {(Array.isArray(columns) ? columns : []).map((column) => (
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold" key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(rows) ? rows : []).map((row, rowIndex) => (
              <tr className="align-top" key={`${title}-${rowIndex}`}>
                {(Array.isArray(columns) ? columns : []).map((column) => (
                  <td className="border border-slate-200 px-3 py-2" key={`${title}-${rowIndex}-${column.key}`}>
                    {typeof column.render === "function" ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default BreakdownTable;
