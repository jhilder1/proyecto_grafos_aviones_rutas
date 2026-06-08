/* eslint-disable react/prop-types */
// StartupScreen.jsx
// Initial screen shown to the user when the app loads. Provides quick
// instructions and a button to start loading the network.
import React, { useRef, useState } from 'react';
import { uploadNetworkData } from '../services/api';

const StartupScreen = ({ onStart }) => {
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDefaultStart = () => {
        onStart(); // Proceed with default backend graph
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            const fileContent = await file.text();
            const jsonData = JSON.parse(fileContent);
            await uploadNetworkData(jsonData);
            onStart(); // Successfully uploaded and reloaded backend
        } catch (err) {
            console.error("Upload error:", err);
            setError("Error procesando el archivo JSON. Verifica su formato.");
            setLoading(false);
        }
    };

    return (
        <div className="startup-overlay">
            <div className="startup-panel animate-slide-in">
                <div className="startup-badge">SkyRoute Planner</div>
                <h2>✈️ Bienvenido</h2>
                <p>Selecciona una opción para comenzar a planificar tu red de vuelos.</p>

                <div className="startup-actions">
                    <button className="startup-button startup-button-primary" onClick={handleDefaultStart} disabled={loading}>
                        <span className="startup-button-icon">⚡</span>
                        <span>
                            <strong>Usar red por defecto</strong>
                            <small>Inicia con la red cargada en el sistema</small>
                        </span>
                    </button>

                    <div className="startup-divider">
                        <span>o</span>
                    </div>

                    <button className="startup-button startup-button-secondary" onClick={() => fileInputRef.current.click()} disabled={loading}>
                        <span className="startup-button-icon">📄</span>
                        <span>
                            <strong>Cargar JSON externo</strong>
                            <small>Importa una red personalizada desde tu archivo</small>
                        </span>
                    </button>
                    <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleFileUpload} 
                    />
                </div>

                {loading && <p className="loading-text">Cargando datos...</p>}
                {error && <p className="error-text">{error}</p>}
            </div>
        </div>
    );
};

export default StartupScreen;
