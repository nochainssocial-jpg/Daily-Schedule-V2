export type PdfSnapshot = {
  dateISO: string;
  assignments: Array<{ staff: string; color: string; participants: string[] }>;
  floating: {
    timeSlots: string[];
    frontRoom: Record<string, string[]>;
    scotty: Record<string, string[]>;
    twins: Record<string, string[]>;
  };
  chores: Array<{ name: string; staff: string[] }>;
  dropoffs_pickups: string[];
  dropoffs: Array<{ staff: string; participants: string[] }>;
};

function esc(s: string) {
  return String(s || '').replace(/[&<>\"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]!));
}

export function buildPdfHtml(s: PdfSnapshot): string {
  const css = `
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing:border-box; font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    body { color:#222; }
    h1 { margin:0 0 10px; font-size:28px; line-height:1.2; text-align:left; font-weight:900; }
    h2 { margin:18px 0 8px; font-size:18px; text-align:left; font-weight:800; }
    .section { page-break-after: always; }
    .section:last-child { page-break-after: avoid; }
    .muted { color:#666; font-style:italic; }
    .staffRow { margin: 8px 0 12px; }
    .chip { display:inline-block; width:14px; height:14px; border-radius:50%; margin-right:8px; vertical-align:middle; border:1px solid #ddd; }
    .staffName { font-size: 18px; font-weight: 800; display:inline-block; vertical-align:middle; }
    .participants { margin-left: 22px; font-weight: 700; font-size: 13px; }
    table { width:100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border:1px solid #e6e6e6; padding: 8px 10px; font-size: 12px; vertical-align: top; }
    th { background:#fafafa; font-weight: 800; }
    .twoCol th:first-child, .twoCol td:first-child { width: 55%; }
    .tight th, .tight td { padding: 6px 8px; font-size: 12px; }
    @media print { h1{font-size:26px}.staffName{font-size:17px}.participants{font-size:12.5px} }
  </style>`;

  const page1 = `
    <div class="section">
      <h1>Daily Assignments — ${esc(s.dateISO)}</h1>
      ${s.assignments.map(a => `
        <div class="staffRow">
          <span class="chip" style="background:${a.color || '#ccc'}"></span>
          <span class="staffName">${esc(a.staff)}</span>
          <div class="edit/participants">${
            a.participants.length ? esc(a.participants.join(', ')) : '<span class="muted">No participants</span>'
          }</div>
        </div>
      `).join('')}
    </div>
  `;

  const timeRows = s.floating.timeSlots.map(slot => `
    <tr>
      <td>${esc(slot)}</td>
      <td>${esc((s.floating.frontRoom[slot] || []).join(', '))}</td>
      <td>${esc((s.floating.scotty[slot] || []).join(', '))}</td>
      <td>${esc((s.floating.twins[slot]  || []).join(', '))}</td>
    </tr>
  `).join('');

  const page2 = `
    <div class="section">
      <h1>Floating Assignments — ${esc(s.dateISO)}</h1>
      <table class="tight">
        <thead>
          <tr><th>Time Slots</th><th>Front Room</th><th>Scotty</th><th>Twins</th></tr>
        </thead>
        <tbody>${timeRows}</tbody>
      </table>
    </div>
  `;

  const page3 = `
    <div class="section">
      <h1>Afternoon Cleaning Chores — ${esc(s.dateISO)}</h1>
      <table class="twoCol tight">
        <thead><tr><th>Chore</th><th>Staff Assigned</th></tr></thead>
        <tbody>
          ${s.chores.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.staff.join(', '))}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;

  const page4 = `
    <div class="section">
      <h1>Pickups & Drop-offs — ${esc(s.dateISO)}</h1>

      <h2>Pick Ups</h2>
      <div>${s.dropoffs_pickups.length ? esc(s.dropoffs_pickups.join(', ')) : '<span class="muted">None</span>'}</div>

      <h2 style="margin-top:14px">Drop Offs</h2>
      <table class="tight">
        <thead><tr><th>Staff</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th></tr></thead>
        <tbody>
          ${s.dropoffs.map(r => `
            <tr>
              <td>${esc(r.staff)}</td>
              ${[0,1,2,3].map(i => `<td>${esc(r.participants[i] || '')}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  return `<!doctype html><html><head><meta charset="utf-8">${css}</head><body>${page1}${page2}${page3}${page4}</body></html>`;
}
