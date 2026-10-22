import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { complaintsApi } from '../api/client.js';
import { AdminAuthModal } from '../components/AdminAuthModal.jsx';
import { LoginModal } from '../components/LoginModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getPostLoginPath } from '../utils/roleRedirect.js';
import { canAccessManagementPortal } from '../utils/managementAccess.js';
import { getManagementDashboardPath } from '../utils/managementAccess.js';
import { isAdminStaffRole } from '../utils/staffRoles.js';
import { AppIcon } from '../components/AppIcon.jsx';
import { IconMenu } from '../components/icons.jsx';
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
    const [deptCount, setDeptCount] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const openLogin = useCallback(() => {
        setLoginOpen(true);
        setSearchParams({ login: '1' }, { replace: true });
    }, [setSearchParams]);

    const closeLogin = useCallback(() => {
        setLoginOpen(false);
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

    useEffect(() => {
        if (searchParams.get('login') === '1') {
            setLoginOpen(true);
        }
        if (searchParams.get('admin') === '1') {
            openAdminLogin('admin');
        }
        if (searchParams.get('management') === '1') {
            openAdminLogin('management');
        }
    }, [searchParams, openAdminLogin]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await complaintsApi.getCategories();
                const departments = new Set(
                    (data.categories || [])
                        .map((c) => c.targetDepartment)
                        .filter(Boolean)
                );
                if (!cancelled) setDeptCount(departments.size);
            } catch {
                if (!cancelled) setDeptCount(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleLoginClick = () => {
        if (isAuthenticated && user) {
            navigate(getPostLoginPath(user));
            return;
        }
        openLogin();
    };

    const handleAdminLoginClick = () => {
        if (isAuthenticated && user) {
            if (canAccessManagementPortal(user.role)) {
                navigate(getManagementDashboardPath());
                return;
            }
            if (isAdminStaffRole(user.role)) {
                navigate(getPostLoginPath(user));
                return;
            }
        }
        openAdminLogin('admin');
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
                            className="public-header__admin"
                            onClick={() => {
                                setMobileNav(false);
                                handleAdminLoginClick();
                            }}
                        >
                            Login as Admin
                        </button>
                        <button
                            type="button"
                            className="public-header__login"
                            onClick={() => {
                                setMobileNav(false);
                                handleLoginClick();
                            }}
                        >
                            {isAuthenticated ? 'Open Portal' : 'Login'}
                        </button>
                    </nav>
                </div>
            </header>

            <main>
                <section id="home" className="hero surface-pattern-subtle">
                    <div className="hero__content">
                        <p className="section-label">University CMS</p>
                        <h1 className="type-display">
                            A better campus starts with being heard.
                        </h1>
                        <p className="hero__lead type-body-lg">
                            Report issues, track progress, and access university
                            support through one simple, transparent platform.
                        </p>
                        <div className="hero__actions">
                            <button
                                type="button"
                                className="btn btn--primary"
                                onClick={handleLoginClick}
                            >
                                {isAuthenticated ? 'Open portal' : 'Login'}
                            </button>
                            <button
                                type="button"
                                className="btn btn--outline"
                                onClick={() => scrollToId('how-it-works')}
                            >
                                Learn More
                            </button>
                            <button
                                type="button"
                                className="btn btn--admin"
                                onClick={handleAdminLoginClick}
                            >
                                Login as Admin
                            </button>
                        </div>
                    </div>
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

                {deptCount !== null ? (
                    <section
                        className="stats-strip stats-strip--minimal"
                        aria-label="Platform overview"
                    >
                        <div className="stats-strip__item">
                            <strong>{deptCount}</strong>
                            <span>
                                Service departments mapped from active
                                categories
                            </span>
                        </div>
                    </section>
                ) : null}

                <section
                    id="about"
                    className="about-section"
                >
                    <p className="section-label">About the platform</p>
                    <h2>About</h2>
                    <p>
                        The University Complaint Management System connects
                        students and staff with the right departments to report
                        concerns, follow progress, and support a responsive
                        campus environment.
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

                <section id="contact" className="contact-section">
                    <p className="section-label">Support</p>
                    <h2>Contact</h2>
                    <p>
                        For account access, use your university-provided URN
                        and password. For technical support, contact your
                        campus IT or student affairs office through official
                        university channels.
                    </p>
                </section>
            </main>

            <footer className="public-footer">
                <div className="public-footer__inner">
                    <p className="public-footer__brand">
                        University Complaint Management System
                    </p>
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
                    <p className="public-footer__copy">
                        © {year} University Complaint Management System
                    </p>
                </div>
            </footer>

            <LoginModal open={loginOpen} onClose={closeLogin} />
            <AdminAuthModal
                open={adminLoginOpen}
                onClose={closeAdminLogin}
                initialMode={adminLoginMode}
            />
        </div>
    );
}
