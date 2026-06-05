import React, { useRef, useState } from 'react';
import { uploadNetworkData } from '../services/api';

const StartupScreen = ({ onStart }) => {
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDefaultStart = () => {
        onStart(); // Proceed with default backend graph
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonData = JSON.parse(event.target.result);
                await uploadNetworkData(jsonData);
                onStart(); // Successfully uploaded and reloaded backend
            } catch (err) {
                console.error("Upload error:", err);
                setError("Error procesando el archivo JSON. Verifica su formato.");
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="startup-overlay">
            <div className="startup-panel animate-slide-in">
                <h2>✈️ Bienvenido a SkyRoute Planner</h2>
                <p>Selecciona una opción para comenzar a planificar:</p>

                <div className="startup-actions">
                    <button className="btn-primary" onClick={handleDefaultStart} disabled={loading}>
                        Usar Red por Defecto
                    </button>
                    
                    <div className="divider">O</div>
                    
                    <button className="btn-secondary" onClick={() => fileInputRef.current.click()} disabled={loading}>
                        Cargar JSON Externo
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
