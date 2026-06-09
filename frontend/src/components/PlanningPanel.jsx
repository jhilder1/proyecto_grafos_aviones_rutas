// PlanningPanel.jsx
// UI controls for building planning requests and triggering route algorithms.
// Handles user inputs for origin, destination, criteria and submits requests
// to the backend planning endpoints.
import React, { useState } from 'react';
import { planMaximizeDestinations, planBestRoute } from '../services/api';

const TRANSPORT_TYPES = ['Avion Comercial', 'Avion Regional', 'Helice'];
const CRITERIA = [
    { key: 'distancia', label: 'Distancia' },
    { key: 'costo', label: 'Costo (USD)' },
    { key: 'tiempo', label: 'Tiempo' }
];

const PlanningPanel = ({ airports, onResults, onHighlightRoute, onStartFreeExploration }) => {
    const [mode, setMode] = useState('maximize'); // 'maximize', 'route', 'explore'
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

    // Free exploration form
    const [exploreOrigen, setExploreOrigen] = useState('');
    const [explorePresupuesto, setExplorePresupuesto] = useState(3000);
    const [exploreTiempo, setExploreTiempo] = useState(72);

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
            if (result.resultados?.length > 0 && result.resultados[0].ruta?.length > 1) {
                onHighlightRoute(result.resultados[0].ruta);
            }
        } catch (err) {
            setError(err.message || 'Error en la planificación');
        }
        setLoading(false);
    };

    const handleStartExploration = async () => {
        if (!exploreOrigen) { setError('Selecciona un aeropuerto de origen'); return; }
        setError('');
        setLoading(true);
        try {
            const args = { origen: exploreOrigen, presupuesto: Number(explorePresupuesto), tiempoDisponible: Number(exploreTiempo) };
            const result = await planMaximizeDestinations(args);
            let suggested = [];
            if (result && result.itinerario_presupuesto && result.itinerario_presupuesto.ruta) {
                suggested = result.itinerario_presupuesto.ruta;
            }
            onStartFreeExploration(exploreOrigen, Number(explorePresupuesto), Number(exploreTiempo), suggested);
        } catch (err) {
            setError(err.message || 'Error calculando sugerencia inicial');
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
                <button
                    className={`mode-tab ${mode === 'explore' ? 'active' : ''}`}
                    onClick={() => setMode('explore')}
                    style={{ color: mode === 'explore' ? '#FFD700' : undefined, borderColor: mode === 'explore' ? '#FFD700' : undefined }}
                >
                    🧭 Explorar
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

            {/* Free exploration form (R2.3) */}
            {mode === 'explore' && (
                <div className="planning-form">
                    <div className="explore-info" style={{ 
                        background: 'rgba(255, 215, 0, 0.08)', 
                        border: '1px solid rgba(255, 215, 0, 0.2)',
                        borderRadius: '8px', 
                        padding: '10px', 
                        marginBottom: '12px',
                        fontSize: '12px',
                        color: '#FFD700',
                        lineHeight: '1.5'
                    }}>
                        🧭 <strong>Exploración Paso a Paso</strong>: Tú decides el destino en cada parada. 
                        El sistema gestiona tu presupuesto dinámicamente: actividades, trabajos, 
                        obligaciones biológicas y rutas subsidiadas.
                    </div>
                    <div className="form-group">
                        <label>Aeropuerto de Origen</label>
                        <select value={exploreOrigen} onChange={e => setExploreOrigen(e.target.value)}>
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
                                value={explorePresupuesto}
                                onChange={e => setExplorePresupuesto(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Tiempo (horas)</label>
                            <input
                                type="number"
                                min="0"
                                value={exploreTiempo}
                                onChange={e => setExploreTiempo(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Shared filters (for maximize and route modes) */}
            {mode !== 'explore' && (
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
            )}

            {error && <div className="planning-error">{error}</div>}

            <button
                className="planning-submit"
                onClick={
                    mode === 'maximize' ? handleMaximize : 
                    mode === 'route' ? handleBestRoute : 
                    handleStartExploration
                }
                disabled={loading}
                style={mode === 'explore' ? { background: 'linear-gradient(135deg, #FFD700, #FF8C00)', color: '#000' } : {}}
            >
                {loading ? 'Calculando...' : 
                 mode === 'maximize' ? '🚀 Calcular Itinerarios' : 
                 mode === 'route' ? '🔍 Buscar Mejor Ruta' :
                 '🧭 Iniciar Exploración'}
            </button>
        </div>
    );
};

export default PlanningPanel;
