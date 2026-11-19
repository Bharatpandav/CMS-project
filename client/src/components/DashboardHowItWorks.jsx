export function DashboardHowItWorks({ steps, titleId = 'dashboard-how-title' }) {
    if (!steps?.length) {
        return null;
    }

    return (
        <section className="unified-how" aria-labelledby={titleId}>
            <h2 id={titleId}>How it works</h2>
            <ol className="unified-how__steps">
                {steps.map((step, index) => (
                    <li key={step.title} className="unified-how__step">
                        <span className="unified-how__step-num">
                            {index + 1}
                        </span>
                        <h3>{step.title}</h3>
                        {step.body}
                    </li>
                ))}
            </ol>
        </section>
    );
}