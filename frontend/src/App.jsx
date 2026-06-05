import { useState, useEffect, useCallback } from 'react';
import NetworkGraph from './components/NetworkGraph';
import AirportSidebar from './components/AirportSidebar';
import PlanningPanel from './components/PlanningPanel';
import ItineraryResults from './components/ItineraryResults';
import TripSimulator from './components/TripSimulator';
import AirportStayPanel from './components/AirportStayPanel';
import LegSelector from './components/LegSelector';
import FinalReport from './components/FinalReport';
import StartupScreen from './components/StartupScreen';
import ConfigPanel from './components/ConfigPanel';
import DestinationPicker from './components/DestinationPicker';
import { fetchNetworkData, toggleRouteStatus, planBestRoute, planMaximizeDestinations } from './services/api';
import './index.css';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [appState, setAppState] = useState('startup'); // 'startup', 'loading', 'ready'
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
  
  // Phase Management: 'flying' | 'at_airport' | 'selecting_leg' | 'picking_destination' | 'finished'
  const [tripPhase, setTripPhase] = useState('none');
  
  // Trip mode: 'guided' (follows pre-calculated itinerary) | 'free' (R2.3 step-by-step exploration)
  const [tripMode, setTripMode] = useState('guided');
  
  const [showConfig, setShowConfig] = useState(false);

  // Dynamic Trip Balances
  const [tripStats, setTripStats] = useState({
    budget: 0,
    initialBudget: 0,
    timeRemaining: 0,
    initialTime: 0,
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

  // Visited airports for free exploration
  const [visitedAirports, setVisitedAirports] = useState([]);

  const loadData = useCallback(async () => {
    setAppState('loading');
    const data = await fetchNetworkData();
    setGraphData(data);
    setAppState('ready');
  }, []);

  // Removed auto-loading useEffect so StartupScreen can handle it.

  const handleClearResults = () => {
    setPlanResults(null);
    setHighlightedRoute([]);
    setIsSimulating(false);
    setActiveItinerary(null);
    setTripPhase('none');
    setTripMode('guided');
    setVisitedAirports([]);
  };

  // ── Guided Trip (R2.2) ─────────────────────────────────────
  const handleStartTrip = (itinerary, budget, timeHours) => {
    setActiveItinerary(itinerary);
    setCurrentLegIndex(0);
    setTripPhase('at_airport');
    setIsSimulating(true);
    setTripMode('guided');
    
    const startAirport = itinerary[0].origen;
    const initialBudget = budget || 5000;
    const initialTime = (timeHours || 72) * 60;

    setTripStats({
      budget: initialBudget,
      initialBudget: initialBudget,
      initialTime: initialTime,
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

    setVisitedAirports([startAirport]);
    setHighlightedRoute([startAirport]);
  };

  // ── Free Exploration Trip (R2.3) ───────────────────────────
  const handleStartFreeExploration = (originIata, budget, timeHours) => {
    setTripPhase('at_airport');
    setIsSimulating(true);
    setTripMode('free');
    setActiveItinerary(null);
    
    const initialBudget = budget || 5000;
    const initialTime = (timeHours || 72) * 60;

    setTripStats({
      budget: initialBudget,
      initialBudget: initialBudget,
      initialTime: initialTime,
      timeRemaining: initialTime,
      distanciaTotal: 0,
      distanciaSubsidiada: 0,
      hoursSinceMeal: 0,
      hoursSinceSleep: 0,
      currentAirportId: originIata
    });

    setHistory({
      destinations: [],
      flights: [],
      activities: [],
      jobs: []
    });

    setVisitedAirports([originIata]);
    setHighlightedRoute([originIata]);
    setPlanResults(null);
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

    if (tripMode === 'free') {
      // In free mode, go to destination picker after stay
      setTripPhase('picking_destination');
    } else {
      // Guided mode: check if trip is finished
      if (currentLegIndex >= activeItinerary.length) {
        setTripPhase('finished');
        setIsSimulating(false);
      } else {
        setTripPhase('selecting_leg');
      }
    }
  };

  // ── Free Exploration: Destination chosen ────────────────────
  const handleFreeDestinationSelected = (destData) => {
    // destData: { destino, aircraft, cost, time, distance, isSubsidized }
    setActiveLeg({
      origen: tripStats.currentAirportId,
      destino: destData.destino,
      aeronave: destData.aircraft,
      distancia: destData.distance,
      costo: destData.cost,
      tiempo: destData.time
    });
    
    setTripPhase('flying');
  };

  // ── Guided: Leg chosen ──────────────────────────────────────
  const handleLegSelected = (legData) => {
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
    setTripStats(prev => {
      const newHoursSinceMeal = prev.hoursSinceMeal + (flightData.tiempo / 60);
      const originNode = graphData.nodes.find(n => n.id === flightData.origen);
      
      return {
        ...prev,
        budget: prev.budget - flightData.costo,
        timeRemaining: prev.timeRemaining - flightData.tiempo,
        distanciaTotal: prev.distanciaTotal + flightData.distancia,
        distanciaSubsidiada: prev.distanciaSubsidiada + (flightData.costo === 0 ? flightData.distancia : 0),
        hoursSinceMeal: newHoursSinceMeal,
        hoursSinceSleep: prev.hoursSinceSleep + (flightData.tiempo / 60),
        currentAirportId: flightData.destino,
        mealTriggeredDuringFlight: prev.hoursSinceMeal < 8 && newHoursSinceMeal >= 8,
        lastAirportMealCost: originNode ? originNode.costoAlimentacion : 0
      };
    });

    // Record flight
    setHistory(prev => ({
      ...prev,
      flights: [...prev.flights, flightData]
    }));

    // Update visited airports and highlighted route
    setVisitedAirports(prev => [...prev, flightData.destino]);
    setHighlightedRoute(prev => [...prev, flightData.destino]);

    if (tripMode === 'guided') {
      setCurrentLegIndex(prev => prev + 1);
    }
    
    setTripPhase('at_airport');
  };

  const handleInterruptionComplete = async (returnAirport) => {
    setInterruptedLeg(null);
    setTravelerProgress(0);
    setActiveLeg(null);
    
    if (tripMode === 'free') {
      // In free mode, just go back to picking
      setTripStats(prev => ({ ...prev, currentAirportId: returnAirport }));
      setTripPhase('picking_destination');
      return;
    }

    // Guided mode: Auto Recalculate
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

  const handleFinishFreeTrip = () => {
    setTripPhase('finished');
    setIsSimulating(false);
  };

  const handleStopTrip = () => {
    setIsSimulating(false);
    setTripPhase('none');
    setTripMode('guided');
    setActiveItinerary(null);
    setActiveLeg(null);
    setTravelerProgress(0);
    setVisitedAirports([]);
    setHighlightedRoute([]);
  };

  return (
    <div className="app-container">
      {appState === 'startup' && (
        <StartupScreen onStart={() => loadData()} />
      )}

      {appState === 'loading' && (
        <div className="loading">Cargando red de vuelos...</div>
      )}

      {appState === 'ready' && (
        <>
          <header className="glass-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>SkyRoute <span>Planner</span></h1>
              <p className="subtitle">Network Optimization Graph</p>
            </div>
            <button 
              className="btn-secondary" 
              onClick={() => setShowConfig(true)}
              style={{ fontSize: '14px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              ⚙️ Configuración
            </button>
          </header>

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
            onStartFreeExploration={handleStartFreeExploration}
          />

          {showConfig && (
            <ConfigPanel 
              config={graphData.config} 
              onClose={() => setShowConfig(false)} 
              onSaveComplete={() => {
                setShowConfig(false);
                loadData();
              }} 
            />
          )}

      {selectedAirport && (
        <AirportSidebar airport={selectedAirport} onClose={() => setSelectedAirport(null)} />
      )}

      {planResults && tripPhase === 'none' && (
        <ItineraryResults
          results={planResults}
          airports={graphData.nodes}
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

      {/* Guided mode: select aircraft for next pre-calculated leg */}
      {isSimulating && tripPhase === 'selecting_leg' && tripMode === 'guided' && (
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

      {/* R2.3 Free mode: pick destination freely */}
      {isSimulating && tripPhase === 'picking_destination' && tripMode === 'free' && (
        <DestinationPicker
          currentAirportId={tripStats.currentAirportId}
          airports={graphData.nodes}
          stats={tripStats}
          config={graphData.config}
          visitedAirports={visitedAirports}
          onSelectDestination={handleFreeDestinationSelected}
          onFinishTrip={handleFinishFreeTrip}
        />
      )}

      {isSimulating && tripPhase === 'flying' && activeLeg && (
        <TripSimulator 
          itinerary={[activeLeg]}
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
          initialTime={tripStats.initialTime}
          finalStats={tripStats}
          airports={graphData.nodes}
          highlightedRoute={highlightedRoute}
          onClose={handleClearResults} 
        />
      )}
      
      {isSimulating && (
        <button className="stop-sim-btn" onClick={handleStopTrip}>
          Detener Viaje
        </button>
      )}
      </>
      )}
    </div>
  );
}

export default App;