import React, { useState, useEffect } from 'react';

const AirportStayPanel = ({ airportId, airports, stats, onComplete }) => {
    const airport = airports.find(a => a.id === airportId);
    if (!airport) return null;

    const [selectedActivities, setSelectedActivities] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [jobHours, setJobHours] = useState(1);
    
    // Check obligations
    const needsMeal = stats.hoursSinceMeal >= 8;
    const needsSleep = stats.hoursSinceSleep >= 20;
    
    // Jobs only available if budget < 35% of initial
    const canWork = stats.budget < (stats.initialBudget * 0.35);

    const mealCost = needsMeal ? airport.costoAlimentacion : 0;
    const sleepCost = needsSleep ? airport.costoAlojamiento : 0;
    const activitiesCost = selectedActivities.reduce((sum, act) => sum + act.costoUSD, 0);
    const activitiesTime = selectedActivities.reduce((sum, act) => sum + act.duracionMin, 0);
    const jobEarnings = selectedJob ? selectedJob.tarifaHora * jobHours : 0;
    const jobTime = selectedJob ? jobHours * 60 : 0;

    const totalCost = mealCost + sleepCost + activitiesCost;
    const totalTime = Math.max(airport.estanciaMinima || 0, activitiesTime + jobTime + (needsSleep ? 480 : 0)); // 8h sleep if needed

    const toggleActivity = (act) => {
        if (selectedActivities.find(a => a.nombre === act.nombre)) {
            setSelectedActivities(selectedActivities.filter(a => a.nombre !== act.nombre));
        } else {
            setSelectedActivities([...selectedActivities, act]);
        }
    };

    const handleConfirm = () => {
        onComplete({
            totalCost,
            totalEarnings: jobEarnings,
            totalTime,
            activities: selectedActivities,
            jobs: selectedJob ? [{ ...selectedJob, hours: jobHours, earnings: jobEarnings }] : [],
            resetMeal: needsMeal,
            resetSleep: needsSleep
        });
    };

    return (
        <div className="airport-stay-panel animate-slide-in">
            <div className="panel-header">
                <h3>📍 Estancia en {airport.id}</h3>
                <p>{airport.ciudad}, {airport.pais}</p>
            </div>

            <div className="panel-section">
                <label>Obligaciones Biológicas</label>
                <div className="obligations-list">
                    <div className={`obligation-item ${needsMeal ? 'pending' : 'ok'}`}>
                        <span>🍔 Alimentación (cada 8h)</span>
                        <span>{needsMeal ? `$${airport.costoAlimentacion}` : '✓ Satisfecho'}</span>
                    </div>
                    <div className={`obligation-item ${needsSleep ? 'pending' : 'ok'}`}>
                        <span>🛌 Alojamiento (cada 20h)</span>
                        <span>{needsSleep ? `$${airport.costoAlojamiento}` : '✓ Descansado'}</span>
                    </div>
                </div>
            </div>

            <div className="panel-section">
                <label>Actividades Opcionales</label>
                <div className="activities-selection">
                    {airport.actividades && airport.actividades.length > 0 ? (
                        airport.actividades.map((act, idx) => (
                            <div key={idx} className={`selectable-item ${selectedActivities.includes(act) ? 'selected' : ''}`} onClick={() => toggleActivity(act)}>
                                <div className="item-info">
                                    <span className="item-name">{act.nombre}</span>
                                    <span className="item-meta">{act.duracionMin} min | ${act.costoUSD}</span>
                                </div>
                                <input type="checkbox" checked={selectedActivities.includes(act)} readOnly />
                            </div>
                        ))
                    ) : <p className="empty-text">No hay actividades.</p>}
                </div>
            </div>

            {canWork && (
                <div className="panel-section work-section">
                    <label>💼 Trabajos Disponibles (Presupuesto Bajo)</label>
                    <div className="jobs-list">
                        {airport.trabajos && airport.trabajos.length > 0 ? (
                            airport.trabajos.map((job, idx) => (
                                <div key={idx} className={`selectable-item ${selectedJob === job ? 'selected' : ''}`} onClick={() => setSelectedJob(job)}>
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
                                <span>{jobHours} horas (${jobEarnings})</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="panel-summary">
                <div className="summary-row">
                    <span>Gasto Total:</span>
                    <span className="cost-val">${totalCost}</span>
                </div>
                <div className="summary-row">
                    <span>Ingreso:</span>
                    <span className="earn-val">+${jobEarnings}</span>
                </div>
                <div className="summary-row">
                    <span>Tiempo Estancia:</span>
                    <span>{totalTime} min</span>
                </div>
                {totalTime < airport.estanciaMinima && (
                    <div className="free-time-note">
                        Se registrarán {airport.estanciaMinima - totalTime} min de tiempo libre.
                    </div>
                )}
            </div>

            <button className="confirm-btn" onClick={handleConfirm} disabled={stats.budget < totalCost}>
                {stats.budget < totalCost ? 'Presupuesto Insuficiente' : 'Confirmar y Continuar'}
            </button>
        </div>
    );
};

export default AirportStayPanel;
