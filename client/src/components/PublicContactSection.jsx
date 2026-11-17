import { AppIcon } from './AppIcon.jsx';
import { DEMO_CONTACT } from '../constants/demoContact.js';

const CONTACT_ITEMS = [
    {
        key: 'address',
        icon: 'map-pin',
        label: 'Address',
        content: DEMO_CONTACT.address
    },
    {
        key: 'phone',
        icon: 'phone',
        label: 'Phone',
        href: DEMO_CONTACT.phoneHref,
        content: DEMO_CONTACT.phone
    },
    {
        key: 'email',
        icon: 'mail',
        label: 'Email',
        href: DEMO_CONTACT.emailHref,
        content: DEMO_CONTACT.email
    },
    {
        key: 'website',
        icon: 'globe',
        label: 'Website',
        href: DEMO_CONTACT.websiteHref,
        content: DEMO_CONTACT.websiteLabel,
        external: true
    }
];

export function PublicContactSection() {
    return (
        <section id="contact" className="contact-section">
            <div className="contact-section__intro">
                <p className="section-label">Support</p>
                <h2>Contact</h2>
                <p className="contact-section__lead">
                    For account access, use your university-provided URN and
                    password. For general enquiries, use the contact details
                    below.
                </p>
            </div>

            <article className="contact-section__card">
                <h3 className="contact-section__institution">
                    {DEMO_CONTACT.institution}
                </h3>
                <ul className="contact-section__list">
                    {CONTACT_ITEMS.map((item) => (
                        <li key={item.key} className="contact-section__item">
                            <span
                                className="contact-section__icon"
                                aria-hidden="true"
                            >
                                <AppIcon name={item.icon} size="md" />
                            </span>
                            <div className="contact-section__body">
                                <span className="contact-section__item-label">
                                    {item.label}
                                </span>
                                {item.href ? (
                                    <a
                                        className="contact-section__link"
                                        href={item.href}
                                        {...(item.external
                                            ? {
                                                  target: '_blank',
                                                  rel: 'noopener noreferrer'
                                              }
                                            : {})}
                                    >
                                        {item.content}
                                    </a>
                                ) : (
                                    <p className="contact-section__text">
                                        {item.content}
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </article>
        </section>
    );
}