import React from 'react';

const AirportSidebar = ({ airport, onClose }) => {
    if (!airport) return null;

    return (
        <div className="sidebar animate-slide-in" style={{ overflowY: 'auto', maxHeight: '90vh' }}>
            <button className="close-btn" onClick={onClose}>&times;</button>
            <div className="sidebar-header">
                <div>
                    <h2>{airport.id}</h2>
                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {airport.nombre}
                    </div>
                </div>
                <span className={`badge ${airport.esHub ? 'badge-hub' : 'badge-secondary'}`}>
                    {airport.esHub ? 'HUB' : 'SECONDARY'}
                </span>
            </div>
            
            <div className="sidebar-content">
                <div className="info-group">
                    <label>Ubicación</label>
                    <p>{airport.ciudad}, {airport.pais}</p>
                </div>
                
                <div className="info-group">
                    <label>Zona Horaria</label>
                    <p>{airport.zonaHoraria}</p>
                </div>

                <div className="info-group">
                    <label>Costos Base (USD)</label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        <div className="tag">🏨 Alojamiento: ${airport.costoAlojamiento}</div>
                        <div className="tag">🍽️ Comida: ${airport.costoAlimentacion}</div>
                    </div>
                </div>
                
                <div className="info-group">
                    <label>Actividades Turísticas</label>
                    {airport.actividades && airport.actividades.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {airport.actividades.map((act, idx) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 600 }}>{act.nombre} <span style={{fontSize: '12px', color: 'var(--accent-secondary)'}}>[{act.tipo}]</span></div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        ⏱️ {act.duracionMin} min | 💰 ${act.costoUSD}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="tag-empty">No hay actividades registradas.</p>
                    )}
                </div>

                <div className="info-group">
                    <label>Trabajos Disponibles</label>
                    {airport.trabajos && airport.trabajos.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {airport.trabajos.map((trabajo, idx) => (
                                <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #00E5FF' }}>
                                    <div style={{ fontWeight: 600 }}>{trabajo.nombre}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        💵 ${trabajo.tarifaHora}/hora | ⏳ Máx: {trabajo.maxHoras}h
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="tag-empty">No hay trabajos registrados.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AirportSidebar;
