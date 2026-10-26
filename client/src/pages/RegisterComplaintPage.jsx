import { useEffect, useMemo, useRef, useState } from 'react';
import { useUnsavedChangesPrompt } from '../hooks/useUnsavedChangesPrompt.js';
import { COMPLAINT_DEPARTMENTS } from '../constants/complaintDepartments.js';
import { Link, useNavigate } from 'react-router-dom';
import { buildListReturnState } from '../utils/navigationPaths.js';
import { authApi, complaintsApi } from '../api/client.js';
import {
    titleMentionsAssignee,
    titleMentionsGroupInvite,
    titleMentionsStatus
} from '../utils/complaintTitle.js';
import { suggestComplaintDepartment } from '../utils/complaintDepartment.js';
import { AppIcon } from '../components/AppIcon.jsx';
import { ImagePreview } from '../components/ImagePreview.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { InputGroup } from '../components/ui/index.js';
import '../styles/register-complaint.css';

const MAX_TITLE = 60;
const MAX_TITLE_WORDS = 8;
const MAX_DESCRIPTION = 500;
const MAX_IMAGE_FILES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
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

function compressImageFile(file) {
    if (!file?.type?.startsWith('image/')) return Promise.resolve(file);
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            const maxEdge = 1600;
            const scale = Math.min(
                1,
                maxEdge / Math.max(image.width || 1, image.height || 1)
            );
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            if (!context) {
                URL.revokeObjectURL(url);
                resolve(file);
                return;
            }
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(url);
                    if (!blob || blob.size >= file.size) {
                        resolve(file);
                        return;
                    }
                    const name = file.name.replace(/\.\w+$/, '') || 'image';
                    resolve(
                        new File([blob], `${name}.jpg`, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        })
                    );
                },
                'image/jpeg',
                0.72
            );
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
        image.src = url;
    });
}

function toShortTitle(value) {
    return String(value || '')
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
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
    const [visibility, setVisibility] = useState('public');
    const [undertaking, setUndertaking] = useState(false);
    const [imageFiles, setImageFiles] = useState([]);
    const [preview, setPreview] = useState(null);
    const imageFilesRef = useRef([]);

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
                    imageFiles.length
            ),
        [
            success,
            submitting,
            title,
            description,
            categoryId,
            department,
            location,
            imageFiles.length
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

    const chooseVisibility = (next) => {
        setVisibility(next);
    };

    useEffect(() => {
        imageFilesRef.current = imageFiles;
    }, [imageFiles]);

    useEffect(() => {
        return () => {
            imageFilesRef.current.forEach((item) => {
                if (item.url) URL.revokeObjectURL(item.url);
            });
        };
    }, []);

    const isDirty =
        categoryId ||
        department ||
        title.trim() ||
        description.trim() ||
        location.trim() ||
        imageFiles.length > 0 ||
        undertaking;

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
        const shortTitle = toShortTitle(title);
        const titleWords = shortTitle ? shortTitle.split(' ').length : 0;
        if (!shortTitle) {
            errors.title = 'Complaint title is required';
        } else if (
            shortTitle.length > MAX_TITLE ||
            titleWords > MAX_TITLE_WORDS
        ) {
            errors.title = `Use a short title of up to ${MAX_TITLE_WORDS} words on one line`;
        } else if (titleMentionsGroupInvite(shortTitle)) {
            errors.title = 'Do not mention a group invite in the title';
        } else if (titleMentionsAssignee(shortTitle)) {
            errors.title =
                'Do not mention who the complaint is assigned to in the title';
        } else if (titleMentionsStatus(shortTitle)) {
            errors.title = 'Do not mention the complaint status in the title';
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

        setFieldErrors(errors);
        const order = [
            'categoryId',
            'department',
            'title',
            'description',
            'visibility',
            'undertaking'
        ];
        const first = order.find((key) => errors[key]);
        if (first) {
            requestAnimationFrame(() => {
                const el = document.querySelector(`[data-field="${first}"]`);
                if (!el) return;
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const focusable = el.querySelector(
                    'input, select, textarea, button'
                );
                focusable?.focus?.();
            });
        }
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
                id: `${file.name}-${file.size}-${Date.now()}-${next.length}`,
                name: file.name,
                size: file.size,
                file,
                url: URL.createObjectURL(file)
            });
        }
        setImageFiles(next.slice(0, MAX_IMAGE_FILES));
    };

    const handleImageChange = (e) => {
        addFiles(e.target.files);
        e.target.value = '';
    };

    const removeImage = (id) => {
        setImageFiles((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target?.url) URL.revokeObjectURL(target.url);
            return prev.filter((item) => item.id !== id);
        });
        setPreview((current) => (current?.id === id ? null : current));
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
                const prepared = await compressImageFile(item.file);
                const dataUrl = await readFileAsDataUrl(prepared);
                images.push(dataUrl);
            }

            const payload = {
                categoryId,
                department,
                title: toShortTitle(title),
                description: description.trim(),
                location: location.trim() || undefined,
                complaintType: 'solo',
                visibility,
                undertaking: true,
                images: images.length ? images : undefined
            };

            const data = await complaintsApi.create(payload);
            const complaint = data.complaint;
            setSuccess({
                id: complaint?._id,
                publicId: complaint?.publicId || '',
                message: data.message || 'Complaint submitted successfully'
            });
        } catch (err) {
            const message =
                err.message || 'Failed to submit complaint. Please try again.';
            setFormError(message);
            const lower = message.toLowerCase();
            const field = lower.includes('department')
                ? 'department'
                : lower.includes('category')
                  ? 'categoryId'
                  : lower.includes('title')
                    ? 'title'
                    : lower.includes('description')
                      ? 'description'
                      : null;
            if (field) {
                requestAnimationFrame(() => {
                    document
                        .querySelector(`[data-field="${field}"]`)
                        ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                });
            }
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
                        Reference: {success.publicId || '—'}
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
                                <AppIcon name="user" size="md" />
                            </span>
                            Your details
                        </h2>
                        <p className="field-hint">
                            Pre-filled from your account. Identity fields cannot
                            be changed here.
                        </p>
                        <div className="cr-form-row cr-form-row--2">
                            <div className="cr-field">
                                <span className="cr-field__label">Full name</span>
                                <input
                                    className="ui-input"
                                    type="text"
                                    value={profile?.name || ''}
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="cr-field">
                                <span className="cr-field__label">URN / Roll</span>
                                <input
                                    className="ui-input"
                                    type="text"
                                    value={profile?.rollNumber || ''}
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="cr-field">
                                <span className="cr-field__label">Department</span>
                                <input
                                    className="ui-input"
                                    type="text"
                                    value={profile?.department || ''}
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="cr-field">
                                <span className="cr-field__label">Semester</span>
                                <input
                                    className="ui-input"
                                    type="text"
                                    value={
                                        profile?.semester != null
                                            ? String(profile.semester)
                                            : ''
                                    }
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="cr-field">
                                <span className="cr-field__label">Email</span>
                                <input
                                    className="ui-input"
                                    type="email"
                                    value={profile?.email || ''}
                                    readOnly
                                    disabled
                                />
                            </div>
                            <div className="cr-field">
                                <span className="cr-field__label">Phone</span>
                                <input
                                    className="ui-input"
                                    type="tel"
                                    value={profile?.phone || 'Not provided'}
                                    readOnly
                                    disabled
                                />
                            </div>
                        </div>
                    </section>

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
                            <div className="cr-field" data-field="categoryId">
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

                            <div className="cr-field" data-field="department">
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

                        <div className="cr-field" data-field="title">
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
                                    placeholder="A few words on one line"
                                    value={title}
                                    maxLength={MAX_TITLE}
                                    onChange={(e) =>
                                        setTitle(
                                            e.target.value
                                                .replace(/[\r\n\t]+/g, ' ')
                                                .slice(0, MAX_TITLE)
                                        )
                                    }
                                    disabled={submitting}
                                    aria-invalid={Boolean(fieldErrors.title)}
                                />
                            </InputGroup>
                            <FieldError message={fieldErrors.title} />
                        </div>

                        <div className="cr-field" data-field="description">
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

                        <div className="cr-field">
                            <span className="cr-field__label">
                                Location (Optional)
                            </span>
                            <InputGroup
                                icon={<AppIcon name="map-pin" size="sm" />}
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
                                            <button
                                                type="button"
                                                className="file-list__thumb"
                                                onClick={() => setPreview(f)}
                                                disabled={submitting}
                                                aria-label={`Preview ${f.name}`}
                                            >
                                                <img src={f.url} alt="" />
                                            </button>
                                            <span className="file-list__name">
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
                            <ImagePreview
                                file={
                                    preview
                                        ? { url: preview.url, filename: preview.name }
                                        : null
                                }
                                onClose={() => setPreview(null)}
                            />
                        </div>

                        <fieldset className="form-field cr-access" data-field="visibility">
                            <legend>Visibility</legend>
                            <label className="radio-inline">
                                <input
                                    type="radio"
                                    name="visibility"
                                    value="public"
                                    checked={visibility === 'public'}
                                    onChange={() => chooseVisibility('public')}
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
                                    onChange={() => chooseVisibility('private')}
                                    disabled={submitting}
                                />
                                Private
                            </label>
                            <p className="cr-access-note">
                                Other students can join a public complaint after it is submitted.
                            </p>
                            <FieldError message={fieldErrors.visibility} />
                        </fieldset>

                        <label className="checkbox-field" data-field="undertaking">
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
