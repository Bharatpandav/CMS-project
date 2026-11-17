import { useEffect, useMemo, useState } from 'react';
import { AppIcon } from './AppIcon.jsx';

const STAGES = [
    {
        key: 'submit',
        label: 'Student submission',
        short: 'Submit',
        icon: 'file-plus',
        accent: 'teal'
    },
    {
        key: 'hod',
        label: 'HOD review',
        short: 'Review',
        icon: 'clipboard-list',
        accent: 'blue'
    },
    {
        key: 'assign',
        label: 'Assignment / escalation',
        short: 'Route',
        icon: 'arrow-up',
        accent: 'indigo'
    },
    {
        key: 'resolve',
        label: 'Resolution',
        short: 'Resolve',
        icon: 'badge-check',
        accent: 'green'
    },
    {
        key: 'close',
        label: 'Closure',
        short: 'Close',
        icon: 'circle-check',
        accent: 'navy'
    }
];

const STAGE_COUNT = STAGES.length;
const STEP_DEG = 360 / STAGE_COUNT;
const RING_RADIUS = 128;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const STEP_MS = 2600;

export function HeroWorkflowOrbit() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [isPhoneViewport, setIsPhoneViewport] = useState(false);

    useEffect(() => {
        const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const phoneMq = window.matchMedia('(max-width: 767px)');
        const apply = () => {
            setReduceMotion(motionMq.matches);
            setIsPhoneViewport(phoneMq.matches);
        };
        apply();
        motionMq.addEventListener('change', apply);
        phoneMq.addEventListener('change', apply);
        return () => {
            motionMq.removeEventListener('change', apply);
            phoneMq.removeEventListener('change', apply);
        };
    }, []);

    useEffect(() => {
        if (reduceMotion || isPhoneViewport) return undefined;

        const id = window.setInterval(() => {
            setActiveIndex((i) => (i + 1) % STAGE_COUNT);
        }, STEP_MS);

        return () => window.clearInterval(id);
    }, [reduceMotion, isPhoneViewport]);

    const orbitAngle = -90 + activeIndex * STEP_DEG;

    const progressDash = useMemo(() => {
        const traveled =
            ((activeIndex + 1) / STAGE_COUNT) * RING_CIRCUMFERENCE;
        return `${traveled} ${RING_CIRCUMFERENCE}`;
    }, [activeIndex]);

    const chaseDash = useMemo(() => {
        const segment = RING_CIRCUMFERENCE / STAGE_COUNT;
        return `${segment * 0.55} ${RING_CIRCUMFERENCE}`;
    }, []);

    const chaseOffset = useMemo(() => {
        const segment = RING_CIRCUMFERENCE / STAGE_COUNT;
        return -activeIndex * segment;
    }, [activeIndex]);

    return (
        <figure
            className="hero-workflow"
            aria-labelledby="hero-workflow-title"
        >
            <figcaption id="hero-workflow-title" className="visually-hidden">
                Complaint lifecycle: student submission, HOD review, assignment
                or escalation, resolution, and closure.
            </figcaption>

            <div
                className="hero-workflow__canvas"
                style={{
                    '--stage-count': STAGE_COUNT,
                    '--active-index': activeIndex,
                    '--orbit-angle': `${orbitAngle}deg`,
                    '--step-ms': `${STEP_MS}ms`
                }}
            >
                <svg
                    className="hero-workflow__ring"
                    viewBox="0 0 320 320"
                    aria-hidden="true"
                >
                    <circle
                        className="hero-workflow__ring-track"
                        cx="160"
                        cy="160"
                        r={RING_RADIUS}
                        fill="none"
                    />
                    <circle
                        className="hero-workflow__ring-progress"
                        cx="160"
                        cy="160"
                        r={RING_RADIUS}
                        fill="none"
                        strokeDasharray={progressDash}
                        strokeDashoffset="0"
                    />
                    <circle
                        className="hero-workflow__ring-chase"
                        cx="160"
                        cy="160"
                        r={RING_RADIUS}
                        fill="none"
                        strokeDasharray={chaseDash}
                        strokeDashoffset={chaseOffset}
                        transform="rotate(-90 160 160)"
                    />
                </svg>

                <div className="hero-workflow__core" aria-hidden="true">
                    <span className="hero-workflow__core-icon">
                        <AppIcon name="landmark" size="lg" />
                    </span>
                    <span className="hero-workflow__core-label">
                        University CMS
                    </span>
                </div>

                <ol className="hero-workflow__stages">
                    {STAGES.map((stage, index) => (
                        <li
                            key={stage.key}
                            className={`hero-workflow__stage hero-workflow__stage--${stage.accent}${
                                activeIndex === index
                                    ? ' hero-workflow__stage--active'
                                    : ''
                            }`}
                            style={{
                                '--stage-index': index,
                                '--stage-count': STAGE_COUNT
                            }}
                        >
                            <span className="hero-workflow__stage-icon">
                                <AppIcon name={stage.icon} size="sm" />
                            </span>
                            <span className="hero-workflow__stage-label">
                                {stage.short}
                            </span>
                            <span className="hero-workflow__stage-tooltip">
                                {stage.label}
                            </span>
                        </li>
                    ))}
                </ol>

                <span className="hero-workflow__dot" aria-hidden="true" />
            </div>
        </figure>
    );
}