import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { getAudits } from '../services/auditService';
import { vi, describe, it, expect } from 'vitest';

// Mock the service
vi.mock('../services/auditService', () => ({
    getAudits: vi.fn(),
    createAudit: vi.fn(),
}));

describe('Dashboard', () => {
    it('renders dashboard title', async () => {
        (getAudits as any).mockResolvedValue([]);
        render(<Dashboard />);
        expect(screen.getByText('Audit Dashboard')).toBeInTheDocument();
    });

    it('renders audits list', async () => {
        const mockAudits = [
            { id: 1, title: 'Test Audit 1', description: 'Desc 1', status: 'PLANNED', created_at: new Date().toISOString() },
            { id: 2, title: 'Test Audit 2', description: 'Desc 2', status: 'IN_PROGRESS', created_at: new Date().toISOString() },
        ];
        (getAudits as any).mockResolvedValue(mockAudits);

        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Test Audit 1')).toBeInTheDocument();
            expect(screen.getByText('Test Audit 2')).toBeInTheDocument();
        });
    });
});
