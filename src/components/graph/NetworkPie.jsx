import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import jsonData from '../../data/chain_data.json';
import linkData from '../../data/chain_link_data.json';

const NetworkPie = () => {
    const svgRef = useRef(null);
    const [selectedChain, setSelectedChain] = useState(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = (window.innerWidth * 2) / 3;
        const height = window.innerHeight + 10;

        svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

        // 포인트 생성 및 스케일링
        const points = jsonData.map((item) => ({
            chain: item.chain,
            x: item['x-axis'],
            y: item['y-axis'],
            radius: item.radius,
        }));

        const xScale = d3
            .scaleLinear()
            .domain([d3.min(points, (d) => d.x), d3.max(points, (d) => d.x)])
            .range([50, width - 50]);

        const yScale = d3
            .scaleLinear()
            .domain([d3.min(points, (d) => d.y), d3.max(points, (d) => d.y)])
            .range([50, height - 50]);

        const scaledPoints = points.map((point) => ({
            ...point,
            x: xScale(point.x),
            y: yScale(point.y),
        }));

        // Voronoi 다이어그램 생성
        const delaunay = d3.Delaunay.from(
            scaledPoints,
            (d) => d.x,
            (d) => d.y
        );
        const voronoi = delaunay.voronoi([0, 0, width, height]);
        const colorScale = d3.scaleSequential().domain([0, points.length]).interpolator(d3.interpolateBlues);

        // Voronoi 셀 렌더링
        const cellCenters = scaledPoints
            .map((point, index) => {
                const cell = voronoi.cellPolygon(index);

                if (cell) {
                    // 셀의 중심점 계산
                    const centroid = d3.polygonCentroid(cell);

                    // Voronoi 셀 그리기
                    svg.append('path')
                        .attr('d', d3.line()(cell))
                        .attr('fill', colorScale(index))
                        .attr('fill-opacity', 0.2)
                        .attr('stroke', 'black')
                        .attr('stroke-opacity', 0.2)
                        .attr('stroke-width', 0.5);

                    return {
                        chain: point.chain,
                        x: centroid[0],
                        y: centroid[1],
                    };
                }
                return null;
            })
            .filter(Boolean);

        // 노드 및 링크 생성
        const nodes = jsonData.map((chainData) => {
            // Voronoi 셀의 중심점 찾기
            const cellCenter = cellCenters.find((center) => center.chain === chainData.chain);
            return {
                id: chainData.chain,
                x: cellCenter ? cellCenter.x : xScale(chainData['x-axis']),
                y: cellCenter ? cellCenter.y : yScale(chainData['y-axis']),
                radius: chainData.radius,
                proposal: chainData.proposal,
                proportion: chainData.proportion,
            };
        });

        // 링크 렌더링
        const nodeById = {};
        nodes.forEach((node) => {
            nodeById[node.id] = node;
        });

        linkData.forEach((link) => {
            const sourceNode = nodeById[link.chain1];
            const targetNode = nodeById[link.chain2];

            if (sourceNode && targetNode) {
                const lineThickness = Math.sqrt(link.shared_validators);
                svg.append('line')
                    .attr('x1', sourceNode.x)
                    .attr('y1', sourceNode.y)
                    .attr('x2', targetNode.x)
                    .attr('y2', targetNode.y)
                    .attr('stroke', 'rgba(136, 136, 136, 0.5)')
                    .attr('stroke-width', Math.max(lineThickness, 1))
                    .attr('opacity', 0.5)
                    .append('title')
                    .text(`${link.chain1} ↔ ${link.chain2}: ${link.shared_validators} shared validators`);
            }
        });

        // 파이 차트 및 노드 렌더링
        nodes.forEach((node) => {
            const chainData = jsonData.find((chain) => chain.chain === node.id);

            const maxRadius = Math.min(width, height) / 4;
            const radius = Math.min(20 + chainData.radius * 1.5, maxRadius);

            const proportionData = Object.entries(chainData.proportion).map(([key, value]) => ({ month: key, value }));

            const pie = d3.pie().value((d) => d.value);
            const arcData = pie(proportionData);

            const colorScale = d3
                .scaleSequential()
                .domain([0, proportionData.length])
                .interpolator(d3.interpolateBlues);

            const arc = d3.arc().innerRadius(0).outerRadius(radius);

            const blockchainGroup = svg
                .append('g')
                .attr('transform', `translate(${node.x}, ${node.y})`)
                .attr('class', 'blockchain-group')
                .style('cursor', 'pointer')
                .on('click', () => {
                    // 이전 선택 하이라이트 제거
                    svg.selectAll('.blockchain-group').attr('opacity', 1).selectAll('path').attr('stroke-width', 1);

                    // 선택된 블록체인 하이라이트
                    blockchainGroup.attr('opacity', 1).selectAll('path').attr('stroke-width', 3).attr('stroke', 'red');

                    // 선택된 체인 상태 업데이트
                    setSelectedChain(node.id);
                });

            // 파이 차트 렌더링
            blockchainGroup
                .selectAll('path')
                .data(arcData)
                .enter()
                .append('path')
                .attr('d', arc)
                .attr('fill', (d, i) => colorScale(i))
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .append('title')
                .text((d) => `${node.id} - proportion ${d.data.month}: ${(d.data.value * 100).toFixed(2)}%`);

            const barWidth = 25;

            proportionData.forEach((d, index) => {
                const proposalKeys = Object.keys(chainData.proposal).sort();
                const currentKey = proposalKeys[index % proposalKeys.length];
                const proposalValue = chainData.proposal[currentKey] || 0;

                const barLength = (proposalValue / 100) * radius * 1;

                const angle = (index / proportionData.length) * 2 * Math.PI;

                const x1 = radius * Math.cos(angle);
                const y1 = radius * Math.sin(angle);

                const x2 = (radius + barLength) * Math.cos(angle);
                const y2 = (radius + barLength) * Math.sin(angle);

                blockchainGroup
                    .append('line')
                    .attr('x1', x1)
                    .attr('y1', y1)
                    .attr('x2', x2)
                    .attr('y2', y2)
                    .attr('stroke', d3.interpolateBlues((index + 1) / 12))
                    .attr('stroke-width', barWidth)
                    .append('title')
                    .text(`proposal ${currentKey}: ${proposalValue}`);
            });

            // 블록체인 라벨 추가
            blockchainGroup
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', radius + 40)
                .text(node.id)
                .attr('font-size', '14px')
                .attr('font-weight', 'bold');
        });
    }, []);

    return (
        <div>
            <svg ref={svgRef}></svg>
            {selectedChain && (
                <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd' }}>
                    <h3>Selected Blockchain: {selectedChain}</h3>
                </div>
            )}
        </div>
    );
};

export default NetworkPie;
