import React, { useMemo } from 'react';
import { Character } from '../types';

interface RelationshipVisualizerProps {
  allCharacters: Character[];
}

const RelationshipVisualizer: React.FC<RelationshipVisualizerProps> = ({ allCharacters }) => {
    const { nodes, links } = useMemo(() => {
        if (!allCharacters.length) return { nodes: [], links: [] };

        const positions: { [key: string]: { x: number; y: number } } = {};
        const width = 800;
        const height = 500;

        // Simple circle layout
        const angleStep = (2 * Math.PI) / allCharacters.length;
        const radius = Math.min(width, height) / 2.5;
        allCharacters.forEach((char, i) => {
            positions[char.id] = {
                x: width / 2 + radius * Math.cos(i * angleStep),
                y: height / 2 + radius * Math.sin(i * angleStep),
            };
        });

        const nodes = allCharacters.map(char => ({
            id: char.id,
            name: char.name,
            imageUrl: char.imageUrl,
            ...positions[char.id],
        }));

        const links = allCharacters.flatMap(char => 
            (char.connections || []).map(rel => {
                const sourcePos = positions[char.id];
                const targetPos = positions[rel.targetId];
                if (!sourcePos || !targetPos) return null;

                const dx = targetPos.x - sourcePos.x;
                const dy = targetPos.y - sourcePos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const offsetX = (dx * 18) / dist; // Offset to avoid overlapping the node
                const offsetY = (dy * 18) / dist;

                return {
                    id: `${char.id}-${rel.targetId}`,
                    source: sourcePos,
                    target: { x: targetPos.x - offsetX, y: targetPos.y - offsetY },
                    labelPos: { x: (sourcePos.x + targetPos.x) / 2, y: (sourcePos.y + targetPos.y) / 2 },
                    type: rel.type,
                    description: rel.description,
                };
            }).filter(Boolean)
        );

        return { nodes, links };
    }, [allCharacters]);

    return (
        <div className="w-full h-full bg-secondary rounded-md p-4 relative overflow-auto flex items-center justify-center">
            {allCharacters.length > 0 ? (
                <svg width="800" height="500" className="mx-auto" aria-labelledby="visualizerTitle">
                    <title id="visualizerTitle">A network graph showing character relationships</title>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                        </marker>
                        {nodes.filter(n => n.imageUrl).map(node => (
                            <React.Fragment key={`defs-${node.id}`}>
                                <clipPath id={`clip-${node.id}`}>
                                    <circle cx={node.x} cy={node.y} r="15" />
                                </clipPath>
                                <pattern id={`pat-viz-${node.id}`} patternContentUnits="objectBoundingBox" width="1" height="1">
                                    <image href={node.imageUrl} x="0" y="0" width="1" height="1" preserveAspectRatio="xMidYMid slice" />
                                </pattern>
                            </React.Fragment>
                        ))}
                    </defs>
                    
                    {links.map((link) => link && (
                        <g key={link.id}>
                            <line
                                x1={link.source.x} y1={link.source.y}
                                x2={link.target.x} y2={link.target.y}
                                stroke="#64748b"
                                strokeWidth="1"
                                markerEnd="url(#arrowhead)"
                            />
                            <text x={link.labelPos.x} y={link.labelPos.y} fill="#cbd5e1" fontSize="10" textAnchor="middle" style={{textShadow: '0 0 2px black'}}>
                                {link.description || link.type}
                            </text>
                        </g>
                    ))}

                    {nodes.map((node) => (
                        <g key={node.id} role="figure" aria-label={`Character: ${node.name}`}>
                            <circle cx={node.x} cy={node.y} r="15" fill={node.imageUrl ? `url(#pat-viz-${node.id})` : '#38bdf8'} stroke="#f8fafc" strokeWidth="1.5" />
                            {!node.imageUrl && (
                                <text x={node.x} y={node.y} fill="#f8fafc" dy=".3em" fontSize="14" fontWeight="bold" textAnchor="middle">{node.name.charAt(0).toUpperCase()}</text>
                            )}
                            <text x={node.x} y={node.y + 25} fill="#f8fafc" fontSize="12" textAnchor="middle" style={{textShadow: '0 0 3px black'}}>{node.name}</text>
                        </g>
                    ))}
                </svg>
            ) : (
                <p className="text-text-secondary">No characters created yet to visualize.</p>
            )}
        </div>
    );
};

export default RelationshipVisualizer;