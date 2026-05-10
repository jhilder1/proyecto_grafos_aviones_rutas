import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const NetworkGraph = ({ data, onNodeClick, highlightedRoute }) => {
    const fgRef = useRef();
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

    // Build a set of highlighted edges for quick lookup
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
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Custom drawing for nodes to distinguish Hubs
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
            ctx.fillStyle = '#FFD700'; // Gold for highlighted nodes
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
        ctx.fillStyle = isHighlighted ? '#FFD700' : '#FFFFFF';
        ctx.shadowBlur = 0;
        ctx.fillText(label, node.x, node.y + drawSize + fontSize + 2);
    };

    // Edge color based on highlight
    const linkColor = (link) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const edgeKey = `${sourceId}->${targetId}`;

        if (highlightedEdges.has(edgeKey)) {
            return '#FFD700'; // Gold for highlighted route
        }
        return '#3A3A4A';
    };

    const linkWidth = (link) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const edgeKey = `${sourceId}->${targetId}`;

        if (highlightedEdges.has(edgeKey)) {
            return 3;
        }
        return 1;
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#0F0F16', zIndex: 0 }}>
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={data}
                nodeId="id"
                nodeCanvasObject={nodeCanvasObject}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                linkColor={linkColor}
                linkWidth={linkWidth}
                onNodeClick={(node) => {
                    fgRef.current.centerAt(node.x, node.y, 1000);
                    fgRef.current.zoom(8, 2000);
                    onNodeClick(node);
                }}
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

                    const label = `${link.distanciaKm}km (${link.aeronaves ? link.aeronaves.join(',') : ''})`;
                    const fontSize = Math.min(MAX_FONT_SIZE, 12 / globalScale);

                    ctx.font = `${fontSize}px Inter, sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                    // Check if this edge is highlighted
                    const sourceId = typeof start === 'object' ? start.id : start;
                    const targetId = typeof end === 'object' ? end.id : end;
                    const isHighlighted = highlightedEdges.has(`${sourceId}->${targetId}`);

                    ctx.save();
                    ctx.translate(textPos.x, textPos.y);
                    ctx.rotate(textAngle);

                    ctx.fillStyle = isHighlighted ? 'rgba(255, 215, 0, 0.15)' : 'rgba(15, 15, 22, 0.8)';
                    ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, ...bckgDimensions);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = isHighlighted ? '#FFD700' : '#A0A0B0';
                    ctx.fillText(label, 0, 0);
                    ctx.restore();
                }}
            />
        </div>
    );
};

export default NetworkGraph;
