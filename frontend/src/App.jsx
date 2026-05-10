import { useState, useEffect, useCallback } from 'react';
import NetworkGraph from './components/NetworkGraph';
import AirportSidebar from './components/AirportSidebar';
import PlanningPanel from './components/PlanningPanel';
import ItineraryResults from './components/ItineraryResults';
import TripSimulator from './components/TripSimulator';
import AirportStayPanel from './components/AirportStayPanel';
import LegSelector from './components/LegSelector';
import FinalReport from './components/FinalReport';
import { fetchNetworkData, toggleRouteStatus, planBestRoute, planMaximizeDestinations } from './services/api';
import './index.css';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planResults, setPlanResults] = useState(null);
  const [highlightedRoute, setHighlightedRoute] = useState([]);
  
  // Simulation & Interactive State
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeItinerary, setActiveItinerary] = useState(null);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [travelerProgress, setTravelerProgress] = useState(0);
  const [activeLeg, setActiveLeg] = useState(null);
  const [interruptedLeg, setInterruptedLeg] = useState(null);
  const [planningParams, setPlanningParams] = useState(null);
  
  // Phase Management: 'flying' | 'at_airport' | 'selecting_leg' | 'finished'
  const [tripPhase, setTripPhase] = useState('none');

  // Dynamic Trip Balances
  const [tripStats, setTripStats] = useState({
    budget: 0,
    initialBudget: 0,
    timeRemaining: 0,
    distanciaTotal: 0,
    distanciaSubsidiada: 0,
    hoursSinceMeal: 0,
    hoursSinceSleep: 0,
    currentAirportId: null
  });

  // History for Report
  const [history, setHistory] = useState({
    destinations: [],
    flights: [],
    activities: [],
    jobs: []
  });

  const loadData = useCallback(async () => {
    const data = await fetchNetworkData();
    setGraphData(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearResults = () => {
    setPlanResults(null);
    setHighlightedRoute([]);
    setIsSimulating(false);
    setActiveItinerary(null);
    setTripPhase('none');
  };

  const handleStartTrip = (itinerary, budget, timeHours) => {
    setActiveItinerary(itinerary);
    setCurrentLegIndex(0);
    setTripPhase('at_airport');
    setIsSimulating(true);
    
    const startAirport = itinerary[0].origen;
    const initialBudget = budget || 5000; // Default if not provided
    const initialTime = (timeHours || 72) * 60; // Default 72h if not provided

    setTripStats({
      budget: initialBudget,
      initialBudget: initialBudget,
      timeRemaining: initialTime,
      distanciaTotal: 0,
      distanciaSubsidiada: 0,
      hoursSinceMeal: 0,
      hoursSinceSleep: 0,
      currentAirportId: startAirport
    });

    setHistory({
      destinations: [],
      flights: [],
      activities: [],
      jobs: []
    });
  };

  const handleLinkClick = async (link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    const newStatus = link.activa === false;
    try {
      await toggleRouteStatus(sourceId, targetId, newStatus);
      await loadData();
      if (activeLeg && activeLeg.origen === sourceId && activeLeg.destino === targetId && !newStatus) {
        setInterruptedLeg(activeLeg);
      }
    } catch (err) {
      alert("Error al modificar estado de la ruta");
    }
  };

  const handleStayComplete = (stayData) => {
    // Update stats with costs and time from stay
    setTripStats(prev => ({
      ...prev,
      budget: prev.budget - stayData.totalCost + stayData.totalEarnings,
      timeRemaining: prev.timeRemaining - stayData.totalTime,
      hoursSinceMeal: stayData.resetMeal ? 0 : prev.hoursSinceMeal + (stayData.totalTime / 60),
      hoursSinceSleep: stayData.resetSleep ? 0 : prev.hoursSinceSleep + (stayData.totalTime / 60)
    }));

    // Record history
    setHistory(prev => ({
      ...prev,
      destinations: [...prev.destinations, {
        id: tripStats.currentAirportId,
        stayTime: stayData.totalTime,
        cost: stayData.totalCost,
        earnings: stayData.totalEarnings
      }],
      activities: [...prev.activities, ...stayData.activities],
      jobs: [...prev.jobs, ...stayData.jobs]
    }));

    // Check if trip is finished (reached the last destination in itinerary)
    if (currentLegIndex >= activeItinerary.length) {
      setTripPhase('finished');
      setIsSimulating(false);
    } else {
      setTripPhase('selecting_leg');
    }
  };

  const handleLegSelected = (legData) => {
    // legData: { aircraft, cost, time, distance, isSubsidized }
    setActiveLeg({
      origen: tripStats.currentAirportId,
      destino: activeItinerary[currentLegIndex].destino,
      aeronave: legData.aircraft,
      distancia: legData.distance,
      costo: legData.cost,
      tiempo: legData.time
    });
    
    setTripPhase('flying');
  };

  const handleFlightComplete = (flightData) => {
    // Update stats
    setTripStats(prev => ({
      ...prev,
      budget: prev.budget - flightData.costo,
      timeRemaining: prev.timeRemaining - flightData.tiempo,
      distanciaTotal: prev.distanciaTotal + flightData.distancia,
      distanciaSubsidiada: prev.distanciaSubsidiada + (flightData.costo === 0 ? flightData.distancia : 0),
      hoursSinceMeal: prev.hoursSinceMeal + (flightData.tiempo / 60),
      hoursSinceSleep: prev.hoursSinceSleep + (flightData.tiempo / 60),
      currentAirportId: flightData.destino
    }));

    // Record flight
    setHistory(prev => ({
      ...prev,
      flights: [...prev.flights, flightData]
    }));

    setCurrentLegIndex(prev => prev + 1);
    setTripPhase('at_airport');
  };

  const handleInterruptionComplete = async (returnAirport) => {
    setInterruptedLeg(null);
    setTravelerProgress(0);
    setActiveLeg(null);
    
    // Auto Recalculate
    if (planningParams) {
      try {
        let newResults;
        if (planningParams.type === 'maximize') {
          newResults = await planMaximizeDestinations({ ...planningParams.args, origen: returnAirport });
          setPlanResults({ type: 'maximize', data: newResults, args: planningParams.args });
        } else {
          newResults = await planBestRoute({ ...planningParams.args, origen: returnAirport });
          setPlanResults({ type: 'route', data: newResults, args: planningParams.args });
        }
        setIsSimulating(false);
        setActiveItinerary(null);
        setTripPhase('none');
      } catch (err) {
        alert("No se pudo encontrar una ruta alternativa");
        setIsSimulating(false);
        setTripPhase('none');
      }
    }
  };

  const handleStopTrip = () => {
    setIsSimulating(false);
    setTripPhase('none');
    setActiveItinerary(null);
    setActiveLeg(null);
    setTravelerProgress(0);
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
            onLinkClick={handleLinkClick}
            highlightedRoute={highlightedRoute}
            travelerProgress={travelerProgress}
            activeLeg={activeLeg}
          />

          <PlanningPanel
            airports={graphData.nodes || []}
            onResults={(results) => {
              setPlanResults(results);
              setPlanningParams({ type: results.type, args: results.args });
            }}
            onHighlightRoute={(route) => setHighlightedRoute(route)}
          />
        </>
      )}

      {selectedAirport && (
        <AirportSidebar airport={selectedAirport} onClose={() => setSelectedAirport(null)} />
      )}

      {planResults && tripPhase === 'none' && (
        <ItineraryResults
          results={planResults}
          onClose={handleClearResults}
          onHighlightRoute={(route) => setHighlightedRoute(route)}
          onStartTrip={(itinerary) => handleStartTrip(itinerary, planningParams.args.presupuesto, planningParams.args.tiempoDisponible)}
        />
      )}

      {/* R2.3: Interactive Phases */}
      {isSimulating && tripPhase === 'at_airport' && (
        <AirportStayPanel
          airportId={tripStats.currentAirportId}
          airports={graphData.nodes}
          stats={tripStats}
          onComplete={handleStayComplete}
        />
      )}

      {isSimulating && tripPhase === 'selecting_leg' && (
        <LegSelector
          originId={tripStats.currentAirportId}
          destId={activeItinerary[currentLegIndex]?.destino}
          airports={graphData.nodes}
          edges={graphData.links}
          config={graphData.config}
          stats={tripStats}
          onSelect={handleLegSelected}
        />
      )}

      {isSimulating && tripPhase === 'flying' && activeLeg && (
        <TripSimulator 
          itinerary={[activeLeg]} // In interactive mode, we fly one leg at a time
          onProgressUpdate={(p) => setTravelerProgress(p)}
          onLegComplete={() => handleFlightComplete(activeLeg)}
          onInterruption={handleInterruptionComplete}
          isInterrupted={!!interruptedLeg}
        />
      )}

      {tripPhase === 'finished' && (
        <FinalReport 
          history={history} 
          initialBudget={tripStats.initialBudget} 
          finalStats={tripStats}
          onClose={handleClearResults} 
        />
      )}
      
      {isSimulating && (
        <button className="stop-sim-btn" onClick={handleStopTrip}>
          Detener Viaje
        </button>
      )}
    </div>
  );
}

export default App;
