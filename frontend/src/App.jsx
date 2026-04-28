import { useState, useEffect } from 'react';
import NetworkGraph from './components/NetworkGraph';
import AirportSidebar from './components/AirportSidebar';
import { fetchNetworkData } from './services/api';
import './index.css';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchNetworkData();
      setGraphData(data);
      setLoading(false);
    };
    
    loadData();
  }, []);

  return (
    <div className="app-container">
      <header className="glass-header">
        <h1>SkyRoute <span>Planner</span></h1>
        <p className="subtitle">Network Optimization Graph</p>
      </header>

      {loading ? (
        <div className="loading">Loading network data...</div>
      ) : (
        <NetworkGraph 
          data={graphData} 
          onNodeClick={(node) => setSelectedAirport(node)} 
        />
      )}

      {selectedAirport && (
        <AirportSidebar 
          airport={selectedAirport} 
          onClose={() => setSelectedAirport(null)} 
        />
      )}
    </div>
  );
}

export default App;
