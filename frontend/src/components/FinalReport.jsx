// FinalReport.jsx
// Presents a final trip report with visited destinations, flown legs,
// activities and earnings. Used after completing a simulated trip.
// Props: history, initialBudget, initialTime, finalStats, airports, onClose
import React from 'react';

const FinalReport = ({ history, initialBudget, initialTime, finalStats, airports, onClose }) => {
    const totalSpent = initialBudget - finalStats.budget + history.jobs.reduce((sum, j) => sum + j.earnings, 0);
    const totalEarned = history.jobs.reduce((sum, j) => sum + j.earnings, 0);
    const totalTime = initialTime - finalStats.timeRemaining; // in minutes

    return (
        <div className="report-overlay">
            <div className="report-panel animate-slide-in" style={{ maxWidth: '900px' }}>
                <div className="report-header">
                    <h2>📊 Reporte Final de Viaje</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="report-section">
                    <h3>🌍 Destinos Visitados</h3>
                    <div className="report-table-wrapper">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Aeropuerto</th>
                                    <th>Ciudad</th>
                                    <th>País</th>
                                    <th>Estancia</th>
                                    <th>Gasto</th>
                                    <th>Ganancia</th>
                                    <th>Total Incurrido</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.destinations.map((d, i) => {
                                    const airport = airports.find(a => a.id === d.id);
                                    return (
                                        <tr key={i}>
                                            <td>{airport ? airport.nombre : d.id}</td>
                                            <td>{airport ? airport.ciudad : ''}</td>
                                            <td>{airport ? airport.pais : ''}</td>
                                            <td>{d.stayTime} min</td>
                                            <td>${d.cost}</td>
                                            <td>${d.earnings}</td>
                                            <td style={{ color: (d.cost - d.earnings) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                                                ${d.cost - d.earnings}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="report-section">
                    <h3>✈️ Tramos Volados</h3>
                    <div className="report-table-wrapper">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Origen</th>
                                    <th>Destino</th>
                                    <th>Aeronave</th>
                                    <th>Distancia</th>
                                    <th>Tiempo</th>
                                    <th>Costo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.flights.map((f, i) => (
                                    <tr key={i}>
                                        <td>{f.origen}</td>
                                        <td>{f.destino}</td>
                                        <td>{f.aeronave}</td>
                                        <td>{f.distancia} km</td>
                                        <td>{f.tiempo} min</td>
                                        <td>${f.costo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="report-grid">
                    <div className="report-section">
                        <h3>🎨 Actividades</h3>
                        <div className="report-table-wrapper">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Actividad</th>
                                        <th>Tipo</th>
                                        <th>Tiempo</th>
                                        <th>Costo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.activities.map((a, i) => (
                                        <tr key={i}>
                                            <td>{a.nombre}</td>
                                            <td>{a.tipo}</td>
                                            <td>{a.duracionMin || 0} min</td>
                                            <td>${a.costoUSD || 0}</td>
                                        </tr>
                                    ))}
                                    {history.activities.length === 0 && <tr><td colSpan="4" style={{textAlign: 'center', opacity: 0.5}}>Ninguna</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="report-section">
                        <h3>💼 Trabajos</h3>
                        <div className="report-table-wrapper">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Trabajo</th>
                                        <th>Horas</th>
                                        <th>Ingreso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.jobs.map((j, i) => (
                                        <tr key={i}>
                                            <td>{j.nombre}</td>
                                            <td>{j.hours} h</td>
                                            <td>${j.earnings}</td>
                                        </tr>
                                    ))}
                                    {history.jobs.length === 0 && <tr><td colSpan="3" style={{textAlign: 'center', opacity: 0.5}}>Ninguno</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="report-totals">
                    <div className="total-item">
                        <label>Presupuesto Inicial</label>
                        <span>${initialBudget.toFixed(2)}</span>
                    </div>
                    <div className="total-item">
                        <label>Total Gastado</label>
                        <span className="cost-val">${totalSpent.toFixed(2)}</span>
                    </div>
                    <div className="total-item">
                        <label>Total Ganado</label>
                        <span className="earn-val">${totalEarned.toFixed(2)}</span>
                    </div>
                    <div className="total-item final-balance">
                        <label>Saldo Final</label>
                        <span>${finalStats.budget.toFixed(2)}</span>
                    </div>
                    <div className="total-item">
                        <label>Tiempo Total</label>
                        <span>{totalTime} min ({(totalTime / 60).toFixed(2)} h)</span>
                    </div>
                </div>

                <button className="finish-btn" onClick={onClose}>Finalizar y Regresar al Mapa</button>
            </div>
        </div>
    );
};

export default FinalReport;
