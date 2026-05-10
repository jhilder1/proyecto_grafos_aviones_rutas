import React from 'react';

const FinalReport = ({ history, initialBudget, finalStats, onClose }) => {
    const totalSpent = initialBudget - finalStats.budget + history.jobs.reduce((sum, j) => sum + j.earnings, 0);
    const totalEarned = history.jobs.reduce((sum, j) => sum + j.earnings, 0);

    return (
        <div className="report-overlay">
            <div className="report-panel animate-slide-in">
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
                                    <th>Estancia</th>
                                    <th>Gasto</th>
                                    <th>Ganancia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.destinations.map((d, i) => (
                                    <tr key={i}>
                                        <td>{d.id}</td>
                                        <td>{d.stayTime} min</td>
                                        <td>${d.cost}</td>
                                        <td>${d.earnings}</td>
                                    </tr>
                                ))}
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
                        <ul className="mini-list">
                            {history.activities.map((a, i) => (
                                <li key={i}>{a.nombre} (${a.costoUSD})</li>
                            ))}
                            {history.activities.length === 0 && <li>Ninguna</li>}
                        </ul>
                    </div>
                    <div className="report-section">
                        <h3>💼 Trabajos</h3>
                        <ul className="mini-list">
                            {history.jobs.map((j, i) => (
                                <li key={i}>{j.nombre} (+${j.earnings})</li>
                            ))}
                            {history.jobs.length === 0 && <li>Ninguno</li>}
                        </ul>
                    </div>
                </div>

                <div className="report-totals">
                    <div className="total-item">
                        <label>Presupuesto Inicial</label>
                        <span>${initialBudget}</span>
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
                        <span>{(initialBudget * 60 - finalStats.timeRemaining) / 60} h</span>
                    </div>
                </div>

                <button className="finish-btn" onClick={onClose}>Finalizar y Regresar al Mapa</button>
            </div>
        </div>
    );
};

export default FinalReport;
