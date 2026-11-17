import { Component } from 'react';

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, message: '' };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            message: (error?.message || '').trim() || 'An unexpected error occurred.'
        };
    }

    componentDidCatch(error, info) {
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary]', error, info?.componentStack);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    role="alert"
                    style={{ padding: '2rem', maxWidth: '28rem', margin: '2rem auto' }}
                >
                    <h1 style={{ fontSize: '1.1rem' }}>Something went wrong</h1>
                    <p style={{ margin: '0.75rem 0' }}>{this.state.message}</p>
                    <button type="button" onClick={() => window.location.reload()}>
                        Reload page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}