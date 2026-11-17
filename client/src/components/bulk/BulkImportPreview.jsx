import { PREVIEW_ROW_LIMIT } from '../../utils/bulkUserImport.js';

export function BulkImportPreview({
    fileMeta,
    headers,
    rows,
    rowMetaByNumber,
    placeholder = true
}) {
    if (placeholder || !fileMeta) {
        return (
            <div className="bulk-preview bulk-preview--empty">
                <div className="bulk-preview__placeholder">
                    <p className="bulk-preview__title">File preview</p>
                    <p>
                        Select a CSV or Excel file on the left. A scrollable
                        preview of its headers and rows will appear here after
                        parsing. No accounts are created until you confirm
                        import.
                    </p>
                </div>
            </div>
        );
    }

    const previewRows = rows.slice(0, PREVIEW_ROW_LIMIT);
    const displayHeaders =
        headers.length > 0 ? headers : Object.keys(rows[0] || {});

    return (
        <div className="bulk-preview">
            <PreviewMeta
                fileMeta={fileMeta}
                rows={rows}
                displayHeaders={displayHeaders}
            />
            <div className="bulk-preview__table-wrap">
                <table className="bulk-preview__table">
                    <thead>
                        <tr>
                            <th className="bulk-preview__row-num">#</th>
                            {displayHeaders.map((h) => (
                                <th key={h}>{h}</th>
                            ))}
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {previewRows.map((row, idx) => {
                            const rowNumber = idx + 2;
                            const meta = rowMetaByNumber?.get(rowNumber);
                            const status = meta?.status || 'invalid';
                            const reasons = meta?.reasons || [];
                            const rowClass =
                                status === 'valid'
                                    ? 'bulk-preview__row--valid'
                                    : status === 'duplicate'
                                      ? 'bulk-preview__row--duplicate'
                                      : 'bulk-preview__row--invalid';
                            const statusLabel =
                                status === 'valid'
                                    ? 'Valid'
                                    : status === 'duplicate'
                                      ? 'Duplicate'
                                      : 'Invalid';
                            return (
                                <tr key={rowNumber} className={rowClass}>
                                    <td className="bulk-preview__row-num">
                                        {rowNumber}
                                    </td>
                                    {displayHeaders.map((h) => (
                                        <td key={h} title={String(row[h] ?? '')}>
                                            {String(row[h] ?? '') || '—'}
                                        </td>
                                    ))}
                                    <td className="bulk-preview__status">
                                        <span title={reasons.join('; ')}>
                                            {statusLabel}
                                        </span>
                                        {reasons.length ? (
                                            <span className="bulk-preview__reason">
                                                {reasons.join('; ')}
                                            </span>
                                        ) : null}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {rows.length > PREVIEW_ROW_LIMIT ? (
                <p className="bulk-preview__more">
                    Showing first {PREVIEW_ROW_LIMIT} of {rows.length} data
                    rows.
                </p>
            ) : null}
        </div>
    );
}

function PreviewMeta({ fileMeta, rows, displayHeaders }) {
    return (
        <header className="bulk-preview__meta">
            <p>
                <strong>{fileMeta.name}</strong> · {fileMeta.format} ·{' '}
                {(fileMeta.size / 1024).toFixed(1)} KB
            </p>
            <p>
                {rows.length} row{rows.length === 1 ? '' : 's'} ·{' '}
                {displayHeaders.length} column
                {displayHeaders.length === 1 ? '' : 's'}
            </p>
        </header>
    );
}