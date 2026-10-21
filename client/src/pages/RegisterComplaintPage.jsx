import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, complaintsApi } from '../api/client.js';
import { previewResponsibleDepartment } from '../utils/complaintDepartment.js';

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;
const MAX_IMAGE_FILES = 3;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
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

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function InfoRow({ label, value }) {
    return (
        <div className="complaint-info-row">
            <span className="complaint-info-row__label">{label}</span>
            <span className="complaint-info-row__value">
                {value || 'Not available'}
            </span>
        </div>
    );
}

export function RegisterComplaintPage() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loadingMeta, setLoadingMeta] = useState(true);
    const [metaError, setMetaError] = useState('');

    const [categoryId, setCategoryId] = useState('');
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

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingMeta(true);
            setMetaError('');
            try {
                const [profileRes, categoriesRes] = await Promise.all([
                    authApi.getMe(),
                    complaintsApi.getCategories()
                ]);
                if (!cancelled) {
                    setProfile(profileRes.user);
                    setCategories(categoriesRes.categories || []);
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

    const responsibleDepartment = useMemo(
        () => previewResponsibleDepartment(selectedCategory, profile),
        [selectedCategory, profile]
    );

    useEffect(() => {
        if (complaintType === 'group' && visibility === 'private') {
            setVisibility('public');
        }
    }, [complaintType, visibility]);

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

    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files || []);
        setFormError('');

        if (files.length + imageFiles.length > MAX_IMAGE_FILES) {
            setFormError(
                `You can attach up to ${MAX_IMAGE_FILES} images`
            );
            return;
        }

        const next = [...imageFiles];

        for (const file of files) {
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                setFormError(
                    'Only JPEG, PNG, WebP, and GIF images are supported. Document upload requires a server file API.'
                );
                continue;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                setFormError('Each image must be 2 MB or smaller');
                continue;
            }
            next.push({
                id: `${file.name}-${file.size}-${Date.now()}`,
                name: file.name,
                file
            });
        }

        setImageFiles(next.slice(0, MAX_IMAGE_FILES));
        e.target.value = '';
    };

    const removeImage = (id) => {
        setImageFiles((prev) => prev.filter((f) => f.id !== id));
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
                            className="profile-btn-primary"
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
            <nav className="breadcrumb" aria-label="Breadcrumb">
                <Link to="/student/dashboard">Home</Link>
                <span aria-hidden="true">→</span>
                <span>Register Complaint</span>
            </nav>

            <header className="page-header">
                <h1>Register a Complaint</h1>
                <p>
                    Provide the details of your issue. Our team will review and
                    take the necessary action.
                </p>
            </header>

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
                <div className="complaint-register__main">
                    <section className="profile-card complaint-student-card">
                        <header className="profile-card__header">
                            <h2>Student Information</h2>
                            <p>Registered details (read-only)</p>
                        </header>
                        {loadingMeta ? (
                            <p className="panel__loading">Loading…</p>
                        ) : (
                            <div className="complaint-info-grid">
                                <InfoRow label="Full Name" value={profile?.name} />
                                <InfoRow
                                    label="URN / Roll Number"
                                    value={
                                        profile?.rollNumber ||
                                        profile?.loginIdentifier
                                    }
                                />
                                <InfoRow label="Email" value={profile?.email} />
                                <InfoRow
                                    label="Department"
                                    value={profile?.department}
                                />
                                <InfoRow
                                    label="Programme / Branch"
                                    value={profile?.programme}
                                />
                                <InfoRow
                                    label="Semester"
                                    value={
                                        profile?.semester != null
                                            ? String(profile.semester)
                                            : ''
                                    }
                                />
                                <InfoRow
                                    label="Section"
                                    value={profile?.section}
                                />
                                <InfoRow
                                    label="Advisor"
                                    value={profile?.advisor}
                                />
                            </div>
                        )}
                    </section>

                    <form
                        className="profile-card complaint-form-card"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <header className="profile-card__header">
                            <h2>Complaint Details</h2>
                        </header>

                        {formError ? (
                            <p className="form-error" role="alert">
                                {formError}
                            </p>
                        ) : null}

                        <label className="form-field">
                            Complaint Category *
                            <select
                                value={categoryId}
                                onChange={(e) =>
                                    setCategoryId(e.target.value)
                                }
                                disabled={loadingMeta || submitting}
                                aria-invalid={Boolean(fieldErrors.categoryId)}
                            >
                                <option value="">Select a category</option>
                                {categories.map((cat) => (
                                    <option key={cat._id} value={cat._id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            {selectedCategory?.description ? (
                                <span className="field-hint">
                                    {selectedCategory.description}
                                </span>
                            ) : null}
                            {fieldErrors.categoryId ? (
                                <span className="field-error" role="alert">
                                    {fieldErrors.categoryId}
                                </span>
                            ) : null}
                        </label>

                        <label className="form-field">
                            Related Department / Responsible Department
                            <input
                                type="text"
                                readOnly
                                value={
                                    responsibleDepartment ||
                                    'Select a category to see routing'
                                }
                                className="input-readonly"
                            />
                            <span className="field-hint">
                                Determined from the category (and your
                                department for Academic Affairs).
                            </span>
                        </label>

                        <label className="form-field">
                            Complaint Title *
                            <input
                                type="text"
                                placeholder="Enter a short, descriptive title"
                                value={title}
                                maxLength={MAX_TITLE}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={submitting}
                                aria-invalid={Boolean(fieldErrors.title)}
                            />
                            {fieldErrors.title ? (
                                <span className="field-error" role="alert">
                                    {fieldErrors.title}
                                </span>
                            ) : null}
                        </label>

                        <label className="form-field">
                            Complaint Description *
                            <textarea
                                rows={5}
                                placeholder="Describe what happened, where it happened, and when."
                                value={description}
                                maxLength={MAX_DESCRIPTION}
                                onChange={(e) =>
                                    setDescription(e.target.value)
                                }
                                disabled={submitting}
                                aria-invalid={Boolean(fieldErrors.description)}
                            />
                            <span className="field-hint">
                                {description.length}/{MAX_DESCRIPTION}
                            </span>
                            {fieldErrors.description ? (
                                <span className="field-error" role="alert">
                                    {fieldErrors.description}
                                </span>
                            ) : null}
                        </label>

                        <label className="form-field">
                            Location (optional)
                            <input
                                type="text"
                                placeholder="Building, room, hostel, or campus area"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                disabled={submitting}
                            />
                        </label>

                        <label className="form-field">
                            Priority / Urgency
                            <select
                                value={priority}
                                onChange={(e) =>
                                    setPriority(e.target.value)
                                }
                                disabled={submitting}
                            >
                                {PRIORITIES.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <fieldset className="form-field">
                            <legend>Complaint Type</legend>
                            <label className="radio-inline">
                                <input
                                    type="radio"
                                    name="complaintType"
                                    value="solo"
                                    checked={complaintType === 'solo'}
                                    onChange={() =>
                                        setComplaintType('solo')
                                    }
                                    disabled={submitting}
                                />
                                Solo Complaint
                            </label>
                            <label className="radio-inline">
                                <input
                                    type="radio"
                                    name="complaintType"
                                    value="group"
                                    checked={complaintType === 'group'}
                                    onChange={() =>
                                        setComplaintType('group')
                                    }
                                    disabled={submitting}
                                />
                                Group Complaint
                            </label>
                        </fieldset>

                        {complaintType === 'group' ? (
                            <label className="form-field">
                                Invite participants (URNs)
                                <textarea
                                    rows={3}
                                    placeholder="Enter URN(s), separated by commas or new lines"
                                    value={inviteInput}
                                    onChange={(e) =>
                                        setInviteInput(e.target.value)
                                    }
                                    disabled={submitting}
                                />
                                <span className="field-hint">
                                    Registered students will receive invitations
                                    after submission.
                                </span>
                                {fieldErrors.invites ? (
                                    <span className="field-error" role="alert">
                                        {fieldErrors.invites}
                                    </span>
                                ) : null}
                            </label>
                        ) : null}

                        <fieldset className="form-field">
                            <legend>Visibility</legend>
                            <label className="radio-inline">
                                <input
                                    type="radio"
                                    name="visibility"
                                    value="public"
                                    checked={visibility === 'public'}
                                    onChange={() => setVisibility('public')}
                                    disabled={submitting}
                                />
                                Public
                            </label>
                            <label className="radio-inline">
                                <input
                                    type="radio"
                                    name="visibility"
                                    value="private"
                                    checked={visibility === 'private'}
                                    onChange={() => setVisibility('private')}
                                    disabled={
                                        submitting ||
                                        complaintType === 'group'
                                    }
                                />
                                Private (solo only)
                            </label>
                            <span className="field-hint">
                                Private complaints are visible only to you,
                                participants, and authorized staff handling the
                                case.
                            </span>
                            {fieldErrors.visibility ? (
                                <span className="field-error" role="alert">
                                    {fieldErrors.visibility}
                                </span>
                            ) : null}
                        </fieldset>

                        <div className="form-field">
                            <span className="form-field__label">
                                Attachments (optional)
                            </span>
                            <input
                                type="file"
                                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                multiple
                                onChange={handleImageChange}
                                disabled={
                                    submitting ||
                                    imageFiles.length >= MAX_IMAGE_FILES
                                }
                            />
                            <span className="field-hint">
                                Up to {MAX_IMAGE_FILES} images (JPEG, PNG, WebP,
                                GIF), max 2 MB each. PDF/document upload
                                requires a dedicated server endpoint.
                            </span>
                            {imageFiles.length > 0 ? (
                                <ul className="file-list">
                                    {imageFiles.map((f) => (
                                        <li key={f.id}>
                                            <span>{f.name}</span>
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
                                I confirm that the information provided is
                                accurate to the best of my knowledge and I
                                understand the complaint process.
                            </span>
                        </label>
                        {fieldErrors.undertaking ? (
                            <span className="field-error" role="alert">
                                {fieldErrors.undertaking}
                            </span>
                        ) : null}

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() =>
                                    navigate('/student/dashboard')
                                }
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="profile-btn-primary"
                                disabled={submitting || loadingMeta}
                            >
                                {submitting
                                    ? 'Submitting…'
                                    : 'Submit Complaint'}
                            </button>
                        </div>
                    </form>
                </div>

                <aside className="complaint-register__aside">
                    <article className="profile-card guidelines-card">
                        <h2>Submission guidelines</h2>
                        <ul>
                            <li>Use a clear, specific title.</li>
                            <li>Choose the most relevant category.</li>
                            <li>Describe what happened accurately.</li>
                            <li>Include a location when it helps.</li>
                            <li>Attach evidence only when useful.</li>
                            <li>Avoid duplicate complaints for the same issue.</li>
                        </ul>
                    </article>
                    <article className="profile-card guidelines-card">
                        <h2>Support / Help</h2>
                        <p>
                            Need help filing a complaint or using your URN?
                        </p>
                        <Link
                            to="/student/support"
                            className="link-teal"
                        >
                            Visit Support
                        </Link>
                    </article>
                </aside>
            </div>
        </div>
    );
}
