import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const NetworkGraph = ({ data, onNodeClick, onLinkClick, highlightedRoute, travelerProgress, activeLeg }) => {
    const fgRef = useRef();
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        if (fgRef.current) {
            // Increase repulsion between nodes
            fgRef.current.d3Force('charge').strength(-800);
            // Increase distance between connected nodes
            fgRef.current.d3Force('link').distance(200);
            // Center force
            fgRef.current.d3Force('center').strength(0.5);
        }
    }, [data]);

    // Build sets for highlighting
    const highlightedEdges = new Set();
    const highlightedNodes = new Set();
    if (highlightedRoute && highlightedRoute.length > 1) {
        for (let i = 0; i < highlightedRoute.length - 1; i++) {
            highlightedEdges.add(`${highlightedRoute[i]}->${highlightedRoute[i + 1]}`);
        }
        highlightedRoute.forEach(n => highlightedNodes.add(n));
    }

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Custom drawing for nodes
    const nodeCanvasObject = (node, ctx, globalScale) => {
        const label = node.id;
        const fontSize = 14 / globalScale;
        ctx.font = `${fontSize}px Inter, sans-serif`;

        const isHighlighted = highlightedNodes.has(node.id);
        const size = node.esHub ? 8 : 4;
        const drawSize = isHighlighted ? size * 1.5 : size;

        // Draw Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, drawSize, 0, 2 * Math.PI, false);

        if (isHighlighted) {
            ctx.fillStyle = '#FFD700';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 18;
        } else {
            ctx.fillStyle = node.esHub ? '#FF3366' : '#00E5FF';
            ctx.shadowColor = node.esHub ? '#FF3366' : '#00E5FF';
            ctx.shadowBlur = 10;
        }

        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fill();

        // Draw Label
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Label background for better legibility
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 15, 22, 0.6)';
        ctx.fillRect(node.x - (textWidth/2 + 2), node.y + drawSize + 2, textWidth + 4, fontSize + 4);

        ctx.fillStyle = isHighlighted ? '#FFD700' : '#FFFFFF';
        ctx.shadowBlur = 0;
        ctx.fillText(label, node.x, node.y + drawSize + fontSize + 4);
    };

    // Edge styling
    const getEdgeColor = (link) => {
        if (link.activa === false) return '#FF5252'; // Red for blocked
        
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const edgeKey = `${sourceId}->${targetId}`;

        if (highlightedEdges.has(edgeKey)) return '#FFD700'; // Gold for active itinerary
        return '#3A3A4A';
    };

    const getEdgeWidth = (link) => {
        if (link.activa === false) return 2;
        
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (highlightedEdges.has(`${sourceId}->${targetId}`)) return 3;
        return 1;
    };

    const getEdgeDash = (link) => {
        if (link.activa === false) return [3, 2]; // Dashed for blocked
        return null;
    };

    // Particles logic
    const linkDirectionalParticles = (link) => {
        if (!activeLeg) return 0;
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === activeLeg.origen && targetId === activeLeg.destino) {
            return 1; // Show one particle for the traveler
        }
        return 0;
    };

    return (
        <div className="graph-wrapper" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#0F0F16', zIndex: 0 }}>
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={data}
                nodeId="id"
                nodeCanvasObject={nodeCanvasObject}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                linkCurvature={0.2} // Added curvature for realism
                linkColor={getEdgeColor}
                linkWidth={getEdgeWidth}
                linkLineDash={getEdgeDash}
                linkDirectionalParticles={linkDirectionalParticles}
                linkDirectionalParticleWidth={4}
                linkDirectionalParticleColor={() => '#FFFFFF'}
                linkDirectionalParticleSpeed={0.002}
                onNodeClick={(node) => {
                    fgRef.current.centerAt(node.x, node.y, 1000);
                    fgRef.current.zoom(8, 2000);
                    onNodeClick(node);
                }}
                onLinkClick={onLinkClick}
                linkCanvasObjectMode={() => 'after'}
                linkCanvasObject={(link, ctx, globalScale) => {
                    const MAX_FONT_SIZE = 4;
                    const start = link.source;
                    const end = link.target;
                    if (typeof start !== 'object' || typeof end !== 'object') return;

                    const textPos = Object.assign(...['x', 'y'].map(c => ({
                        [c]: start[c] + (end[c] - start[c]) / 2
                    })));

                    const relLink = { x: end.x - start.x, y: end.y - start.y };
                    let textAngle = Math.atan2(relLink.y, relLink.x);
                    if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                    if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

                    const label = link.activa === false ? '❌ BLOQUEADA' : `${link.distanciaKm}km (${link.aeronaves ? link.aeronaves.join(',') : ''})`;
                    const fontSize = Math.min(MAX_FONT_SIZE, 12 / globalScale);

                    ctx.font = `${fontSize}px Inter, sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                    const sourceId = start.id;
                    const targetId = end.id;
                    const isHighlighted = highlightedEdges.has(`${sourceId}->${targetId}`);

                    ctx.save();
                    ctx.translate(textPos.x, textPos.y);
                    ctx.rotate(textAngle);

                    ctx.fillStyle = link.activa === false ? 'rgba(255, 82, 82, 0.2)' : (isHighlighted ? 'rgba(255, 215, 0, 0.15)' : 'rgba(15, 15, 22, 0.8)');
                    ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, ...bckgDimensions);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = link.activa === false ? '#FF5252' : (isHighlighted ? '#FFD700' : '#A0A0B0');
                    ctx.fillText(label, 0, 0);
                    
                    // Draw custom traveler position if active
                    if (activeLeg && sourceId === activeLeg.origen && targetId === activeLeg.destino) {
                        ctx.restore();
                        ctx.save();
                        
                        // Progress is 0-100
                        const p = (travelerProgress || 0) / 100;
                        const travelerX = start.x + (end.x - start.x) * p;
                        const travelerY = start.y + (end.y - start.y) * p;
                        
                        // Outer Glow
                        ctx.beginPath();
                        ctx.arc(travelerX, travelerY, 12 / globalScale, 0, 2 * Math.PI);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.fill();

                        // Inner Core
                        ctx.beginPath();
                        ctx.arc(travelerX, travelerY, 8 / globalScale, 0, 2 * Math.PI);
                        ctx.fillStyle = '#FFFFFF';
                        ctx.shadowColor = '#00E5FF';
                        ctx.shadowBlur = 20;
                        ctx.fill();

                        // Label "TU"
                        ctx.font = `bold ${10 / globalScale}px Inter, sans-serif`;
                        ctx.fillStyle = '#FFFFFF';
                        ctx.textAlign = 'center';
                        ctx.fillText('✈️ USTED', travelerX, travelerY - (15 / globalScale));
                        
                        ctx.restore();
                        return;
                    }
                    
                    ctx.restore();
                }}
            />
        </div>
    );
};

export default NetworkGraph;
