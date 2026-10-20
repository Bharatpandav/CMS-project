export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function exportUsersPdf(rows, title = 'User Export') {
    const html = `
<!DOCTYPE html><html><head><title>${title}</title>
<style>
body{font-family:Segoe UI,sans-serif;padding:24px;color:#0f2744}
h1{font-size:18px}p{font-size:12px;color:#64748b}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}
th,td{border:1px solid #e2e8f0;padding:6px;text-align:left}
th{background:#f8fafc}
</style></head><body>
<h1>${title}</h1>
<p>Exported ${new Date().toLocaleString()}</p>
<table><thead><tr>
${Object.keys(rows[0] || { name: '' }).map((k) => `<th>${k}</th>`).join('')}
</tr></thead><tbody>
${rows
    .map(
        (r) =>
            `<tr>${Object.values(r)
                .map((v) => `<td>${String(v ?? '').replace(/</g, '&lt;')}</td>`)
                .join('')}</tr>`
    )
    .join('')}
</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
}

export async function exportUsersExcel(rows, filename = 'users-export.xlsx') {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Users');
    XLSX.writeFile(book, filename);
}

export function mapUsersForExport(users) {
    return users.map((u) => ({
        Name: u.name,
        URN: u.rollNumber || '',
        Email: u.email,
        Role: u.role,
        Department: u.department || '',
        Semester: u.semester ?? '',
        Section: u.section || '',
        Status: u.isActive ? 'active' : 'inactive',
        Created: u.createdAt
            ? new Date(u.createdAt).toISOString().slice(0, 10)
            : ''
    }));
}
