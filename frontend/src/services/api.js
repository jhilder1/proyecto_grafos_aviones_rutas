const API_URL = 'http://localhost:8000/api';

export const fetchNetworkData = async () => {
    try {
        const response = await fetch(`${API_URL}/network`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return { nodes: data.nodes || [], links: data.edges || [], config: data.config || {} };
    } catch (error) {
        console.error("Error fetching network data:", error);
        return { nodes: [], links: [], config: {} };
    }
};

export const fetchAirportDetails = async (iata) => {
    try {
        const response = await fetch(`${API_URL}/airport/${iata}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("Error fetching airport details:", error);
        return null;
    }
};

export const planMaximizeDestinations = async (params) => {
    try {
        const response = await fetch(`${API_URL}/plan/maximize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Error en la planificación');
        }
        return await response.json();
    } catch (error) {
        console.error("Error planning max destinations:", error);
        throw error;
    }
};

export const planBestRoute = async (params) => {
    try {
        const response = await fetch(`${API_URL}/plan/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Error en la planificación');
        }
        return await response.json();
    } catch (error) {
        console.error("Error planning best route:", error);
        throw error;
    }
};

export const toggleRouteStatus = async (origen, destino, activa) => {
    try {
        const response = await fetch(`${API_URL}/route/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origen, destino, activa })
        });
        if (!response.ok) throw new Error('Error toggling route status');
        return await response.json();
    } catch (error) {
        console.error("Error toggling route status:", error);
        throw error;
    }
};
