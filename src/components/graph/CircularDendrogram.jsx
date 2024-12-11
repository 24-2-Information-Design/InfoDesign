import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const CircularDendrogram = ({ data }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || !svgRef.current) return;

        // Clear previous content
        d3.select(svgRef.current).selectAll('*').remove();

        const transformData = (proposals) => {
            const typeGroups = {};
            proposals.forEach((proposal) => {
                const type = proposal.type || 'Unknown';
                if (!typeGroups[type]) {
                    typeGroups[type] = {
                        yes: [],
                        no: [],
                        veto: [],
                        abstain: [],
                        no_vote: [],
                    };
                }

                // 각 제안서에 대해 존재하는 투표 카테고리만 확인
                const voteCategories = ['yes', 'no', 'veto', 'abstain', 'no_vote'].filter(
                    (category) => proposal[category] > 0
                );

                if (voteCategories.length > 0) {
                    const maxVoteCategory = voteCategories.reduce(
                        (max, current) => (proposal[current] > proposal[max] ? current : max),
                        voteCategories[0]
                    );

                    typeGroups[type][maxVoteCategory].push(proposal);
                }
            });

            // 각 타입별로 비어있지 않은 투표 카테고리만 포함
            return {
                name: 'root',
                children: Object.entries(typeGroups)
                    .map(([type, voteGroups]) => ({
                        name: type,
                        children: Object.entries(voteGroups)
                            .filter(([_, proposals]) => proposals.length > 0) // 비어있지 않은 투표 카테고리만 포함
                            .map(([voteType, proposals]) => ({
                                name: voteType,
                                children: proposals.map((p) => ({
                                    name: `${p.id}`,
                                    title: p.title,
                                    value: p.most_vote_ratio,
                                    status: p.status,
                                    id: p.id,
                                })),
                            })),
                    }))
                    .filter((typeGroup) => typeGroup.children.length > 0), // 자식이 없는 타입은 제외
            };
        };

        // Set up dimensions
        const width = 300;
        const height = 280;
        const radius = Math.min(width, height) / 2 - 30;

        // Create the SVG container
        const svg = d3
            .select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Create cluster layout
        const cluster = d3.cluster().size([360, radius]);

        const root = d3.hierarchy(transformData(data));
        cluster(root);

        // Create links with curved paths
        const linkGenerator = d3
            .linkRadial()
            .angle((d) => (d.x / 180) * Math.PI)
            .radius((d) => d.y);

        svg.selectAll('.link')
            .data(root.links())
            .join('path')
            .attr('class', 'link')
            .attr('d', linkGenerator)
            .attr('fill', 'none')
            .attr('stroke', '#000')
            .attr('stroke-width', 1);

        // Create nodes
        const nodes = svg
            .selectAll('.node')
            .data(root.descendants())
            .join('g')
            .attr('class', 'node')
            .attr('transform', (d) => `rotate(${d.x - 90}) translate(${d.y},0)`);

        // Add circles for nodes
        nodes
            .append('circle')
            .attr('r', (d) => (d.depth === 3 ? 3 : 2))
            .attr('opacity', 0.6)
            .attr('fill', (d) => {
                if (d.depth === 1) {
                    const colors = [
                        '#ff7f7f',
                        '#7f7fff',
                        '#7fff7f',
                        '#ff7fff',
                        '#ffff7f',
                        '#7fffff',
                        '#ff7f00',
                        '#7f00ff',
                    ];
                    return colors[d.parent.children.indexOf(d) % colors.length];
                }
                if (d.depth === 2) {
                    const voteColors = {
                        yes: '#28a745',
                        no: '#dc3545',
                        veto: '#fd7e14',
                        abstain: '#6c757d',
                        no_vote: '#495057',
                    };
                    return voteColors[d.data.name] || '#999';
                }
                if (d.depth === 3) return d.data.status === 'PASSED' ? '#28a745' : '#dc3545';
                return '#999';
            });

        // Add labels only for leaf nodes
        nodes
            .filter((d) => d.depth === 3)
            .append('text')
            .attr('dy', '.31em')
            .attr('x', (d) => (d.x < 180 ? 6 : -6))
            .attr('text-anchor', (d) => (d.x < 180 ? 'start' : 'end'))
            .attr('transform', (d) => {
                const rotation = d.x < 180 ? 0 : 180;
                return `rotate(${rotation})`;
            })
            .text((d) => d.data.name)
            .style('font-size', '8px')
            .style('fill', '#333');

        // Add tooltips for proposal nodes
        nodes
            .filter((d) => d.depth === 3)
            .append('title')
            .text(
                (d) =>
                    `ID: ${d.data.id}\nTitle: ${d.data.title}\nStatus: ${d.data.status}\nMost Vote: ${(
                        d.data.value * 100
                    ).toFixed(1)}%`
            );
    }, [data]);

    return (
        <div>
            <svg ref={svgRef} />
        </div>
    );
};

export default CircularDendrogram;
