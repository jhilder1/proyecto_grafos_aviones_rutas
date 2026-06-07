import React, { useState } from 'react';

const AirportStayPanel = ({ airportId, airports, config, stats, onComplete }) => {
    const airport = airports.find(a => a.id === airportId);
    if (!airport) return null;

    const [selectedActivities, setSelectedActivities] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [jobHours, setJobHours] = useState(1);
    
    // Intervalos configurables (fallback a 8 y 20 si no existen)
    const mealInterval = config?.configuracionGlobal?.intervaloAlimentacion || 8;
    const sleepInterval = config?.configuracionGlobal?.intervaloAlojamiento || 20;
    const minBudgetPct = (config?.configuracionGlobal?.presupuestoMinimoPorc || 35) / 100;

    // Check obligations — these are MANDATORY per R2.3
    const needsMeal = stats.hoursSinceMeal >= mealInterval;
    const needsSleep = stats.hoursSinceSleep >= sleepInterval;
    
    // Jobs only available if budget < minBudgetPct of initial (R2.3)
    const canWork = stats.budget < (stats.initialBudget * minBudgetPct);

    // Calculate meal cost (R2.3: if triggered during flight, use departure airport cost)
    const mealCost = needsMeal 
        ? (stats.mealTriggeredDuringFlight ? stats.lastAirportMealCost : airport.costoAlimentacion) 
        : 0;
    const sleepCost = needsSleep ? airport.costoAlojamiento : 0;
    const activitiesCost = selectedActivities.reduce((sum, act) => sum + act.costoUSD, 0);
    const activitiesTime = selectedActivities.reduce((sum, act) => sum + act.duracionMin, 0);
    const jobEarnings = selectedJob ? selectedJob.tarifaHora * jobHours : 0;
    const jobTime = selectedJob ? jobHours * 60 : 0;

    // Mandatory costs are always applied
    const mandatoryCost = mealCost + sleepCost;
    const totalCost = mandatoryCost + activitiesCost;
    
    // Sleep takes 8 hours (480 min), meal takes 30 min
    const mealTime = needsMeal ? 30 : 0;
    const sleepTime = needsSleep ? 480 : 0;
    const mandatoryTime = mealTime + sleepTime;
    const estanciaMinima = stats.estanciaMinima || 0;
    const totalTime = Math.max(estanciaMinima, mandatoryTime + activitiesTime + jobTime);
    const freeTime = Math.max(0, estanciaMinima - (mandatoryTime + activitiesTime + jobTime));

    const toggleActivity = (act) => {
        if (selectedActivities.find(a => a.nombre === act.nombre)) {
            setSelectedActivities(selectedActivities.filter(a => a.nombre !== act.nombre));
        } else {
            setSelectedActivities([...selectedActivities, act]);
        }
    };

    // Check if the traveler can afford costs (including what they just earned from the job)
    const netBudget = stats.budget + jobEarnings;
    const canAffordMandatory = netBudget >= mandatoryCost;
    const canAffordTotal = netBudget >= totalCost;

    const handleConfirm = () => {
        const mandatoryActivities = [];
        if (needsMeal) mandatoryActivities.push({ nombre: "Alimentación", tipo: "Obligatoria", duracionMin: mealTime, costoUSD: mealCost, aeropuerto: airportId });
        if (needsSleep) mandatoryActivities.push({ nombre: "Alojamiento", tipo: "Obligatoria", duracionMin: sleepTime, costoUSD: sleepCost, aeropuerto: airportId });

        const mappedOptional = selectedActivities.map(a => ({ ...a, tipo: "Opcional", aeropuerto: airportId }));
        
        if (freeTime > 0) {
            mappedOptional.push({
                nombre: "Tiempo Libre",
                tipo: "Opcional",
                duracionMin: freeTime,
                costoUSD: 0,
                aeropuerto: airportId
            });
        }

        onComplete({
            totalCost,
            totalEarnings: jobEarnings,
            totalTime,
            activities: [...mandatoryActivities, ...mappedOptional],
            jobs: selectedJob ? [{ ...selectedJob, hours: jobHours, earnings: jobEarnings, aeropuerto: airportId }] : [],
            resetMeal: needsMeal,
            resetSleep: needsSleep
        });
    };

    return (
        <div className="airport-stay-panel animate-slide-in">
            <div className="panel-header">
                <h3>📍 Estancia en {airport.id}</h3>
                <p>{airport.nombre} — {airport.ciudad}, {airport.pais}</p>
            </div>

            {/* Biological obligations - MANDATORY */}
            <div className="panel-section">
                <label>Obligaciones Biológicas (Automáticas)</label>
                <div className="obligations-list">
                    <div className={`obligation-item ${needsMeal ? 'pending' : 'ok'}`}>
                        <span>🍔 Alimentación (cada 8h)</span>
                        <span>
                            {needsMeal 
                                ? `$${mealCost} ${stats.mealTriggeredDuringFlight ? '(cobrado del aeropuerto de salida)' : ''}` 
                                : '✓ Satisfecho'}
                        </span>
                    </div>
                    <div className={`obligation-item ${needsSleep ? 'pending' : 'ok'}`}>
                        <span>🛌 Alojamiento (cada 20h)</span>
                        <span>{needsSleep ? `$${airport.costoAlojamiento} (8h descanso)` : '✓ Descansado'}</span>
                    </div>
                </div>
                {(needsMeal || needsSleep) && (
                    <div style={{ fontSize: '11px', color: '#FFD700', marginTop: '8px', fontStyle: 'italic' }}>
                        ⚠️ Las obligaciones biológicas se aplican automáticamente y no pueden omitirse.
                    </div>
                )}
            </div>

            {/* Estancia mínima info */}
            {estanciaMinima > 0 && (
                <div style={{ 
                    fontSize: '12px', 
                    background: 'rgba(0,229,255,0.08)', 
                    padding: '8px 12px', 
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--accent-secondary)',
                    marginTop: '10px'
                }}>
                    ⏳ Estancia mínima obligatoria: <strong>{estanciaMinima} min</strong>
                </div>
            )}

            {/* Optional Activities */}
            <div className="panel-section">
                <label>Actividades Opcionales</label>
                <div className="activities-selection">
                    {airport.actividades && airport.actividades.length > 0 ? (
                        airport.actividades.map((act, idx) => (
                            <div key={idx} className={`selectable-item ${selectedActivities.includes(act) ? 'selected' : ''}`} onClick={() => toggleActivity(act)}>
                                <div className="item-info">
                                    <span className="item-name">{act.nombre} <span style={{fontSize: '11px', color: 'var(--accent-secondary)'}}>[{act.tipo}]</span></span>
                                    <span className="item-meta">{act.duracionMin} min | ${act.costoUSD}</span>
                                </div>
                                <input type="checkbox" checked={selectedActivities.includes(act)} readOnly />
                            </div>
                        ))
                    ) : <p className="empty-text">No hay actividades.</p>}
                </div>
            </div>

            {/* Jobs - R2.3: only if budget < 35% of initial */}
            {canWork && (
                <div className="panel-section work-section">
                    <label>💼 Trabajos Disponibles (Presupuesto &lt; 35%)</label>
                    <div style={{ fontSize: '11px', color: '#FFD700', marginBottom: '8px' }}>
                        Tu presupuesto (${stats.budget.toFixed(0)}) es menor al 35% del inicial (${(stats.initialBudget * 0.35).toFixed(0)}). Puedes trabajar para ganar dinero.
                    </div>
                    <div className="jobs-list">
                        {airport.trabajos && airport.trabajos.length > 0 ? (
                            airport.trabajos.map((job, idx) => (
                                <div key={idx} className={`selectable-item ${selectedJob === job ? 'selected' : ''}`} onClick={() => setSelectedJob(selectedJob === job ? null : job)}>
                                    <div className="item-info">
                                        <span className="item-name">{job.nombre}</span>
                                        <span className="item-meta">${job.tarifaHora}/h | Máx: {job.maxHoras}h</span>
                                    </div>
                                    <input type="radio" checked={selectedJob === job} readOnly />
                                </div>
                            ))
                        ) : <p className="empty-text">No hay trabajos.</p>}
                        
                        {selectedJob && (
                            <div className="job-hours">
                                <label>Horas a trabajar:</label>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max={selectedJob.maxHoras} 
                                    value={jobHours} 
                                    onChange={(e) => setJobHours(parseInt(e.target.value))} 
                                />
                                <span>{jobHours} horas (+${jobEarnings})</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="panel-summary">
                {mandatoryCost > 0 && (
                    <div className="summary-row">
                        <span>Costos Obligatorios:</span>
                        <span className="cost-val">-${mandatoryCost}</span>
                    </div>
                )}
                {activitiesCost > 0 && (
                    <div className="summary-row">
                        <span>Actividades Opcionales:</span>
                        <span className="cost-val">-${activitiesCost}</span>
                    </div>
                )}
                <div className="summary-row" style={{ fontWeight: 700 }}>
                    <span>Gasto Total:</span>
                    <span className="cost-val">-${totalCost}</span>
                </div>
                {jobEarnings > 0 && (
                    <div className="summary-row">
                        <span>Ingreso Trabajo:</span>
                        <span className="earn-val">+${jobEarnings}</span>
                    </div>
                )}
                <div className="summary-row">
                    <span>Tiempo Estancia:</span>
                    <span>{totalTime} min ({(totalTime / 60).toFixed(1)}h)</span>
                </div>
                {freeTime > 0 && (
                    <div className="free-time-note">
                        Se registrarán {freeTime} min de tiempo libre por estancia mínima.
                    </div>
                )}
                <div className="summary-row" style={{ marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '8px' }}>
                    <span>Presupuesto después:</span>
                    <span style={{ color: (stats.budget - totalCost + jobEarnings) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        ${(stats.budget - totalCost + jobEarnings).toFixed(2)}
                    </span>
                </div>
            </div>

            <button className="confirm-btn" onClick={handleConfirm} disabled={!canAffordTotal}>
                {!canAffordMandatory 
                    ? 'Presupuesto insuficiente para obligaciones' 
                    : !canAffordTotal 
                    ? 'Presupuesto insuficiente' 
                    : 'Confirmar y Continuar'}
            </button>
        </div>
    );
};

export default AirportStayPanel;
