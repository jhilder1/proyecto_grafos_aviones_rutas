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
        const cost = edge.distanciaKm * conf.costoKm;
        const time = edge.distanciaKm * conf.tiempoKm;
        const isSubsidized = edge.costoBase === 0 && cost === 0;
        
        // 20% distance rule for subsidized
        const maxSubsidizedDist = (stats.distanciaTotal + edge.distanciaKm) * 0.2;
        const exceedsSubsidized = isSubsidized && (stats.distanciaSubsidiada + edge.distanciaKm > maxSubsidizedDist);

        return {
            type,
            cost,
            time,
            distance: edge.distanciaKm,
            isSubsidized,
            exceedsSubsidized,
            canAfford: stats.budget >= cost,
            canTime: stats.timeRemaining >= time
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
                        className={`aircraft-card ${selectedAircraft?.type === opt.type ? 'selected' : ''} ${(!opt.canAfford || opt.exceedsSubsidized) ? 'disabled' : ''}`}
                        onClick={() => (opt.canAfford && !opt.exceedsSubsidized) && setSelectedAircraft(opt)}
                    >
                        <div className="aircraft-type">{opt.type}</div>
                        <div className="aircraft-metrics">
                            <span className="metric">💰 Costo: ${opt.cost}</span>
                            <span className="metric">⏱️ Tiempo: {opt.time.toFixed(1)} min</span>
                        </div>
                        {opt.isSubsidized && <span className="subsidized-badge">Ruta Subsidiada</span>}
                        {opt.exceedsSubsidized && <span className="error-text">Límite subsidiado (20%) excedido</span>}
                        {!opt.canAfford && <span className="error-text">Presupuesto insuficiente</span>}
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
                    isSubsidized: selectedAircraft.isSubsidized
                })}
            >
                Confirmar y Despegar
            </button>
        </div>
    );
};

export default LegSelector;
