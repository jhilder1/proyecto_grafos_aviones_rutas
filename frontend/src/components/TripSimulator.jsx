// TripSimulator.jsx
// Simulates traveler movement along an itinerary.
// Props:
// - itinerary: array of leg objects
// - onProgressUpdate(progress): called with 0-100 progress
// - onLegComplete(legIndex): called when a leg finishes
// - onInterruption(origin): called when an interruption occurs
// - onRequestInterruption(): request to interrupt current leg
// - isInterrupted: boolean flag
// - currentAirport: current airport id
import React, { useState, useEffect, useRef } from 'react';

const TripSimulator = ({ itinerary, onProgressUpdate, onLegComplete, onInterruption, onRequestInterruption, isInterrupted, interruptedLeg, currentAirport }) => {
    const [legIndex, setLegIndex] = useState(0);
    const [showReasonSelect, setShowReasonSelect] = useState(false);
    const [selectedReason, setSelectedReason] = useState('Condiciones Meteorológicas');
    const reasons = ['Condiciones Meteorológicas', 'Tráfico Aéreo', 'Falla Mecánica', 'Cierre de Espacio Aéreo', 'Cancelación de Aerolínea'];
    const [progress, setProgress] = useState(0);
    const [isReturning, setIsReturning] = useState(false);
    const [status, setStatus] = useState('En espera');
    
    const tickerRef = useRef();
    const progressRef = useRef(progress);
    const SIM_SPEED = 0.5; // Reduced from 2 to 0.5 to make flights 4x slower

    // Update ref when progress changes so tick() has the latest value
    useEffect(() => {
        progressRef.current = progress;
    }, [progress]);

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
                if (!isReturning && progressRef.current > 0) {
                    setIsReturning(true);
                    setStatus('⚠️ RUTA INTERRUMPIDA: Regresando al origen...');
                } else if (!isReturning && progressRef.current === 0) {
                    onInterruption(itinerary[legIndex].origen);
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
    }, [legIndex, itinerary, isInterrupted, isReturning]);

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
                        Se ha detectado una interrupción en la red{interruptedLeg && interruptedLeg.motivo ? ` por ${interruptedLeg.motivo}` : ''}. El protocolo de seguridad exige el retorno inmediato al aeropuerto de origen.
                    </div>
                )}
                
                {!isInterrupted && !isReturning && progress < 90 && onRequestInterruption && (
                    <div style={{ marginTop: '15px' }}>
                        {showReasonSelect ? (
                            <div className="reason-selector">
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#ccc' }}>Motivo de interrupción:</label>
                                <select 
                                    value={selectedReason} 
                                    onChange={(e) => setSelectedReason(e.target.value)}
                                    style={{ width: '100%', padding: '8px', marginBottom: '10px', background: '#2A2A35', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                                >
                                    {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        onClick={() => {
                                            setShowReasonSelect(false);
                                            onRequestInterruption(selectedReason);
                                        }}
                                        style={{ flex: 1, padding: '8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        Confirmar
                                    </button>
                                    <button 
                                        onClick={() => setShowReasonSelect(false)}
                                        style={{ flex: 1, padding: '8px', background: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setShowReasonSelect(true)}
                                style={{ width: '100%', padding: '10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                ⚠️ Interrumpir Vuelo
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TripSimulator;
