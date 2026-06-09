// LegSelector.jsx
// Small component to display and select legs within an itinerary.
// Props: itinerary (array), currentLegIndex, onSelectLeg(index)
import React, { useState } from 'react';

const LegSelector = ({ originId, destId, airports, edges, config, stats, onSelect }) => {
    const origin = airports.find(a => a.id === originId);
    const edge = edges.find(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        return s === originId && t === destId;
    });
    
    if (!edge) return <div>No hay rutas directas disponibles.</div>;

    const [selectedAircraft, setSelectedAircraft] = useState(null);
    const aircraftConfig = config.aeronaves || {};

    const options = edge.aeronaves.map(type => {
        const conf = aircraftConfig[type] || { costoKm: 0, tiempoKm: 0 };
        const isSubsidized = edge.costoBase === 0;
        
        // Regla del 20%: máximo 20% de la distancia TOTAL puede ser subsidiada
        const baseDistance = Math.max(stats.distanciaTotal + edge.distanciaKm, 2000);
        const maxSubsidized = baseDistance * 0.2;
        const exceedsSubsidized = isSubsidized && stats.distanciaSubsidiada > 0 && (stats.distanciaSubsidiada + edge.distanciaKm > maxSubsidized);

        // Si excede el límite de subsidio, debe pagar el costo normal
        const finalCost = isSubsidized && !exceedsSubsidized ? 0 : edge.distanciaKm * conf.costoKm;
        const time = edge.distanciaKm * conf.tiempoKm;

        return {
            type,
            cost: finalCost,
            time,
            distance: edge.distanciaKm,
            isSubsidized: isSubsidized && !exceedsSubsidized, // Solo es subsidiado si realmente lo usa
            exceedsSubsidized,
            canAfford: stats.budget >= finalCost,
            canTime: stats.timeRemaining >= time,
            estanciaMinima: edge.estanciaMinima || 0
        };
    });

    return (
        <div className="leg-selector-panel animate-slide-in">
            <div className="panel-header">
                <h3>✈️ Próximo Vuelo: {originId} → {destId}</h3>
                <p>Distancia: {edge.distanciaKm} km</p>
            </div>

            <div className="aircraft-options">
                <label>Selecciona una Aeronave:</label>
                {options.map((opt, idx) => (
                    <div 
                        key={idx} 
                        className={`aircraft-card ${selectedAircraft?.type === opt.type ? 'selected' : ''} ${(!opt.canAfford || !opt.canTime)? 'disabled': ''}`}
                         onClick={() =>(opt.canAfford && opt.canTime)&& setSelectedAircraft(opt)}                    >
                        <div className="aircraft-type">{opt.type}</div>
                        <div className="aircraft-metrics">
                            <span className="metric">💰 Costo: ${opt.cost.toFixed(2)}</span>
                            <span className="metric">⏱️ Tiempo: {opt.time.toFixed(1)} min</span>
                        </div>
                        {opt.isSubsidized && <span className="subsidized-badge">Ruta Subsidiada (Gratis)</span>}
                        {opt.exceedsSubsidized && <span className="error-text" style={{color: 'var(--warning)'}}>Sin cupo subsidiado (Pago normal)</span>}
                        {!opt.canAfford && <span className="error-text">Presupuesto insuficiente</span>}
                        {!opt.canTime && (<span className="error-text">Tiempo insuficiente</span>)}
                    </div>
                ))}
            </div>

            <button 
                className="confirm-btn" 
                disabled={!selectedAircraft}
                onClick={() => onSelect({
                    aircraft: selectedAircraft.type,
                    cost: selectedAircraft.cost,
                    time: selectedAircraft.time,
                    distance: selectedAircraft.distance,
                    isSubsidized: selectedAircraft.isSubsidized,
                    estanciaMinima: selectedAircraft.estanciaMinima
                })}
            >
                Confirmar y Despegar
            </button>
        </div>
    );
};

export default LegSelector;
