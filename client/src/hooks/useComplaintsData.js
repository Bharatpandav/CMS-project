import { useCallback, useEffect, useState } from 'react';
import { complaintsApi } from '../api/client.js';

export function useComplaintsData({
    limit = 50,
    myComplaints,
    publicFeed,
    status
} = {}) {
    const [complaints, setComplaints] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: 1,
                limit: String(limit)
            };
            if (publicFeed) {
                params.publicFeed = 'true';
            } else if (myComplaints) {
                params.myComplaints = 'true';
            }
            if (status) {
                params.status = status;
            }
            const data = await complaintsApi.list(params);
            setComplaints(data.complaints || []);
            setTotal(data.total ?? data.complaints?.length ?? 0);
        } catch (err) {
            setError(err.message || 'Failed to load complaints');
        } finally {
            setLoading(false);
        }
    }, [limit, myComplaints, publicFeed, status]);

    useEffect(() => {
        load();
    }, [load]);

    return { complaints, total, loading, error, reload: load };
}

export function useCategoriesData() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await complaintsApi.getCategories();
            setCategories(data.categories || []);
        } catch (err) {
            setError(err.message || 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const departments = [
        ...new Set(
            categories
                .map((c) => c.targetDepartment)
                .filter(Boolean)
        )
    ];

    return {
        categories,
        departments,
        loading,
        error,
        reload: load
    };
}
