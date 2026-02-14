import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Audit, AuditCreate } from '../services/auditService';
import { getAudits, createAudit as apiCreateAudit, updateAudit as apiUpdateAudit } from '../services/auditService';

interface AuditContextType {
    audits: Audit[];
    loading: boolean;
    error: string | null;
    loadAudits: () => Promise<void>;
    addAudit: (data: AuditCreate) => Promise<Audit>;
    editAudit: (id: number, data: Partial<Audit>) => Promise<void>;
}

const AuditContext = createContext<AuditContextType | null>(null);

export const useAudits = (): AuditContextType => {
    const context = useContext(AuditContext);
    if (!context) {
        throw new Error('useAudits must be used within an AuditProvider');
    }
    return context;
};

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [audits, setAudits] = useState<Audit[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadAudits = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAudits();
            setAudits(data);
        } catch (err) {
            console.error('Failed to load audits', err);
            setError('Prüfungen konnten nicht geladen werden');
        } finally {
            setLoading(false);
        }
    }, []);

    const addAudit = useCallback(async (data: AuditCreate): Promise<Audit> => {
        const audit = await apiCreateAudit(data);
        setAudits(prev => [audit, ...prev]);
        return audit;
    }, []);

    const editAudit = useCallback(async (id: number, data: Partial<Audit>) => {
        const updated = await apiUpdateAudit(id, data);
        setAudits(prev => prev.map(a => a.id === id ? updated : a));
    }, []);

    useEffect(() => {
        loadAudits();
    }, [loadAudits]);

    return (
        <AuditContext.Provider value={{ audits, loading, error, loadAudits, addAudit, editAudit }}>
            {children}
        </AuditContext.Provider>
    );
};
