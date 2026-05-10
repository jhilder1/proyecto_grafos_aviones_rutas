import React, { useState } from 'react';
import { planMaximizeDestinations, planBestRoute } from '../services/api';

const TRANSPORT_TYPES = ['Avion Comercial', 'Avion Regional', 'Helice'];
const CRITERIA = [
    { key: 'distancia', label: 'Distancia' },
    { key: 'costo', label: 'Costo (USD)' },
    { key: 'tiempo', label: 'Tiempo' }
];

const PlanningPanel = ({ airports, onResults, onHighlightRoute }) => {
    const [mode, setMode] = useState('maximize'); // 'maximize' or 'route'
    const [collapsed, setCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Maximize destinations form
    const [maxOrigen, setMaxOrigen] = useState('');
    const [presupuesto, setPresupuesto] = useState(2000);
    const [tiempoDisponible, setTiempoDisponible] = useState(48);

    // Best route form
    const [routeOrigen, setRouteOrigen] = useState('');
    const [routeDestino, setRouteDestino] = useState('');
    const [criterios, setCriterios] = useState(['distancia']);

    // Shared filters
    const [excluirSecundarios, setExcluirSecundarios] = useState(false);
    const [tiposTransporte, setTiposTransporte] = useState([...TRANSPORT_TYPES]);

    const toggleCriterio = (key) => {
        setCriterios(prev =>
            prev.includes(key)
                ? prev.filter(c => c !== key)
                : [...prev, key]
        );
    };

    const toggleTransporte = (tipo) => {
        setTiposTransporte(prev => {
            const next = prev.includes(tipo)
                ? prev.filter(t => t !== tipo)
                : [...prev, tipo];
            return next.length > 0 ? next : prev; // At least one required
        });
    };

    const handleMaximize = async () => {
        if (!maxOrigen) { setError('Selecciona un aeropuerto de origen'); return; }
        if (tiposTransporte.length === 0) { setError('Selecciona al menos un tipo de transporte'); return; }
        setError('');
        setLoading(true);
        try {
            const args = {
                origen: maxOrigen,
                presupuesto: Number(presupuesto),
                tiempoDisponible: Number(tiempoDisponible),
                excluirSecundarios,
                tiposTransporte
            };
            const result = await planMaximizeDestinations(args);
            onResults({ type: 'maximize', data: result, args });
            // Highlight the budget route by default
            if (result.itinerario_presupuesto?.ruta?.length > 1) {
                onHighlightRoute(result.itinerario_presupuesto.ruta);
            }
        } catch (err) {
            setError(err.message || 'Error en la planificación');
        }
        setLoading(false);
    };

    const handleBestRoute = async () => {
        if (!routeOrigen || !routeDestino) { setError('Selecciona origen y destino'); return; }
        if (routeOrigen === routeDestino) { setError('Origen y destino deben ser diferentes'); return; }
        if (criterios.length === 0) { setError('Selecciona al menos un criterio'); return; }
        if (tiposTransporte.length === 0) { setError('Selecciona al menos un tipo de transporte'); return; }
        setError('');
        setLoading(true);
        try {
            const args = {
                origen: routeOrigen,
                destino: routeDestino,
                criterios,
                excluirSecundarios,
                tiposTransporte
            };
            const result = await planBestRoute(args);
            onResults({ type: 'route', data: result, args });
            // Highlight first result route
            if (result.resultados?.length > 0 && result.resultados[0].ruta?.length > 1) {
                onHighlightRoute(result.resultados[0].ruta);
            }
        } catch (err) {
            setError(err.message || 'Error en la planificación');
        }
        setLoading(false);
    };

    if (collapsed) {
        return (
            <button
                className="planning-toggle-btn"
                onClick={() => setCollapsed(false)}
                title="Abrir panel de planificación"
            >
                🗺️
            </button>
        );
    }

    const sortedAirports = [...airports].sort((a, b) => a.id.localeCompare(b.id));

    return (
        <div className="planning-panel animate-slide-in">
            <div className="planning-header">
                <h3>🗺️ Planificación</h3>
                <button className="close-btn" onClick={() => setCollapsed(true)}>&minus;</button>
            </div>

            {/* Mode selector */}
            <div className="mode-tabs">
                <button
                    className={`mode-tab ${mode === 'maximize' ? 'active' : ''}`}
                    onClick={() => setMode('maximize')}
                >
                    Max Destinos
                </button>
                <button
                    className={`mode-tab ${mode === 'route' ? 'active' : ''}`}
                    onClick={() => setMode('route')}
                >
                    Mejor Ruta
                </button>
            </div>

            {/* Maximize destinations form */}
            {mode === 'maximize' && (
                <div className="planning-form">
                    <div className="form-group">
                        <label>Aeropuerto de Origen</label>
                        <select value={maxOrigen} onChange={e => setMaxOrigen(e.target.value)}>
                            <option value="">-- Seleccionar --</option>
                            {sortedAirports.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.id} - {a.nombre} ({a.ciudad})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Presupuesto (USD)</label>
                            <input
                                type="number"
                                min="0"
                                value={presupuesto}
                                onChange={e => setPresupuesto(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Tiempo (horas)</label>
                            <input
                                type="number"
                                min="0"
                                value={tiempoDisponible}
                                onChange={e => setTiempoDisponible(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Best route form */}
            {mode === 'route' && (
                <div className="planning-form">
                    <div className="form-group">
                        <label>Origen</label>
                        <select value={routeOrigen} onChange={e => setRouteOrigen(e.target.value)}>
                            <option value="">-- Seleccionar --</option>
                            {sortedAirports.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.id} - {a.nombre} ({a.ciudad})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Destino</label>
                        <select value={routeDestino} onChange={e => setRouteDestino(e.target.value)}>
                            <option value="">-- Seleccionar --</option>
                            {sortedAirports.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.id} - {a.nombre} ({a.ciudad})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Criterios de Optimización</label>
                        <div className="checkbox-group">
                            {CRITERIA.map(c => (
                                <label key={c.key} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={criterios.includes(c.key)}
                                        onChange={() => toggleCriterio(c.key)}
                                    />
                                    {c.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Shared filters */}
            <div className="planning-form" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '12px', marginTop: '4px' }}>
                <div className="form-group">
                    <label>Tipos de Transporte</label>
                    <div className="checkbox-group">
                        {TRANSPORT_TYPES.map(tipo => (
                            <label key={tipo} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={tiposTransporte.includes(tipo)}
                                    onChange={() => toggleTransporte(tipo)}
                                />
                                {tipo}
                            </label>
                        ))}
                    </div>
                </div>
                <label className="checkbox-label" style={{ marginTop: '4px' }}>
                    <input
                        type="checkbox"
                        checked={excluirSecundarios}
                        onChange={e => setExcluirSecundarios(e.target.checked)}
                    />
                    Excluir aeropuertos secundarios
                </label>
            </div>

            {error && <div className="planning-error">{error}</div>}

            <button
                className="planning-submit"
                onClick={mode === 'maximize' ? handleMaximize : handleBestRoute}
                disabled={loading}
            >
                {loading ? 'Calculando...' : mode === 'maximize' ? '🚀 Calcular Itinerarios' : '🔍 Buscar Mejor Ruta'}
            </button>
        </div>
    );
};

export default PlanningPanel;
