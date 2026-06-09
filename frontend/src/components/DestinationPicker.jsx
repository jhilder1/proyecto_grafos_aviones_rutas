// DestinationPicker.jsx
// Step-by-step free exploration UI for selecting next destination from
// the current airport. Calls backend to fetch neighbor options and
// enforces budget/time rules before confirming a selection.
// Props: currentAirportId, airports, stats, config, visitedAirports, onSelectDestination, onFinishTrip
import React, { useState, useEffect } from 'react';
import { fetchAirportNeighbors } from '../services/api';

const DestinationPicker = ({ currentAirportId, airports, stats, config, visitedAirports, suggestedRoute, onSelectDestination, onFinishTrip }) => {
    const [neighbors, setNeighbors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDest, setSelectedDest] = useState(null);
    const [selectedAircraft, setSelectedAircraft] = useState(null);

    const currentAirport = airports.find(a => a.id === currentAirportId);
    const aircraftConfig = config?.aeronaves || {};

    useEffect(() => {
        const loadNeighbors = async () => {
            setLoading(true);
            try {
                const data = await fetchAirportNeighbors(currentAirportId);
                setNeighbors(data.destinos || []);
            } catch (err) {
                console.error("Error loading neighbors:", err);
                setNeighbors([]);
            }
            setLoading(false);
        };
        if (currentAirportId) loadNeighbors();
    }, [currentAirportId]);

    const handleSelectDest = (dest) => {
        setSelectedDest(dest);
        setSelectedAircraft(null);
    };

    const handleSelectAircraft = (opt, dest) => {
        // Regla del 20%: máximo 20% de la distancia TOTAL del viaje puede ser subsidiada
        const isSubsidized = dest.costoBase === 0;
        // Permitir el primer vuelo subsidiado sin importar la distancia, luego aplicar la regla estricta
        const baseDistance = Math.max(stats.distanciaTotal + dest.distanciaKm, 2000);
        const maxSubsidized = baseDistance * 0.2;
        const exceedsSubsidized = isSubsidized && stats.distanciaSubsidiada > 0 && (stats.distanciaSubsidiada + dest.distanciaKm > maxSubsidized);

        if (exceedsSubsidized) return;
        if (stats.budget < opt.costo) return;
        if (stats.timeRemaining < opt.tiempo) return;

        setSelectedAircraft({
            ...opt,
            distance: dest.distanciaKm,
            isSubsidized,
            exceedsSubsidized,
            canAfford: stats.budget >= opt.costo,
            canTime: stats.timeRemaining >= opt.tiempo,
            destId: dest.destino_id,
            estanciaMinima: dest.estanciaMinima || 0
        });
    };

    const handleConfirm = () => {
        if (!selectedDest || !selectedAircraft) return;
        onSelectDestination({
            destino: selectedDest.destino_id,
            aircraft: selectedAircraft.tipo,
            cost: selectedAircraft.costo,
            time: selectedAircraft.tiempo,
            distance: selectedAircraft.distance,
            isSubsidized: selectedAircraft.isSubsidized,
            estanciaMinima: selectedAircraft.estanciaMinima
        });
    };

    // Filter out already visited airports
    const availableNeighbors = neighbors.filter(n => !visitedAirports.includes(n.destino_id));

    // Calculate bestDest for suggestions
    let bestDestId = null;
    let bestDestName = "";
    let isGlobalSuggestion = false;

    if (suggestedRoute && suggestedRoute.length > 0) {
        const currentIndex = suggestedRoute.indexOf(currentAirportId);
        if (currentIndex !== -1 && currentIndex < suggestedRoute.length - 1) {
            const nextGlobalNode = suggestedRoute[currentIndex + 1];
            if (availableNeighbors.some(n => n.destino_id === nextGlobalNode)) {
                bestDestId = nextGlobalNode;
                bestDestName = availableNeighbors.find(n => n.destino_id === nextGlobalNode)?.nombre;
                isGlobalSuggestion = true;
            }
        }
    }

    if (!bestDestId && availableNeighbors.length > 0) {
        // Fallback local heuristic
        const unvisited = availableNeighbors.filter(n => !visitedAirports.includes(n.destino_id));
        const candidates = unvisited.length > 0 ? unvisited : availableNeighbors;
        
        let bestScore = Infinity;
        candidates.forEach(dest => {
            const cheapestOpt = dest.opciones_aeronave.reduce((min, opt) => opt.costo < min ? opt.costo : min, Infinity);
            if (stats.budget >= cheapestOpt) {
                const destNode = airports.find(a => a.id === dest.destino_id);
                const estStayCost = destNode ? (destNode.costoAlimentacion + destNode.costoAlojamiento) : 0;
                const totalEstCost = cheapestOpt + estStayCost;
                
                const isSubsidized = dest.costoBase === 0;
                const baseDist = Math.max(stats.distanciaTotal + dest.distanciaKm, 2000);
                const breaksRule = isSubsidized && stats.distanciaSubsidiada > 0 && (stats.distanciaSubsidiada + dest.distanciaKm > baseDist * 0.2);
                
                let score = totalEstCost;
                if (isSubsidized && !breaksRule) score -= 500; 
                
                if (score < bestScore) {
                    bestScore = score;
                    bestDestId = dest.destino_id;
                    bestDestName = dest.nombre;
                }
            }
        });
    }

    return (
        <div className="destination-picker-panel animate-slide-in">
            <div className="panel-header">
                <h3>🧭 Exploración Paso a Paso</h3>
                <p>Estás en: <strong>{currentAirportId}</strong> — {currentAirport?.nombre}, {currentAirport?.ciudad}</p>
            </div>

            {suggestedRoute && suggestedRoute.length > 0 && (
                <div className="suggested-route" style={{
                    background: 'rgba(255, 215, 0, 0.1)',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    margin: '0 0 16px 0',
                    color: '#FFD700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    lineHeight: '1.5'
                }}>
                    <span style={{ whiteSpace: 'nowrap' }}>💡 <strong>Sugerencia Max Destinos:</strong></span>
                    <span style={{ flex: 1, wordBreak: 'break-word' }}>
                        {suggestedRoute.join(' → ')}
                    </span>
                </div>
            )}

            {/* Stats Bar */}
            <div className="explorer-stats">
                <div className="stat-item">
                    <span className="stat-label">💰 Presupuesto</span>
                    <span className="stat-value">${stats.budget.toFixed(2)}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">⏱️ Tiempo Rest.</span>
                    <span className="stat-value">{(stats.timeRemaining / 60).toFixed(1)}h</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">📏 Distancia</span>
                    <span className="stat-value">{stats.distanciaTotal.toFixed(0)} km</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">🌍 Visitados</span>
                    <span className="stat-value">{visitedAirports.length}</span>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--accent-secondary)' }}>Cargando destinos...</div>
            ) : availableNeighbors.length === 0 ? (
                <div className="no-destinations">
                    <p>No hay destinos nuevos disponibles desde este aeropuerto.</p>
                    <button className="finish-trip-btn" onClick={onFinishTrip}>
                        📊 Finalizar Viaje y Ver Reporte
                    </button>
                </div>
            ) : (
                <>
                    <div className="panel-section">
                        <label>Elige tu próximo destino ({availableNeighbors.length} disponibles):</label>
                        
                        {/* 🌟 Sugerencia del Sistema (R3) */}
                        {bestDestId && (
                            <div className="suggestion-box" style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px dashed #FFD700', padding: '10px', borderRadius: '10px', marginBottom: '15px' }}>
                                <div style={{ fontSize: '11px', color: '#FFD700', fontWeight: 'bold', marginBottom: '4px' }}>✨ SUGERENCIA DEL SISTEMA (R3)</div>
                                <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                                    Te recomendamos volar a <b>{bestDestName} ({bestDestId})</b>. 
                                    {isGlobalSuggestion 
                                        ? " Es el siguiente paso en tu ruta óptima para maximizar destinos."
                                        : " Es la opción más óptima localmente considerando el costo del vuelo y la estancia."}
                                </div>
                            </div>
                        )}

                        <div className="destinations-list">
                            {availableNeighbors.map((dest, idx) => {
                                const cheapest = dest.opciones_aeronave.reduce((min, opt) => opt.costo < min ? opt.costo : min, Infinity);
                                const fastest = dest.opciones_aeronave.reduce((min, opt) => opt.tiempo < min ? opt.tiempo : min, Infinity);
                                const canAffordAny = dest.opciones_aeronave.some(o => stats.budget >= o.costo);
                                const canTimeAny = dest.opciones_aeronave.some(o => stats.timeRemaining >= o.tiempo);
                                const isSelected = selectedDest?.destino_id === dest.destino_id;
                                const isSuggested = bestDestId === dest.destino_id;

                                return (
                                    <div
                                        key={idx}
                                        className={`dest-card ${isSelected ? 'selected' : ''} ${(!canAffordAny || !canTimeAny) ? 'disabled' : ''}`}
                                        style={isSuggested ? { border: '2px solid #FFD700', boxShadow: '0 0 10px rgba(255,215,0,0.3)' } : {}}
                                        onClick={() => (canAffordAny && canTimeAny) && handleSelectDest(dest)}
                                    >
                                        <div className="dest-main">
                                            <div className="dest-id-row">
                                                <span className="dest-iata">{dest.destino_id}</span>
                                                <span className={`dest-hub-badge ${dest.esHub ? 'hub' : 'sec'}`}>
                                                    {dest.esHub ? 'HUB' : 'SEC'}
                                                </span>
                                            </div>
                                            <div className="dest-name">{dest.nombre}</div>
                                            <div className="dest-location">{dest.ciudad}, {dest.pais}</div>
                                        </div>
                                        <div className="dest-metrics">
                                            <span>📏 {dest.distanciaKm} km</span>
                                            <span>💰 desde ${cheapest.toFixed(0)}</span>
                                            <span>⏱️ desde {fastest.toFixed(0)} min</span>
                                        </div>
                                        {!canAffordAny && <span className="error-text">Presupuesto insuficiente</span>}
                                        {canAffordAny && !canTimeAny && <span className="error-text">Tiempo insuficiente</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Aircraft selection for chosen destination */}
                    {selectedDest && (
                        <div className="panel-section">
                            <label>Selecciona aeronave para volar a {selectedDest.destino_id}:</label>
                            <div className="aircraft-options">
                                {(() => {
                                    const options = selectedDest.opciones_aeronave.map(opt => {
                                        const isSubsidized = selectedDest.costoBase === 0;
                                        const baseDistance = Math.max(stats.distanciaTotal + selectedDest.distanciaKm, 2000);
                                        const maxSubsidized = baseDistance * 0.2;
                                        const exceedsSubsidized = isSubsidized && stats.distanciaSubsidiada > 0 && (stats.distanciaSubsidiada + selectedDest.distanciaKm > maxSubsidized);
                                        
                                        const finalCost = exceedsSubsidized ? opt.costo : (isSubsidized ? 0 : opt.costo);
                                        
                                        return {
                                            ...opt,
                                            costo: finalCost,
                                            isSubsidized: isSubsidized && !exceedsSubsidized,
                                            exceedsSubsidized: exceedsSubsidized,
                                            canAfford: stats.budget >= finalCost,
                                            canTime: stats.timeRemaining >= opt.tiempo
                                        };
                                    });

                                    return options.map((opt, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`aircraft-card ${selectedAircraft?.tipo === opt.tipo ? 'selected' : ''} ${(!opt.canAfford || !opt.canTime)? 'disabled': ''}`}
                                            onClick={() =>(opt.canAfford && opt.canTime)&& handleSelectAircraft(opt, selectedDest)}
                                        >
                                            <div className="aircraft-type">{opt.tipo}</div>
                                            <div className="aircraft-metrics">
                                                <span className="metric">💰 Costo: ${opt.costo.toFixed(2)}</span>
                                                <span className="metric">⏱️ Tiempo: {opt.tiempo.toFixed(1)} min</span>
                                            </div>
                                            {opt.isSubsidized && <span className="subsidized-badge">Ruta Subsidiada (Gratis)</span>}
                                            {opt.exceedsSubsidized && <span className="error-text" style={{color: 'var(--warning)'}}>Sin cupo subsidiado (Pago normal)</span>}
                                            {!opt.canAfford && <span className="error-text">Presupuesto insuficiente</span>}
                                            {!opt.canTime && (<span className="error-text">Tiempo insuficiente</span>)}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    <div className="picker-actions">
                        <button
                            className="confirm-btn"
                            disabled={!selectedAircraft}
                            onClick={handleConfirm}
                        >
                            ✈️ Confirmar y Volar
                        </button>
                        <button className="finish-trip-btn-secondary" onClick={onFinishTrip}>
                            📊 Finalizar Viaje
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default DestinationPicker;
