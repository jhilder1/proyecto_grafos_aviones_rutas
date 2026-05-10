import React, { useState, useEffect, useRef } from 'react';

const TripSimulator = ({ itinerary, onProgressUpdate, onLegComplete, onInterruption, isInterrupted, currentAirport }) => {
    const [legIndex, setLegIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isReturning, setIsReturning] = useState(false);
    const [status, setStatus] = useState('En espera');
    
    const tickerRef = useRef();
    const SIM_SPEED = 2; // Progress percentage per tick

    useEffect(() => {
        if (!itinerary || itinerary.length === 0) return;

        const tick = () => {
            if (isReturning) {
                // Moving back to origin
                setProgress(prev => {
                    const next = prev - (SIM_SPEED * 2);
                    if (next <= 0) {
                        setIsReturning(false);
                        onInterruption(itinerary[legIndex].origen);
                        return 0;
                    }
                    return next;
                });
                return;
            }

            if (isInterrupted) {
                if (!isReturning && progress > 0) {
                    setIsReturning(true);
                    setStatus('⚠️ RUTA INTERRUMPIDA: Regresando al origen...');
                }
                return;
            }

            setProgress(prev => {
                const next = prev + SIM_SPEED;
                if (next >= 100) {
                    // Leg finished
                    if (legIndex < itinerary.length - 1) {
                        setLegIndex(idx => idx + 1);
                        onLegComplete(itinerary[legIndex + 1].origen);
                        return 0;
                    } else {
                        // Trip finished
                        clearInterval(tickerRef.current);
                        setStatus('✅ Viaje Concluido');
                        onLegComplete(itinerary[legIndex].destino);
                        return 100;
                    }
                }
                return next;
            });
        };

        setStatus(`✈️ Volando: ${itinerary[legIndex].origen} → ${itinerary[legIndex].destino}`);
        tickerRef.current = setInterval(tick, 100);

        return () => clearInterval(tickerRef.current);
    }, [legIndex, itinerary, isInterrupted, isReturning, progress]);

    // Update parent about progress for graph visualization
    useEffect(() => {
        onProgressUpdate(progress, itinerary[legIndex]);
    }, [progress, legIndex]);

    return (
        <div className="trip-simulator-panel animate-slide-in">
            <div className="sim-header">
                <span className="sim-badge">LIVE</span>
                <h4>Simulador de Vuelo</h4>
            </div>
            
            <div className="sim-body">
                <div className="sim-status">{status}</div>
                
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progress}%`, backgroundColor: isReturning ? 'var(--danger)' : 'var(--accent-secondary)' }}></div>
                </div>
                
                <div className="sim-info">
                    <div className="sim-info-item">
                        <label>Aeronave</label>
                        <span>{itinerary[legIndex]?.aeronave}</span>
                    </div>
                    <div className="sim-info-item">
                        <label>Distancia</label>
                        <span>{itinerary[legIndex]?.distancia} km</span>
                    </div>
                </div>
                
                {isReturning && (
                    <div className="sim-alert">
                        Se ha detectado una interrupción en la red. El protocolo de seguridad exige el retorno inmediato al aeropuerto de origen.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TripSimulator;
