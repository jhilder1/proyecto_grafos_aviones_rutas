// App.jsx
// Main React application component. Orchestrates UI panels, state, and
// interactions between the graph visualization and planning/simulation controls.
// High-level responsibilities:
// - Load network data from backend
// - Manage current selection, planning results and simulation state
// - Compose child panels (NetworkGraph, PlanningPanel, TripSimulator, etc.)
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
  const [linkToBlock, setLinkToBlock] = useState(null);

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

  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setAppState('loading');
    const data = await fetchNetworkData();
    setGraphData(data);
    if (!quiet) setAppState('ready');
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
  const handleStartTrip = (itinerary, budget, timeHours, isRecalculation = false) => {
    setActiveItinerary(itinerary);
    setCurrentLegIndex(0);
    setTripPhase(isRecalculation ? 'selecting_leg' : 'at_airport');
    setIsSimulating(true);
    setTripMode('guided');
    
    if (!isRecalculation) {
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
        currentAirportId: startAirport,
        estanciaMinima: 0
      });

      setHistory({
        destinations: [],
        flights: [],
        activities: [],
        jobs: []
      });

      setVisitedAirports([startAirport]);
      setHighlightedRoute([startAirport]);
    } else {
      // Restore highlightedRoute to just the actual visited path so animation works correctly
      setHighlightedRoute([...visitedAirports]);
    }
  };

  const [suggestedRoute, setSuggestedRoute] = useState([]);
  
  // ── Free Exploration Trip (R2.3) ───────────────────────────
  const handleStartFreeExploration = (originIata, budget, timeHours, suggested = []) => {
    setTripPhase('at_airport');
    setIsSimulating(true);
    setTripMode('free');
    setActiveItinerary(null);
    setSuggestedRoute(suggested);
    
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
    
    if (link.activa === false) {
      try {
        await toggleRouteStatus(sourceId, targetId, true, null);
        await loadData(true);
      } catch (err) {
        alert("Error al modificar estado de la ruta");
      }
    } else {
      setLinkToBlock({ source: sourceId, target: targetId });
    }
  };

  const recalculateFreeModeSuggestion = async (airport, budget, timeRemaining, visited) => {
    try {
      const args = { 
        origen: airport, 
        presupuesto: budget, 
        tiempoDisponible: timeRemaining / 60,
        visitados_previos: visited
      };
      const result = await planMaximizeDestinations(args);
      if (result && result.itinerario_presupuesto && result.itinerario_presupuesto.ruta) {
        const futureRoute = result.itinerario_presupuesto.ruta;
        const futurePart = futureRoute[0] === airport ? futureRoute.slice(1) : futureRoute;
        const pastPart = visited[visited.length - 1] === airport ? visited.slice(0, -1) : visited;
        setSuggestedRoute([...pastPart, airport, ...futurePart]);
      }
    } catch (err) {
      console.error("Error recalculando sugerencia", err);
    }
  };

  const confirmLinkBlock = async (motivo) => {
    if (!linkToBlock) return;
    const { source, target } = linkToBlock;
    setLinkToBlock(null);
    try {
      await toggleRouteStatus(source, target, false, motivo);
      await loadData(true);
      
      if (activeLeg && activeLeg.origen === source && activeLeg.destino === target) {
        setInterruptedLeg({ ...activeLeg, motivo });
      } else if (activeItinerary && currentLegIndex < activeItinerary.length) {
        const futureLegs = activeItinerary.slice(currentLegIndex);
        const isAffected = futureLegs.some(leg => leg.origen === source && leg.destino === target);
        if (isAffected) {
          alert(`ATENCIÓN: La ruta ${source} → ${target} ha sido bloqueada. Tu itinerario futuro se ve afectado. Recalculando ruta...`);
          handleInterruptionComplete(tripStats.currentAirportId);
        }
      }

      if (tripMode === 'free') {
        await recalculateFreeModeSuggestion(tripStats.currentAirportId, tripStats.budget, tripStats.timeRemaining, visitedAirports);
      }
    } catch (err) {
      alert("Error al bloquear la ruta");
    }
  };

  const handleExplicitInterruption = async (motivo) => {
    if (!activeLeg) return;
    try {
      // Bloquear la ruta actual en el backend
      await toggleRouteStatus(activeLeg.origen, activeLeg.destino, false, motivo);
      await loadData(true);
      setInterruptedLeg({ ...activeLeg, motivo });

      if (tripMode === 'free') {
        await recalculateFreeModeSuggestion(tripStats.currentAirportId, tripStats.budget, tripStats.timeRemaining, visitedAirports);
      }
    } catch (err) {
      alert("Error al interrumpir la ruta actual");
    }
  };

  const handleStayComplete = (stayData) => {
    // Update stats with costs and time from stay
    setTripStats(prev => ({
      ...prev,
      budget: prev.budget - stayData.totalCost + stayData.totalEarnings,
      timeRemaining: prev.timeRemaining - stayData.totalTime,
      hoursSinceMeal: stayData.resetMeal ? (stayData.totalTime / 60) : prev.hoursSinceMeal + (stayData.totalTime / 60),
      hoursSinceSleep: stayData.resetSleep ? (stayData.totalTime / 60) : prev.hoursSinceSleep + (stayData.totalTime / 60)
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
      tiempo: destData.time,
      estanciaMinima: destData.estanciaMinima || 0
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
      tiempo: legData.time,
      estanciaMinima: legData.estanciaMinima || 0
    });
    
    setTripPhase('flying');
  };

  const handleFlightComplete = (flightData) => {
    // Update stats
    setTripStats(prev => {
      const newHoursSinceMeal = prev.hoursSinceMeal + (flightData.tiempo / 60);
      const originNode = graphData.nodes.find(n => n.id === flightData.origen);
      const mealInterval = graphData.config?.intervaloAlimentacion || 8;
      
      return {
        ...prev,
        budget: prev.budget - flightData.costo,
        timeRemaining: prev.timeRemaining - flightData.tiempo,
        distanciaTotal: prev.distanciaTotal + flightData.distancia,
        distanciaSubsidiada: prev.distanciaSubsidiada + (flightData.costo === 0 ? flightData.distancia : 0),
        hoursSinceMeal: newHoursSinceMeal,
        hoursSinceSleep: prev.hoursSinceSleep + (flightData.tiempo / 60),
        currentAirportId: flightData.destino,
        mealTriggeredDuringFlight: prev.hoursSinceMeal < mealInterval && newHoursSinceMeal >= mealInterval,
        lastAirportMealCost: originNode ? originNode.costoAlimentacion : 0,
        estanciaMinima: flightData.estanciaMinima || 0
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
        const remainingTimeHours = tripStats.timeRemaining / 60;
        const newArgs = { 
          ...planningParams.args, 
          origen: returnAirport, 
          presupuesto: tripStats.budget, 
          tiempoDisponible: remainingTimeHours,
          visitados_previos: visitedAirports
        };
        
        if (planningParams.type === 'maximize') {
          newResults = await planMaximizeDestinations(newArgs);
          setPlanResults({ type: 'maximize', data: newResults, args: newArgs, isRecalculation: true });
        } else {
          newResults = await planBestRoute(newArgs);
          setPlanResults({ type: 'route', data: newResults, args: newArgs, isRecalculation: true });
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
    setTripPhase('finished');
    setIsSimulating(false);
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
          onHighlightRoute={(route) => {
            if (planResults.isRecalculation) {
                const lastVisited = visitedAirports[visitedAirports.length - 1];
                const futureRoute = route[0] === lastVisited ? route.slice(1) : route;
                setHighlightedRoute([...visitedAirports, ...futureRoute]);
            } else {
                setHighlightedRoute(route);
            }
          }}
          onStartTrip={(itinerary) => handleStartTrip(itinerary, planningParams.args.presupuesto, planningParams.args.tiempoDisponible, planResults.isRecalculation)}
        />
      )}

      {/* R2.3: Interactive Phases */}
      {isSimulating && tripPhase === 'at_airport' && (
        <AirportStayPanel
          airportId={tripStats.currentAirportId}
          airports={graphData.nodes}
          config={graphData.config}
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
          suggestedRoute={suggestedRoute}
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
          onRequestInterruption={handleExplicitInterruption}
          isInterrupted={!!interruptedLeg}
          interruptedLeg={interruptedLeg}
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

      {linkToBlock && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content" style={{ background: '#1A1A24', padding: '20px', borderRadius: '8px', width: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--danger)' }}>Bloquear Ruta</h3>
                <p style={{ margin: '5px 0 15px', color: '#ccc', fontSize: '14px' }}>
                    {linkToBlock.source} ✈️ {linkToBlock.target}
                </p>
                <label style={{ display: 'block', margin: '15px 0 5px', color: '#ccc', fontSize: '12px' }}>Seleccione el motivo:</label>
                <select 
                    id="link-block-reason"
                    style={{ width: '100%', padding: '10px', background: '#2A2A35', color: '#fff', border: '1px solid #444', borderRadius: '4px', marginBottom: '20px', outline: 'none' }}
                >
                    <option value="Condiciones Meteorológicas">Condiciones Meteorológicas</option>
                    <option value="Tráfico Aéreo">Tráfico Aéreo</option>
                    <option value="Falla Mecánica">Falla Mecánica</option>
                    <option value="Cierre de Espacio Aéreo">Cierre de Espacio Aéreo</option>
                    <option value="Cancelación de Aerolínea">Cancelación de Aerolínea</option>
                </select>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => {
                            const motivo = document.getElementById('link-block-reason').value;
                            confirmLinkBlock(motivo);
                        }}
                        style={{ flex: 1, padding: '10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Bloquear
                    </button>
                    <button 
                        onClick={() => setLinkToBlock(null)}
                        style={{ flex: 1, padding: '10px', background: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

export default App;