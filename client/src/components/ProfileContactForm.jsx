import { useEffect, useState } from 'react';
import { authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { validateEmail } from '../utils/emailValidation.js';
import { Button, Input, Label } from './ui/index.js';

export function ProfileContactForm({ profile, onUpdated }) {
    const { user, updateUser } = useAuth();
    const [email, setEmail] = useState(profile?.email || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [name, setName] = useState(profile?.name || '');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setEmail(profile?.email || '');
        setPhone(profile?.phone || '');
        setName(profile?.name || '');
    }, [profile]);

    const isStudent = user?.role === 'student';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const emailCheck = validateEmail(email);
        if (!emailCheck.ok) {
            setError(emailCheck.message);
            return;
        }
        setLoading(true);
        try {
            const payload = {
                email: emailCheck.email,
                phone
            };
            if (!isStudent) {
                payload.name = name.trim();
            }
            const data = await authApi.updateProfile(payload);
            updateUser(data.user);
            onUpdated?.(data.user);
            setSuccess('Profile updated successfully.');
        } catch (err) {
            setError(err.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <article className="profile-card">
            <header className="profile-card__header">
                <h2>Contact details</h2>
                <p>Update email and phone. Academic fields remain read-only.</p>
            </header>
            <form className="profile-contact-form" onSubmit={handleSubmit}>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                {success ? <p className="form-success" role="status">{success}</p> : null}
                {!isStudent ? (
                    <Label htmlFor="profile-name">
                        Full name
                        <Input
                            id="profile-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                        />
                    </Label>
                ) : null}
                <Label htmlFor="profile-email">
                    Email
                    <Input
                        id="profile-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                </Label>
                <Label htmlFor="profile-phone" hint="e.g. +919876543210">
                    Phone
                    <Input
                        id="profile-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={loading}
                        placeholder="+919876543210"
                    />
                </Label>
                <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Saving…' : 'Save changes'}
                </Button>
            </form>
        </article>
    );
}
