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
            <div className="report-panel config-panel animate-slide-in">
                <div className="report-header config-header">
                    <h2>⚙️ Configuración de Aeronaves</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <p className="config-description">
                    Edita los valores de costo y tiempo por kilómetro para cada tipo de aeronave. 
                    Estos cambios sobrescribirán el archivo JSON.
                </p>

                <div className="config-grid">
                    {Object.keys(aeronaves).map(tipo => (
                        <div key={tipo} className="config-card">
                            <h4>{tipo}</h4>
                            <div className="config-card-grid">
                                <div className="config-field">
                                    <label>Costo (USD / km)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={aeronaves[tipo].costoKm}
                                        onChange={(e) => handleChange(tipo, 'costoKm', e.target.value)}
                                    />
                                </div>
                                <div className="config-field">
                                    <label>Tiempo (min / km)</label>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        value={aeronaves[tipo].tiempoKm}
                                        onChange={(e) => handleChange(tipo, 'tiempoKm', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {error && <p className="error-text config-error">{error}</p>}

                <div className="config-actions">
                    <button className="config-btn config-btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
                    <button className="config-btn config-btn-primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar y Recargar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigPanel;
