import React, { useState, useEffect } from 'react';
import { fetchAirportNeighbors } from '../services/api';

const DestinationPicker = ({ currentAirportId, airports, stats, config, visitedAirports, onSelectDestination, onFinishTrip }) => {
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
        // Check subsidized rule: max 20% of total distance can be subsidized
        const isSubsidized = dest.costoBase === 0 && opt.costo === 0;
        const totalDistAfter = stats.distanciaTotal + dest.distanciaKm;
        const maxSubsidized = totalDistAfter * 0.2;
        const exceedsSubsidized = isSubsidized && (stats.distanciaSubsidiada + dest.distanciaKm > maxSubsidized);

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
            destId: dest.destino_id
        });
    };

    const handleConfirm = () => {
        if (!selectedDest || !selectedAircraft) return;
        onSelectDestination({
            destino: selectedAircraft.destId,
            aircraft: selectedAircraft.tipo,
            cost: selectedAircraft.costo,
            time: selectedAircraft.tiempo,
            distance: selectedAircraft.distance,
            isSubsidized: selectedAircraft.isSubsidized
        });
    };

    // Filter out already visited airports
    const availableNeighbors = neighbors.filter(n => !visitedAirports.includes(n.destino_id));

    return (
        <div className="destination-picker-panel animate-slide-in">
            <div className="panel-header">
                <h3>🧭 Exploración Paso a Paso</h3>
                <p>Estás en: <strong>{currentAirportId}</strong> — {currentAirport?.nombre}, {currentAirport?.ciudad}</p>
            </div>

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
                        <div className="destinations-list">
                            {availableNeighbors.map((dest, idx) => {
                                const cheapest = dest.opciones_aeronave.reduce((min, opt) => opt.costo < min ? opt.costo : min, Infinity);
                                const fastest = dest.opciones_aeronave.reduce((min, opt) => opt.tiempo < min ? opt.tiempo : min, Infinity);
                                const canAffordAny = dest.opciones_aeronave.some(o => stats.budget >= o.costo);
                                const canTimeAny = dest.opciones_aeronave.some(o => stats.timeRemaining >= o.tiempo);
                                const isSelected = selectedDest?.destino_id === dest.destino_id;

                                return (
                                    <div
                                        key={idx}
                                        className={`dest-card ${isSelected ? 'selected' : ''} ${(!canAffordAny || !canTimeAny) ? 'disabled' : ''}`}
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
                                {selectedDest.opciones_aeronave.map((opt, idx) => {
                                    const isSubsidized = selectedDest.costoBase === 0 && opt.costo === 0;
                                    const totalDistAfter = stats.distanciaTotal + selectedDest.distanciaKm;
                                    const maxSubsidized = totalDistAfter * 0.2;
                                    const exceedsSubsidized = isSubsidized && (stats.distanciaSubsidiada + selectedDest.distanciaKm > maxSubsidized);
                                    const canAfford = stats.budget >= opt.costo;
                                    const canTime = stats.timeRemaining >= opt.tiempo;
                                    const isDisabled = !canAfford || exceedsSubsidized || !canTime;

                                    return (
                                        <div
                                            key={idx}
                                            className={`aircraft-card ${selectedAircraft?.tipo === opt.tipo ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                            onClick={() => !isDisabled && handleSelectAircraft(opt, selectedDest)}
                                        >
                                            <div className="aircraft-type">{opt.tipo}</div>
                                            <div className="aircraft-metrics">
                                                <span className="metric">💰 ${opt.costo}</span>
                                                <span className="metric">⏱️ {opt.tiempo.toFixed(1)} min</span>
                                            </div>
                                            {isSubsidized && <span className="subsidized-badge">Ruta Subsidiada</span>}
                                            {exceedsSubsidized && <span className="error-text">Límite subsidiado (20%) excedido</span>}
                                            {!canAfford && <span className="error-text">Presupuesto insuficiente</span>}
                                            {!canTime && <span className="error-text">Tiempo insuficiente</span>}
                                        </div>
                                    );
                                })}
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
