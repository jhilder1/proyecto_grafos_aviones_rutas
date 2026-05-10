import { useState, useEffect } from 'react';
import NetworkGraph from './components/NetworkGraph';
import AirportSidebar from './components/AirportSidebar';
import PlanningPanel from './components/PlanningPanel';
import ItineraryResults from './components/ItineraryResults';
import { fetchNetworkData } from './services/api';
import './index.css';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planResults, setPlanResults] = useState(null);
  const [highlightedRoute, setHighlightedRoute] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchNetworkData();
      setGraphData(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleClearResults = () => {
    setPlanResults(null);
    setHighlightedRoute([]);
  };

  return (
    <div className="app-container">
      <header className="glass-header">
        <h1>SkyRoute <span>Planner</span></h1>
        <p className="subtitle">Network Optimization Graph</p>
      </header>

      {loading ? (
        <div className="loading">Loading network data...</div>
      ) : (
        <>
          <NetworkGraph
            data={graphData}
            onNodeClick={(node) => setSelectedAirport(node)}
            highlightedRoute={highlightedRoute}
          />

          <PlanningPanel
            airports={graphData.nodes || []}
            onResults={(results) => setPlanResults(results)}
            onHighlightRoute={(route) => setHighlightedRoute(route)}
          />
        </>
      )}

      {selectedAirport && (
        <AirportSidebar
          airport={selectedAirport}
          onClose={() => setSelectedAirport(null)}
        />
      )}

      {planResults && (
        <ItineraryResults
          results={planResults}
          onClose={handleClearResults}
          onHighlightRoute={(route) => setHighlightedRoute(route)}
        />
      )}
    </div>
  );
}

export default App;
