import { useEffect, useMemo, useState } from 'react';
import { usersApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { notifyDashboardUserStatsChanged } from '../utils/dashboardSync.js';
import { BulkImportPreview } from '../components/bulk/BulkImportPreview.jsx';
import {
    BULK_USER_HEADERS,
    downloadBulkTemplate,
    getBulkFileFormat,
    isAcceptedBulkFile,
    MAX_BULK_FILE_BYTES,
    parseBulkUploadFile
} from '../utils/bulkUserImport.js';
import '../styles/bulk-import.css';

export function BulkRegistrationPage() {
    const { user } = useAuth();
    const isHod = user?.role === 'hod';
    const hodDepartment = (user?.department || '').trim();

    const [fileMeta, setFileMeta] = useState(null);
    const [parsedRows, setParsedRows] = useState([]);
    const [validation, setValidation] = useState(null);
    const [parseError, setParseError] = useState('');
    const [validateError, setValidateError] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [parsing, setParsing] = useState(false);
    const [validating, setValidating] = useState(false);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        document.title = 'Bulk Import | SBSSU CMS';
    }, []);

    const homePath =
        user?.role === 'hod'
            ? '/hod/dashboard'
            : user?.role === 'dean'
              ? '/dean/dashboard'
              : user?.role === 'super_admin'
                ? '/vc/dashboard'
                : '/app/dashboard';

    const resetFileState = () => {
        setFileMeta(null);
        setParsedRows([]);
        setValidation(null);
        setParseError('');
        setValidateError('');
        setResult(null);
        setError('');
    };

    const rowMetaByNumber = useMemo(() => {
        const map = new Map();
        if (!validation?.rows) return map;
        for (const row of validation.rows) {
            map.set(row.rowNumber, {
                status: row.status,
                reasons: row.reasons || []
            });
        }
        return map;
    }, [validation]);

    const validationErrorsList = useMemo(() => {
        if (!validation?.rows) return [];
        return validation.rows
            .filter((r) => r.status !== 'valid')
            .slice(0, 20)
            .map((r) => ({
                row: r.rowNumber,
                reasons: r.reasons
            }));
    }, [validation]);

    const serverValidated =
        Boolean(validation?.validated) && !validating && !validateError;

    const canImport =
        serverValidated &&
        validation?.validCount > 0 &&
        !(isHod && !hodDepartment) &&
        !importing &&
        !parsing;

    const handleFileChange = async (e) => {
        const picked = e.target.files?.[0] || null;
        resetFileState();
        if (!picked) return;

        if (!isAcceptedBulkFile(picked)) {
            setParseError('Please upload a .csv, .xlsx, or .xls file.');
            return;
        }
        if (picked.size > MAX_BULK_FILE_BYTES) {
            setParseError('File is too large. Maximum size is 2 MB.');
            return;
        }

        setParsing(true);
        try {
            const rows = await parseBulkUploadFile(picked);
            setParsedRows(rows);
            setFileMeta({
                name: picked.name,
                format: getBulkFileFormat(picked),
                size: picked.size
            });

            setValidating(true);
            const records = rows.map((row, index) => ({
                ...row,
                rowNumber: index + 2
            }));
            const serverVal = await usersApi.bulkValidate(records);
            setValidation(serverVal);
        } catch (err) {
            const msg =
                err.missingHeaders?.length
                    ? `Missing columns: ${err.missingHeaders.join(', ')}`
                    : err.message || 'Could not process file';
            if (parsedRows.length) {
                setValidateError(msg);
            } else {
                setParseError(msg);
            }
        } finally {
            setParsing(false);
            setValidating(false);
        }
        e.target.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canImport || !validation?.validRecords?.length) return;

        const skipped =
            (validation.invalidCount || 0) + (validation.duplicateCount || 0);
        const summary = `Register ${validation.validCount} validated record(s)?${
            skipped > 0
                ? ` ${skipped} invalid or duplicate row(s) in the file will NOT be imported.`
                : ''
        }`;
        if (!window.confirm(summary)) return;

        setError('');
        setImporting(true);
        try {
            const data = await usersApi.bulkImportValidated(
                validation.validRecords,
                skipped
            );
            setResult(data);
            notifyDashboardUserStatsChanged();
        } catch (err) {
            setError(err.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const downloadCredentials = () => {
        if (!result?.credentialCSV) return;
        const blob = new Blob([result.credentialCSV], {
            type: 'text/csv;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user-credentials.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="page-stack">
            <PageHeader
                title="Bulk Import"
                description={
                    isHod
                        ? `Upload CSV or Excel. Preview and validate first — only Student and Advisor rows in your department can be imported.`
                        : 'Upload CSV or Excel. Preview and validate every row before registering accounts.'
                }
                breadcrumbs={[
                    { to: homePath, label: 'Dashboard' },
                    { label: 'Bulk Import' }
                ]}
            />

            {isHod && !hodDepartment ? (
                <p className="form-error" role="alert">
                    Your HOD account has no department assigned. Configure your
                    department before using bulk import.
                </p>
            ) : null}

            <div className="bulk-import-layout">
                <section className="bulk-import-panel" aria-label="Upload">
                    <h2>Upload &amp; validate</h2>
                    <p className="field-hint" style={{ marginTop: 0 }}>
                        Selecting a file only parses and previews data — no
                        accounts are created until you confirm import.
                    </p>
                    <form onSubmit={handleSubmit}>
                        {parseError ? (
                            <p className="form-error" role="alert">
                                {parseError}
                            </p>
                        ) : null}
                        {validateError ? (
                            <p className="form-error" role="alert">
                                {validateError}
                            </p>
                        ) : null}
                        {error ? (
                            <p className="form-error" role="alert">
                                {error}
                            </p>
                        ) : null}

                        <label className="file-input">
                            Spreadsheet
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={handleFileChange}
                                disabled={parsing || validating || importing}
                            />
                        </label>

                        {fileMeta ? (
                            <p className="bulk-import-file-name">
                                {fileMeta.name} ({fileMeta.format},{' '}
                                {(fileMeta.size / 1024).toFixed(1)} KB)
                            </p>
                        ) : null}

                        {parsing || validating ? (
                            <p className="field-hint">
                                {parsing
                                    ? 'Parsing file…'
                                    : 'Validating every row against CMS rules and the database…'}
                            </p>
                        ) : null}

                        {validation ? (
                            <div className="bulk-import-stats">
                                <span>
                                    Total: <strong>{validation.total}</strong>
                                </span>
                                <span>
                                    Valid:{' '}
                                    <strong>{validation.validCount}</strong>
                                </span>
                                <span>
                                    Invalid:{' '}
                                    <strong>{validation.invalidCount}</strong>
                                </span>
                                <span>
                                    Duplicate:{' '}
                                    <strong>{validation.duplicateCount}</strong>
                                </span>
                            </div>
                        ) : null}

                        {serverValidated && validation.validCount === 0 ? (
                            <p className="form-error" role="alert">
                                Every row failed validation. Fix the file or
                                choose another. Import is disabled.
                            </p>
                        ) : null}

                        {validationErrorsList.length > 0 ? (
                            <ul
                                className="bulk-import-errors"
                                aria-label="Validation errors"
                            >
                                {validationErrorsList.map(({ row, reasons }) => (
                                    <li key={row}>
                                        Row {row}: {reasons.join('; ')}
                                    </li>
                                ))}
                            </ul>
                        ) : null}

                        <div className="bulk-import-actions">
                            <button
                                type="submit"
                                disabled={!canImport}
                            >
                                {importing ? 'Importing…' : 'Import users'}
                            </button>
                            <button
                                type="button"
                                className="btn btn--outline btn--sm"
                                onClick={downloadBulkTemplate}
                            >
                                Download template
                            </button>
                            {fileMeta && !result ? (
                                <button
                                    type="button"
                                    className="btn btn--outline btn--sm"
                                    onClick={resetFileState}
                                    disabled={importing}
                                >
                                    Remove file
                                </button>
                            ) : null}
                        </div>
                    </form>

                    {result?.summary ? (
                        <div className="result-card" style={{ marginTop: '1rem' }}>
                            <h3>Import summary</h3>
                            <ul className="bulk-import-stats" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <li>
                                    Total submitted:{' '}
                                    <strong>{result.summary.totalSubmitted}</strong>
                                </li>
                                <li>
                                    Successfully registered:{' '}
                                    <strong>{result.summary.created}</strong>
                                </li>
                                <li>
                                    Failed at registration:{' '}
                                    <strong>{result.summary.failed}</strong>
                                </li>
                                <li>
                                    Skipped invalid (from file):{' '}
                                    <strong>{result.summary.skippedInvalid}</strong>
                                </li>
                            </ul>
                            {result.failedUsers?.length ? (
                                <ul className="bulk-import-errors">
                                    {result.failedUsers.map((f) => (
                                        <li key={`${f.row}-${f.email}`}>
                                            Row {f.row}: {f.reason}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            {result.credentialCSV ? (
                                <button
                                    type="button"
                                    className="btn btn--outline btn--sm"
                                    onClick={downloadCredentials}
                                >
                                    Download credentials CSV
                                </button>
                            ) : null}
                            <div className="bulk-import-actions">
                                <button
                                    type="button"
                                    className="btn btn--primary btn--sm"
                                    onClick={resetFileState}
                                >
                                    Done — clear preview
                                </button>
                            </div>
                        </div>
                    ) : null}
                </section>

                <BulkImportPreview
                    placeholder={!fileMeta}
                    fileMeta={fileMeta}
                    headers={BULK_USER_HEADERS}
                    rows={parsedRows}
                    rowMetaByNumber={rowMetaByNumber}
                />
            </div>
        </div>
    );
}