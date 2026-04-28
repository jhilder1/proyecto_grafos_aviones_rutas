import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const NetworkGraph = ({ data, onNodeClick }) => {
    const fgRef = useRef();
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

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

        // Draw Node Circle
        const size = node.esHub ? 8 : 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = node.esHub ? '#FF3366' : '#00E5FF'; // Vibrant pink for hubs, cyan for others
        ctx.fill();

        // Node Glow Effect
        ctx.shadowColor = node.esHub ? '#FF3366' : '#00E5FF';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw Label
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 0; // Remove shadow for text
        ctx.fillText(label, node.x, node.y + size + fontSize + 2);
    };

    // Edge styling
    const linkColor = () => '#3A3A4A'; // Dark subtle line

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
                onNodeClick={(node) => {
                    // Center node on click
                    fgRef.current.centerAt(node.x, node.y, 1000);
                    fgRef.current.zoom(8, 2000);
                    onNodeClick(node);
                }}
                linkCanvasObjectMode={() => 'after'}
                linkCanvasObject={(link, ctx, globalScale) => {
                    const MAX_FONT_SIZE = 4;
                    const LABEL_NODE_MARGIN = fgRef.current?.zoom() * 1.5;

                    const start = link.source;
                    const end = link.target;

                    // ignore unbound links
                    if (typeof start !== 'object' || typeof end !== 'object') return;

                    const textPos = Object.assign(...['x', 'y'].map(c => ({
                        [c]: start[c] + (end[c] - start[c]) / 2 // calc middle point
                    })));

                    const relLink = { x: end.x - start.x, y: end.y - start.y };
                    let textAngle = Math.atan2(relLink.y, relLink.x);
                    
                    // Keep text upright
                    if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                    if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

                    const label = `${link.distanciaKm}km (${link.aeronaves ? link.aeronaves.join(',') : ''})`;
                    const fontSize = Math.min(MAX_FONT_SIZE, 12 / globalScale);

                    ctx.font = `${fontSize}px Inter, sans-serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                    ctx.save();
                    ctx.translate(textPos.x, textPos.y);
                    ctx.rotate(textAngle);

                    ctx.fillStyle = 'rgba(15, 15, 22, 0.8)';
                    ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, ...bckgDimensions);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#A0A0B0';
                    ctx.fillText(label, 0, 0);
                    ctx.restore();
                }}
            />
        </div>
    );
};

export default NetworkGraph;
