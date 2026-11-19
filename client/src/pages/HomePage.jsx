import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { complaintsApi } from '../api/client.js';
import { AdminAuthModal } from '../components/AdminAuthModal.jsx';
import { LoginModal } from '../components/LoginModal.jsx';
import { PublicHeaderActions } from '../components/PublicHeaderActions.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getPostLoginPath } from '../utils/roleRedirect.js';
import { canAccessManagementPortal } from '../utils/managementAccess.js';
import { getManagementDashboardPath } from '../utils/managementAccess.js';
import { isAdminStaffRole } from '../utils/staffRoles.js';
import { AppIcon } from '../components/AppIcon.jsx';
import { HeroWorkflowOrbit } from '../components/HeroWorkflowOrbit.jsx';
import { PublicContactSection } from '../components/PublicContactSection.jsx';
import { DEMO_CONTACT } from '../constants/demoContact.js';
import { IconMenu } from '../components/icons.jsx';
import { ArrowRight, UserCircle } from 'lucide-react';
import '../styles/home.css';
import '../styles/cms-surfaces.css';

const FEATURES = [
    {
        title: 'Complaint registration',
        description: 'Submit issues with the details your team needs to act.',
        iconKey: 'file-plus'
    },
    {
        title: 'Complaint tracking',
        description: 'Follow status updates from submission through resolution.',
        iconKey: 'activity'
    },
    {
        title: 'Transparent review',
        description: 'Clear routing to departments and accountable workflows.',
        iconKey: 'clipboard-list'
    },
    {
        title: 'Secure access',
        description: 'University-authenticated access with role-based permissions.',
        iconKey: 'lock'
    }
];

const STEPS = [
    {
        step: '1',
        title: 'Sign in',
        text: 'Use your university credentials to access the portal.'
    },
    {
        step: '2',
        title: 'Register a complaint',
        text: 'Describe the issue and submit it to the responsible department.'
    },
    {
        step: '3',
        title: 'Track progress',
        text: 'Monitor status updates as your complaint moves through review.'
    },
    {
        step: '4',
        title: 'Receive an update',
        text: 'Get the outcome or next steps from the assigned team.'
    }
];

const STATS_REFRESH_MS = 60_000;

function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

export function HomePage() {
    const [loginOpen, setLoginOpen] = useState(false);
    const [adminLoginOpen, setAdminLoginOpen] = useState(false);
    const [adminLoginMode, setAdminLoginMode] = useState('admin');
    const [mobileNav, setMobileNav] = useState(false);
    const [stats, setStats] = useState(null);
    const [statsError, setStatsError] = useState('');
    const [statsLoading, setStatsLoading] = useState(true);
    const [loginPostPath, setLoginPostPath] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const openLogin = useCallback(
        (postPath = null) => {
            setLoginPostPath(postPath);
            setLoginOpen(true);
            setSearchParams({ login: '1' }, { replace: true });
        },
        [setSearchParams]
    );

    const closeLogin = useCallback(() => {
        setLoginOpen(false);
        setLoginPostPath(null);
        if (searchParams.get('login')) {
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const openAdminLogin = useCallback(
        (mode = 'admin') => {
            setAdminLoginMode(mode);
            setAdminLoginOpen(true);
            setSearchParams(
                mode === 'management' ? { management: '1' } : { admin: '1' },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const closeAdminLogin = useCallback(() => {
        setAdminLoginOpen(false);
        if (
            searchParams.get('admin') ||
            searchParams.get('management')
        ) {
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const loadStats = useCallback(async () => {
        try {
            const data = await complaintsApi.getPublicStats();
            setStats(data.stats);
            setStatsError('');
        } catch (err) {
            setStatsError(err.message || 'Unable to load statistics');
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            const modalParam =
                searchParams.get('login') ||
                searchParams.get('admin') ||
                searchParams.get('management');
            if (modalParam) {
                setLoginOpen(false);
                setAdminLoginOpen(false);
                setSearchParams({}, { replace: true });
                navigate(getPostLoginPath(user), { replace: true, state: null });
            }
            return;
        }

        const loginParam = searchParams.get('login');
        const wantsLogin =
            loginParam === '1' ||
            loginParam === 'true' ||
            (location.state?.from && !isAuthenticated);

        if (wantsLogin) {
            setLoginOpen(true);
        } else if (!loginParam) {
            setLoginOpen(false);
        }
        if (searchParams.get('admin') === '1') {
            setAdminLoginMode('admin');
            setAdminLoginOpen(true);
        }
        if (searchParams.get('management') === '1') {
            setAdminLoginMode('management');
            setAdminLoginOpen(true);
        }
    }, [
        searchParams,
        location.state,
        isAuthenticated,
        user,
        navigate,
        setSearchParams
    ]);

    useEffect(() => {
        loadStats();
        const id = window.setInterval(loadStats, STATS_REFRESH_MS);
        return () => window.clearInterval(id);
    }, [loadStats]);

    const handleLoginClick = () => {
        if (isAuthenticated && user) {
            navigate(getPostLoginPath(user));
            return;
        }
        openLogin();
    };

    const loginButtonLabel = () => {
        if (!isAuthenticated) return 'Login';
        if (user?.role === 'student') return 'My Profile';
        return 'Open Portal';
    };

    const handleAdminLoginClick = () => {
        if (isAuthenticated && user) {
            navigate(getPostLoginPath(user));
            return;
        }
        openAdminLogin('admin');
    };

    const adminButtonLabel = () => {
        if (!isAuthenticated || !user) return 'Login as Admin';
        return 'Staff Portal';
    };

    const handleSubmitComplaint = () => {
        if (isAuthenticated && user?.role === 'student') {
            navigate('/student/complaints/register');
            return;
        }
        if (isAuthenticated && user) {
            navigate(getPostLoginPath(user));
            return;
        }
        openLogin('/student/complaints/register');
    };

    const year = new Date().getFullYear();

    return (
        <div className="public-home">
            <header className="public-header">
                <div className="public-header__inner">
                    <a
                        href="#home"
                        className="public-brand"
                        onClick={(e) => {
                            e.preventDefault();
                            scrollToId('home');
                        }}
                    >
                        <span className="public-brand__shield" aria-hidden="true">
                            SB
                        </span>
                        <span className="public-brand__text">
                            University Complaint Management System
                        </span>
                    </a>

                    <PublicHeaderActions onRequestLogin={openLogin} />

                    <button
                        type="button"
                        className="public-nav-toggle"
                        aria-expanded={mobileNav}
                        aria-label="Toggle menu"
                        onClick={() => setMobileNav((v) => !v)}
                    >
                        <IconMenu />
                    </button>

                    <nav
                        className={`public-nav${mobileNav ? ' is-open' : ''}`}
                        aria-label="Main"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                scrollToId('home');
                                setMobileNav(false);
                            }}
                        >
                            Home
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                scrollToId('about');
                                setMobileNav(false);
                            }}
                        >
                            About
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                scrollToId('how-it-works');
                                setMobileNav(false);
                            }}
                        >
                            How It Works
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                scrollToId('contact');
                                setMobileNav(false);
                            }}
                        >
                            Contact
                        </button>
                        <button
                            type="button"
                            className="public-header__admin public-header__auth-btn"
                            onClick={() => {
                                setMobileNav(false);
                                handleAdminLoginClick();
                            }}
                        >
                            <UserCircle size={18} strokeWidth={1.75} aria-hidden />
                            {adminButtonLabel()}
                        </button>
                        <button
                            type="button"
                            className="public-header__login public-header__auth-btn"
                            onClick={() => {
                                setMobileNav(false);
                                handleLoginClick();
                            }}
                        >
                            <UserCircle size={18} strokeWidth={1.75} aria-hidden />
                            {loginButtonLabel()}
                        </button>
                    </nav>
                </div>
            </header>

            <main>
                <section id="home" className="hero hero--split surface-pattern-subtle">
                    <div className="hero__split">
                        <div className="hero__content">
                            <p className="section-label">University CMS</p>
                            <h1 className="type-display">
                                A better campus starts with being heard.
                            </h1>
                            <p className="hero__lead type-body-lg">
                                Report issues, track progress, and access
                                university support through one simple, transparent
                                platform.
                            </p>
                            <div className="hero__actions hero__actions--triple">
                                <button
                                    type="button"
                                    className="btn btn--primary btn--with-icon cms-btn-reflect"
                                    onClick={handleLoginClick}
                                >
                                    <UserCircle
                                        size={18}
                                        strokeWidth={1.75}
                                        aria-hidden
                                    />
                                    {loginButtonLabel()}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--admin btn--with-icon cms-btn-reflect"
                                    onClick={handleAdminLoginClick}
                                >
                                    <UserCircle
                                        size={18}
                                        strokeWidth={1.75}
                                        aria-hidden
                                    />
                                    {adminButtonLabel()}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--outline btn--with-icon cms-btn-reflect"
                                    onClick={handleSubmitComplaint}
                                >
                                    Submit a New Complaint
                                    <ArrowRight
                                        size={18}
                                        strokeWidth={1.75}
                                        aria-hidden
                                    />
                                </button>
                            </div>
                        </div>
                        <div className="hero__aside">
                            <HeroWorkflowOrbit />
                        </div>
                    </div>
                </section>

                <section
                    className="stats-strip stats-strip--live"
                    aria-label="Complaint statistics"
                >
                    {statsLoading ? (
                        <p className="stats-strip__status">Loading statistics…</p>
                    ) : statsError ? (
                        <p className="stats-strip__status stats-strip__status--error">
                            {statsError}
                            <button type="button" onClick={loadStats}>
                                Retry
                            </button>
                        </p>
                    ) : (
                        <>
                            <div className="stats-strip__item">
                                <strong>{stats?.registered ?? 0}</strong>
                                <span>Complaints Registered</span>
                            </div>
                            <div className="stats-strip__item">
                                <strong>{stats?.resolved ?? 0}</strong>
                                <span>Complaints Resolved</span>
                            </div>
                        </>
                    )}
                </section>

                <section className="features" aria-labelledby="features-title">
                    <h2 id="features-title" className="visually-hidden">
                        Features
                    </h2>
                    <div className="features__grid">
                        {FEATURES.map((f) => (
                            <article key={f.title} className="feature-card">
                                <span className="feature-card__icon">
                                    <AppIcon name={f.iconKey} size="lg" />
                                </span>
                                <h3>{f.title}</h3>
                                <p>{f.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section
                    id="about"
                    className="about-section"
                    aria-labelledby="about-title"
                >
                    <p className="section-label">About the platform</p>
                    <h2 id="about-title">About</h2>
                    <p className="about-section__lead">
                        The University Complaint Management System connects
                        students and staff with the right departments to report
                        concerns, follow progress, and support a responsive
                        campus environment.
                    </p>
                    <p>
                        It provides one secure channel to register issues—from
                        academic and administrative matters to facilities and
                        student services—and sends each complaint to the team
                        responsible for review, action, and closure.
                    </p>
                    <ul className="about-section__list">
                        <li>
                            Role-based access for students, faculty, and
                            university leadership
                        </li>
                        <li>
                            Clear status updates from registration through
                            resolution
                        </li>
                        <li>
                            Escalation paths that involve HODs, deans, and the
                            Vice Chancellor when needed
                        </li>
                        <li>
                            Dashboards that help offices prioritise work and
                            spot recurring themes across departments
                        </li>
                    </ul>
                    <p>
                        The platform is designed to keep the process fair,
                        documented, and timely so every concern is heard and
                        handled in line with university policy.
                    </p>
                </section>

                <section
                    id="how-it-works"
                    className="how-section"
                    aria-labelledby="how-title"
                >
                    <p className="section-label">Process</p>
                    <h2 id="how-title">How It Works</h2>
                    <ol className="how-steps">
                        {STEPS.map((s) => (
                            <li key={s.step}>
                                <span className="how-steps__num">{s.step}</span>
                                <div>
                                    <h3>{s.title}</h3>
                                    <p>{s.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <PublicContactSection />
            </main>

            <footer className="public-footer">
                <div className="public-footer__inner">
                    <div className="public-footer__brand-block">
                        <p className="public-footer__brand">
                            University Complaint Management System
                        </p>
                        <p className="public-footer__org">
                            {DEMO_CONTACT.institution}
                        </p>
                    </div>
                    <nav aria-label="Footer">
                        <button type="button" onClick={() => scrollToId('home')}>
                            Home
                        </button>
                        <button type="button" onClick={() => scrollToId('about')}>
                            About
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToId('how-it-works')}
                        >
                            How It Works
                        </button>
                        <button type="button" onClick={() => scrollToId('contact')}>
                            Contact
                        </button>
                    </nav>
                    <div className="public-footer__meta">
                        <p className="public-footer__copy">
                            © {year} University Complaint Management System
                        </p>
                        <p className="public-footer__demo">Demo site — temporary contact</p>
                    </div>
                </div>
            </footer>

            <LoginModal
                open={loginOpen}
                onClose={closeLogin}
                postLoginPath={loginPostPath}
            />
            <AdminAuthModal
                open={adminLoginOpen}
                onClose={closeAdminLogin}
                initialMode={adminLoginMode}
            />
        </div>
    );
}
