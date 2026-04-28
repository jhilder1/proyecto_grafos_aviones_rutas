const API_URL = 'http://localhost:8000/api';

export const fetchNetworkData = async () => {
    try {
        const response = await fetch(`${API_URL}/network`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        // react-force-graph expects 'links' instead of 'edges'
        return { nodes: data.nodes || [], links: data.edges || [] };
    } catch (error) {
        console.error("Error fetching network data:", error);
        return { nodes: [], links: [] };
    }
};

export const fetchAirportDetails = async (iata) => {
    try {
        const response = await fetch(`${API_URL}/airport/${iata}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching airport details:", error);
        return null;
    }
};
