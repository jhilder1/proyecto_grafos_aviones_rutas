import React, { useState } from 'react';

const ItineraryResults = ({ results, onClose, onHighlightRoute }) => {
    const [activeTab, setActiveTab] = useState(0);

    if (!results) return null;

    const renderTramos = (tramos) => {
        if (!tramos || tramos.length === 0) {
            return <p className="tag-empty">No se encontraron tramos.</p>;
        }
        return (
            <div className="tramos-list">
                {tramos.map((tramo, idx) => (
                    <div key={idx} className="tramo-card">
                        <div className="tramo-header">
                            <span className="tramo-route">
                                {tramo.origen} → {tramo.destino}
                            </span>
                            <span className="tramo-aircraft">{tramo.aeronave}</span>
                        </div>
                        <div className="tramo-details">
                            <span>📏 {tramo.distancia} km</span>
                            <span>💰 ${tramo.costo}</span>
                            <span>⏱️ {tramo.tiempo.toFixed(1)} min</span>
                        </div>
                        <div className="tramo-accumulated">
                            Acum: ${tramo.costo_acumulado} | {tramo.tiempo_acumulado?.toFixed(1)} min
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderResumen = (resumen) => {
        if (!resumen) return null;
        return (
            <div className="resumen-card">
                <div className="resumen-grid">
                    <div className="resumen-item">
                        <span className="resumen-label">Destinos</span>
                        <span className="resumen-value">{resumen.total_destinos}</span>
                    </div>
                    <div className="resumen-item">
                        <span className="resumen-label">Distancia</span>
                        <span className="resumen-value">{resumen.total_distancia} km</span>
                    </div>
                    <div className="resumen-item">
                        <span className="resumen-label">Costo Total</span>
                        <span className="resumen-value">${resumen.total_costo}</span>
                    </div>
                    <div className="resumen-item">
                        <span className="resumen-label">Tiempo Total</span>
                        <span className="resumen-value">{resumen.total_tiempo?.toFixed(1)} min</span>
                    </div>
                </div>
                {resumen.tipos_usados && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Transporte usado: {resumen.tipos_usados.join(', ') || 'Ninguno'}
                    </div>
                )}
            </div>
        );
    };

    // Build tabs based on result type
    let tabs = [];

    if (results.type === 'maximize') {
        const d = results.data;
        tabs = [
            {
                label: '💰 Max por Presupuesto',
                ruta: d.itinerario_presupuesto?.ruta || [],
                tramos: d.itinerario_presupuesto?.tramos || [],
                resumen: d.itinerario_presupuesto?.resumen
            },
            {
                label: '⏱️ Max por Tiempo',
                ruta: d.itinerario_tiempo?.ruta || [],
                tramos: d.itinerario_tiempo?.tramos || [],
                resumen: d.itinerario_tiempo?.resumen
            }
        ];
    } else if (results.type === 'route') {
        tabs = (results.data.resultados || []).map(r => ({
            label: `📍 ${r.criterio.charAt(0).toUpperCase() + r.criterio.slice(1)}`,
            ruta: r.ruta || [],
            tramos: r.itinerario || [],
            resumen: r.resumen,
            mensaje: r.mensaje
        }));
    }

    const currentTab = tabs[activeTab] || tabs[0];

    return (
        <div className="results-overlay">
            <div className="results-panel animate-slide-in">
                <div className="results-header">
                    <h3>📋 Resultados del Itinerario</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {/* Tab selector */}
                {tabs.length > 1 && (
                    <div className="results-tabs">
                        {tabs.map((tab, idx) => (
                            <button
                                key={idx}
                                className={`results-tab ${activeTab === idx ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab(idx);
                                    if (tab.ruta?.length > 1) {
                                        onHighlightRoute(tab.ruta);
                                    }
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Route display */}
                {currentTab && (
                    <div className="results-content">
                        {currentTab.mensaje ? (
                            <p className="planning-error">{currentTab.mensaje}</p>
                        ) : (
                            <>
                                <div className="route-path">
                                    <label>Ruta:</label>
                                    <div className="route-nodes">
                                        {currentTab.ruta.map((node, idx) => (
                                            <span key={idx}>
                                                <span className="route-node">{node}</span>
                                                {idx < currentTab.ruta.length - 1 && (
                                                    <span className="route-arrow">→</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {renderResumen(currentTab.resumen)}
                                <div style={{ marginTop: '12px' }}>
                                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        Detalle de Tramos
                                    </label>
                                    {renderTramos(currentTab.tramos)}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItineraryResults;
