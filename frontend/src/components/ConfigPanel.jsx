import React, { useState, useEffect } from 'react';
import { updateConfig } from '../services/api';

const ConfigPanel = ({ config, onClose, onSaveComplete }) => {
    const [aeronaves, setAeronaves] = useState({
        'Avion Comercial': { costoKm: 0.18, tiempoKm: 0.7 },
        'Avion Regional': { costoKm: 0.25, tiempoKm: 1.1 },
        'Helice': { costoKm: 0.12, tiempoKm: 2.5 }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (config && config.aeronaves) {
            // Merge existing config with defaults
            setAeronaves(prev => ({
                ...prev,
                ...config.aeronaves
            }));
        }
    }, [config]);

    const handleChange = (tipo, campo, valor) => {
        setAeronaves(prev => ({
            ...prev,
            [tipo]: {
                ...prev[tipo],
                [campo]: parseFloat(valor) || 0
            }
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            await updateConfig(aeronaves);
            onSaveComplete(); // Close and reload data
        } catch (err) {
            setError("Error al guardar la configuración.");
            console.error(err);
        }
        setLoading(false);
    };

    return (
        <div className="report-overlay" style={{ zIndex: 2000 }}>
            <div className="report-panel animate-slide-in" style={{ maxWidth: '600px' }}>
                <div className="report-header">
                    <h2>⚙️ Configuración de Aeronaves</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <p style={{ marginBottom: '20px', color: '#A0A0B0' }}>
                    Edita los valores de costo y tiempo por kilómetro para cada tipo de aeronave. 
                    Estos cambios sobrescribirán el archivo JSON.
                </p>

                <div className="config-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {Object.keys(aeronaves).map(tipo => (
                        <div key={tipo} style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#FFD700' }}>{tipo}</h4>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <label style={{ fontSize: '12px', marginBottom: '5px' }}>Costo (USD / km)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={aeronaves[tipo].costoKm}
                                        onChange={(e) => handleChange(tipo, 'costoKm', e.target.value)}
                                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#1A1A24', color: 'white' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <label style={{ fontSize: '12px', marginBottom: '5px' }}>Tiempo (min / km)</label>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        value={aeronaves[tipo].tiempoKm}
                                        onChange={(e) => handleChange(tipo, 'tiempoKm', e.target.value)}
                                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#1A1A24', color: 'white' }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {error && <p className="error-text" style={{ marginTop: '15px' }}>{error}</p>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                    <button className="btn-secondary" onClick={onClose} disabled={loading} style={{ padding: '10px 20px' }}>Cancelar</button>
                    <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ padding: '10px 20px', background: '#FF3366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        {loading ? 'Guardando...' : 'Guardar y Recargar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigPanel;
