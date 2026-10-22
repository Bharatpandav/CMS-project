import { useEffect, useMemo, useRef, useState } from 'react';
import { useUnsavedChangesPrompt } from '../hooks/useUnsavedChangesPrompt.js';
import { COMPLAINT_DEPARTMENTS } from '../constants/complaintDepartments.js';
import { Link, useNavigate } from 'react-router-dom';
import { buildListReturnState } from '../utils/navigationPaths.js';
import { authApi, complaintsApi } from '../api/client.js';
import { suggestComplaintDepartment } from '../utils/complaintDepartment.js';
import { AppIcon } from '../components/AppIcon.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { InputGroup } from '../components/ui/index.js';
import '../styles/register-complaint.css';

const MAX_TITLE = 100;
const MAX_DESCRIPTION = 500;
const MAX_IMAGE_FILES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
];

const PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
];

const GUIDELINES = [
    'Provide a clear and concise title.',
    'Select the most relevant category and department.',
    'Include complete details of the issue.',
    'Attach supporting images or documents when useful.',
    'Avoid submitting duplicate complaints for the same issue.',
    'Track the complaint status after submission.'
];

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FieldError({ message }) {
    if (!message) return null;
    return (
        <span className="field-error" role="alert">{message}</span>
    );
}

export function RegisterComplaintPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [profile, setProfile] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [metaError, setMetaError] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const [categoryId, setCategoryId] = useState('');
    const [department, setDepartment] = useState('');
    const [departmentOptions, setDepartmentOptions] =
        useState(COMPLAINT_DEPARTMENTS);
    const departmentUserEdited = useRef(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [priority, setPriority] = useState('medium');
    const [complaintType, setComplaintType] = useState('solo');
    const [visibility, setVisibility] = useState('public');
    const [inviteInput, setInviteInput] = useState('');
    const [undertaking, setUndertaking] = useState(false);
    const [imageFiles, setImageFiles] = useState([]);

    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [success, setSuccess] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const hasDraft = useMemo(
        () =>
            !success &&
            !submitting &&
            Boolean(
                title.trim() ||
                    description.trim() ||
                    categoryId ||
                    department ||
                    location.trim() ||
                    imageFiles.length ||
                    inviteInput.trim()
            ),
        [
            success,
            submitting,
            title,
            description,
            categoryId,
            department,
            location,
            imageFiles.length,
            inviteInput
        ]
    );
    useUnsavedChangesPrompt(hasDraft);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingMeta(true);
            setMetaError('');
            try {
                const [profileRes, categoriesRes, departmentsRes] =
                    await Promise.all([
                        authApi.getMe(),
                        complaintsApi.getCategories(),
                        complaintsApi.getDepartments().catch(() => null)
                    ]);
                if (!cancelled) {
                    setProfile(profileRes.user);
                    setCategories(categoriesRes.categories || []);
                    if (departmentsRes?.departments?.length) {
                        setDepartmentOptions(departmentsRes.departments);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setMetaError(
                        err.message || 'Failed to load form data'
                    );
                }
            } finally {
                if (!cancelled) setLoadingMeta(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const selectedCategory = useMemo(
        () => categories.find((c) => c._id === categoryId),
        [categories, categoryId]
    );

    const suggestedDepartment = useMemo(
        () => suggestComplaintDepartment(selectedCategory, profile),
        [selectedCategory, profile]
    );

    useEffect(() => {
        if (departmentUserEdited.current) {
            return;
        }
        setDepartment(suggestedDepartment || '');
    }, [suggestedDepartment]);

    useEffect(() => {
        if (complaintType === 'group' && visibility === 'private') {
            setVisibility('public');
        }
    }, [complaintType, visibility]);

    const isDirty =
        categoryId ||
        department ||
        title.trim() ||
        description.trim() ||
        location.trim() ||
        inviteInput.trim() ||
        imageFiles.length > 0 ||
        undertaking;

    const parseInviteUrns = () =>
        inviteInput
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);

    const validate = () => {
        const errors = {};

        if (!categoryId) {
            errors.categoryId = 'Please select a complaint category';
        }
        if (!department) {
            errors.department = 'Please select a related department';
        } else if (!departmentOptions.includes(department)) {
            errors.department = 'Please choose a valid department from the list';
        }
        if (!title.trim()) {
            errors.title = 'Complaint title is required';
        } else if (title.trim().length > MAX_TITLE) {
            errors.title = `Title must be ${MAX_TITLE} characters or fewer`;
        }
        if (!description.trim()) {
            errors.description = 'Complaint description is required';
        } else if (description.trim().length > MAX_DESCRIPTION) {
            errors.description = `Description must be ${MAX_DESCRIPTION} characters or fewer`;
        }
        if (!undertaking) {
            errors.undertaking =
                'You must confirm the undertaking before submitting';
        }
        if (complaintType === 'group' && visibility === 'private') {
            errors.visibility =
                'Private complaints must be solo. Group complaints must be public.';
        }

        const invites = parseInviteUrns();
        const selfUrn =
            profile?.rollNumber?.toLowerCase() ||
            profile?.loginIdentifier?.toLowerCase();
        if (complaintType === 'group' && invites.length > 0) {
            const dup = invites.find(
                (u) => u.toLowerCase() === selfUrn
            );
            if (dup) {
                errors.invites = 'You cannot invite yourself';
            }
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const addFiles = async (files) => {
        setFormError('');
        const list = Array.from(files || []);
        if (list.length + imageFiles.length > MAX_IMAGE_FILES) {
            setFormError(
                `You can attach up to ${MAX_IMAGE_FILES} files`
            );
            return;
        }

        const next = [...imageFiles];
        for (const file of list) {
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                setFormError(
                    'Only JPEG, PNG, WebP, and GIF images are supported.'
                );
                continue;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                setFormError('Each file must be 5 MB or smaller');
                continue;
            }
            next.push({
                id: `${file.name}-${file.size}-${Date.now()}`,
                name: file.name,
                size: file.size,
                file
            });
        }
        setImageFiles(next.slice(0, MAX_IMAGE_FILES));
    };

    const handleImageChange = (e) => {
        addFiles(e.target.files);
        e.target.value = '';
    };

    const removeImage = (id) => {
        setImageFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const handleCancel = () => {
        if (
            isDirty &&
            !window.confirm(
                'Discard your complaint draft? Unsaved information will be lost.'
            )
        ) {
            return;
        }
        navigate('/app/dashboard');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setSuccess(null);

        if (!validate()) {
            return;
        }

        setSubmitting(true);
        try {
            const images = [];
            for (const item of imageFiles) {
                const dataUrl = await readFileAsDataUrl(item.file);
                images.push(dataUrl);
            }

            const payload = {
                categoryId,
                department,
                title: title.trim(),
                description: description.trim(),
                location: location.trim() || undefined,
                priority,
                complaintType,
                visibility,
                undertaking: true,
                images: images.length ? images : undefined
            };

            if (complaintType === 'group') {
                const inviteUrns = parseInviteUrns();
                if (inviteUrns.length) {
                    payload.inviteUrns = inviteUrns;
                }
            }

            const data = await complaintsApi.create(payload);
            const complaint = data.complaint;
            setSuccess({
                id: complaint?._id,
                message: data.message || 'Complaint submitted successfully'
            });
        } catch (err) {
            setFormError(
                err.message || 'Failed to submit complaint. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (success?.id) {
        return (
            <div className="complaint-register page-stack">
                <article className="panel success-panel">
                    <h1>Complaint submitted</h1>
                    <p>{success.message}</p>
                    <p className="mono">
                        Reference:{' '}
                        {String(success.id).slice(-8).toUpperCase()}
                    </p>
                    <div className="form-actions">
                        <Link
                            to={`/student/complaints/${success.id}`}
                            state={buildListReturnState(
                                '/student/complaints/register'
                            )}
                            className="cr-submit-btn"
                        >
                            View complaint
                        </Link>
                        <Link
                            to="/student/complaints"
                            className="btn-cancel"
                        >
                            My complaints
                        </Link>
                    </div>
                </article>
            </div>
        );
    }

    return (
        <div className="complaint-register">
            <PageHeader
                breadcrumbs={[
                    { to: '/app/dashboard', label: 'Dashboard' },
                    { label: 'Register Complaint' }
                ]}
                title="Register a Complaint"
                description="Provide the details of your issue. Our team will review and take the necessary action."
            />

            {metaError ? (
                <div className="inline-alert">
                    <span>{metaError}</span>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            <div className="complaint-register__layout">
                <form
                    className="complaint-register__main"
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <section className="cr-form-card">
                        <h2 className="cr-form-card__title">
                            <span className="cr-form-card__title-icon">
                                <AppIcon name="file-text" size="md" />
                            </span>
                            Complaint Details
                        </h2>

                        {formError ? (
                            <p className="form-error" role="alert">
                                {formError}
                            </p>
                        ) : null}

                        <div className="cr-form-row cr-form-row--2">
                            <div className="cr-field">
                                <span className="cr-field__label">
                                    Complaint Category *
                                </span>
                                <InputGroup
                                    icon={
                                        <AppIcon name="tag" size="sm" />
                                    }
                                >
                                    <select
                                        className="ui-input-group__field"
                                        value={categoryId}
                                        onChange={(e) =>
                                            setCategoryId(e.target.value)
                                        }
                                        disabled={
                                            loadingMeta || submitting
                                        }
                                        aria-invalid={Boolean(
                                            fieldErrors.categoryId
                                        )}
                                    >
                                        <option value="">
                                            Select a category
                                        </option>
                                        {categories.map((cat) => (
                                            <option
                                                key={cat._id}
                                                value={cat._id}
                                            >
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </InputGroup>
                                <FieldError message={fieldErrors.categoryId} />
                            </div>

                            <div className="cr-field">
                                <span className="cr-field__label">
                                    Related Department *
                                </span>
                                <InputGroup
                                    icon={
                                        <AppIcon
                                            name="building"
                                            size="sm"
                                        />
                                    }
                                >
                                    <select
                                        className="ui-input-group__field"
                                        value={department}
                                        onChange={(e) => {
                                            departmentUserEdited.current = true;
                                            setDepartment(e.target.value);
                                        }}
                                        disabled={
                                            loadingMeta || submitting
                                        }
                                        aria-invalid={Boolean(
                                            fieldErrors.department
                                        )}
                                        aria-describedby={
                                            suggestedDepartment
                                                ? 'cr-dept-suggestion'
                                                : undefined
                                        }
                                    >
                                        <option value="">
                                            Select a department
                                        </option>
                                        {departmentOptions.map((dept) => (
                                            <option key={dept} value={dept}>
                                                {dept}
                                            </option>
                                        ))}
                                    </select>
                                </InputGroup>
                                {suggestedDepartment &&
                                suggestedDepartment !== department ? (
                                    <p
                                        id="cr-dept-suggestion"
                                        className="field-hint"
                                    >
                                        Suggested for this category:{' '}
                                        <button
                                            type="button"
                                            className="cr-suggest-link"
                                            onClick={() => {
                                                setDepartment(
                                                    suggestedDepartment
                                                );
                                                departmentUserEdited.current =
                                                    false;
                                            }}
                                        >
                                            {suggestedDepartment}
                                        </button>
                                    </p>
                                ) : suggestedDepartment ? (
                                    <p
                                        id="cr-dept-suggestion"
                                        className="field-hint"
                                    >
                                        Pre-filled from category — you can
                                        choose another department if needed.
                                    </p>
                                ) : (
                                    <span className="field-hint">
                                        Choose the department that should
                                        handle this complaint.
                                    </span>
                                )}
                                <FieldError
                                    message={fieldErrors.department}
                                />
                            </div>
                        </div>

                        <div className="cr-field">
                            <span className="cr-field__label">
                                Complaint Title *
                            </span>
                            <InputGroup
                                icon={
                                    <AppIcon name="file-text" size="sm" />
                                }
                            >
                                <input
                                    type="text"
                                    className="ui-input-group__field"
                                    placeholder="Enter a short and clear title"
                                    value={title}
                                    maxLength={MAX_TITLE}
                                    onChange={(e) =>
                                        setTitle(e.target.value)
                                    }
                                    disabled={submitting}
                                    aria-invalid={Boolean(fieldErrors.title)}
                                />
                            </InputGroup>
                            <span className="cr-field__counter">
                                {title.length}/{MAX_TITLE}
                            </span>
                            <FieldError message={fieldErrors.title} />
                        </div>

                        <div className="cr-field">
                            <span className="cr-field__label">
                                Complaint Description *
                            </span>
                            <InputGroup
                                textarea
                                icon={
                                    <AppIcon
                                        name="clipboard-list"
                                        size="sm"
                                    />
                                }
                            >
                                <textarea
                                    className="ui-input-group__field"
                                    placeholder="Describe what happened, where it happened, and when."
                                    value={description}
                                    maxLength={MAX_DESCRIPTION}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    disabled={submitting}
                                    aria-invalid={Boolean(
                                        fieldErrors.description
                                    )}
                                />
                            </InputGroup>
                            <span className="cr-field__counter">
                                {description.length}/{MAX_DESCRIPTION}
                            </span>
                            <FieldError message={fieldErrors.description} />
                        </div>

                        <div className="cr-form-row cr-form-row--2">
                            <div className="cr-field">
                                <span className="cr-field__label">
                                    Location (Optional)
                                </span>
                                <InputGroup
                                    icon={
                                        <AppIcon name="map-pin" size="sm" />
                                    }
                                >
                                    <input
                                        type="text"
                                        className="ui-input-group__field"
                                        placeholder="Building, Room No., Area..."
                                        value={location}
                                        onChange={(e) =>
                                            setLocation(e.target.value)
                                        }
                                        disabled={submitting}
                                    />
                                </InputGroup>
                            </div>

                            <div className="cr-field">
                                <span className="cr-field__label">
                                    Priority Level *
                                </span>
                                <div className="cr-priority-wrap">
                                    <InputGroup noIcon>
                                        <select
                                            className="ui-input-group__field"
                                            value={priority}
                                            onChange={(e) =>
                                                setPriority(e.target.value)
                                            }
                                            disabled={submitting}
                                        >
                                            {PRIORITIES.map((p) => (
                                                <option
                                                    key={p.value}
                                                    value={p.value}
                                                >
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                    </InputGroup>
                                    {priority === 'medium' ? (
                                        <span className="cr-priority-badge">
                                            Medium
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="cr-field">
                            <span className="cr-field__label">
                                Upload Images / Documents (Optional)
                            </span>
                            <div
                                className={`cr-dropzone${dragOver ? ' is-dragover' : ''}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragOver(true);
                                }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOver(false);
                                    addFiles(e.dataTransfer.files);
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        fileInputRef.current?.click();
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="cr-dropzone__icon">
                                    <AppIcon name="upload-cloud" size="xl" />
                                </div>
                                <p>Drag &amp; drop files here or click to upload</p>
                                <small>
                                    Images (JPEG, PNG, WebP, GIF). Max{' '}
                                    {MAX_IMAGE_FILES} files, 5 MB each.
                                </small>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                hidden
                                multiple
                                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                onChange={handleImageChange}
                                disabled={
                                    submitting ||
                                    imageFiles.length >= MAX_IMAGE_FILES
                                }
                            />
                            {imageFiles.length > 0 ? (
                                <ul className="file-list">
                                    {imageFiles.map((f) => (
                                        <li key={f.id}>
                                            <span>
                                                {f.name} ({formatBytes(f.size)})
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeImage(f.id)
                                                }
                                                disabled={submitting}
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>

                        <details className="cr-advanced">
                            <summary>
                                Additional options (group / visibility)
                            </summary>
                            <div className="cr-advanced__body">
                                <fieldset className="form-field">
                                    <legend>Complaint Type</legend>
                                    <label className="radio-inline">
                                        <input
                                            type="radio"
                                            name="complaintType"
                                            value="solo"
                                            checked={
                                                complaintType === 'solo'
                                            }
                                            onChange={() =>
                                                setComplaintType('solo')
                                            }
                                            disabled={submitting}
                                        />
                                        Solo
                                    </label>
                                    <label className="radio-inline">
                                        <input
                                            type="radio"
                                            name="complaintType"
                                            value="group"
                                            checked={
                                                complaintType === 'group'
                                            }
                                            onChange={() =>
                                                setComplaintType('group')
                                            }
                                            disabled={submitting}
                                        />
                                        Group
                                    </label>
                                </fieldset>
                                {complaintType === 'group' ? (
                                    <label className="form-field">
                                        Invite participants (URNs)
                                        <textarea
                                            rows={2}
                                            value={inviteInput}
                                            onChange={(e) =>
                                                setInviteInput(e.target.value)
                                            }
                                            disabled={submitting}
                                        />
                                        <FieldError
                                            message={fieldErrors.invites}
                                        />
                                    </label>
                                ) : null}
                                <fieldset className="form-field">
                                    <legend>Visibility</legend>
                                    <label className="radio-inline">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="public"
                                            checked={
                                                visibility === 'public'
                                            }
                                            onChange={() =>
                                                setVisibility('public')
                                            }
                                            disabled={submitting}
                                        />
                                        Public
                                    </label>
                                    <label className="radio-inline">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value="private"
                                            checked={
                                                visibility === 'private'
                                            }
                                            onChange={() =>
                                                setVisibility('private')
                                            }
                                            disabled={
                                                submitting ||
                                                complaintType === 'group'
                                            }
                                        />
                                        Private (solo only)
                                    </label>
                                    <FieldError
                                        message={fieldErrors.visibility}
                                    />
                                </fieldset>
                            </div>
                        </details>

                        <label className="checkbox-field">
                            <input
                                type="checkbox"
                                checked={undertaking}
                                onChange={(e) =>
                                    setUndertaking(e.target.checked)
                                }
                                disabled={submitting}
                            />
                            <span>
                                I confirm the information is accurate and I
                                understand the complaint process.
                            </span>
                        </label>
                        <FieldError message={fieldErrors.undertaking} />

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={handleCancel}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="cr-submit-btn"
                                disabled={submitting || loadingMeta}
                            >
                                {submitting ? 'Submitting…' : 'Submit complaint'}
                            </button>
                        </div>
                    </section>
                </form>

                <aside className="complaint-register__aside">
                    <article className="cr-guidelines">
                        <div className="cr-guidelines__head">
                            <AppIcon name="lightbulb" size="md" />
                            Guidelines
                        </div>
                        <ul>
                            {GUIDELINES.map((text) => (
                                <li key={text}>
                                    <AppIcon name="check" size="sm" />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>
                    </article>
                    <article className="cr-help-card">
                        <div className="cr-help-card__head">
                            <AppIcon name="info" size="md" />
                            Need Help?
                        </div>
                        <p>
                            If you are unsure about the category or department,
                            you can contact the helpdesk.
                        </p>
                        <Link
                            to="/student/support"
                            className="cr-help-btn"
                        >
                            <AppIcon name="headphones" size="sm" />
                            Contact Support
                        </Link>
                    </article>
                </aside>
            </div>
        </div>
    );
}
