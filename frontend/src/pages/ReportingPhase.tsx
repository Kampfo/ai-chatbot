import { useOutletContext } from 'react-router-dom';
import { FileBarChart } from 'lucide-react';
import type { Audit } from '../services/auditService';
import { updateAuditStatus } from '../services/auditService';

interface AuditDetailContext {
    audit: Audit;
    setAudit: (audit: Audit) => void;
}

const ReportingPhase: React.FC = () => {
    const { audit, setAudit } = useOutletContext<AuditDetailContext>();

    const handleAdvanceToTracking = async () => {
        try {
            const updated = await updateAuditStatus(audit.id, 'MASSNAHMENVERFOLGUNG');
            setAudit(updated);
        } catch (error) {
            console.error('Failed to advance status', error);
        }
    };

    return (
        <div className="p-8 max-w-4xl">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Berichterstattung</h2>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <FileBarChart className="w-16 h-16 mx-auto text-blue-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Berichts-Generierung</h3>
                <p className="text-gray-500 mb-6">
                    Die automatische Berichtsgenerierung mit KI-Unterstützung wird in einer zukünftigen Version verfügbar sein.
                    Exportieren Sie Ihre Feststellungen und Maßnahmen vorerst manuell.
                </p>
            </div>

            {audit.status === 'BERICHTERSTATTUNG' && (
                <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">Bericht abgeschlossen?</h3>
                    <p className="text-sm text-blue-600 mb-4">
                        Wechseln Sie zur Maßnahmenverfolgung, um die Umsetzung der empfohlenen Maßnahmen zu überwachen.
                    </p>
                    <button
                        onClick={handleAdvanceToTracking}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Zur Maßnahmenverfolgung wechseln
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReportingPhase;
