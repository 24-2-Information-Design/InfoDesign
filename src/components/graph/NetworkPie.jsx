import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import jsonData from '../../data/chain_data.json';
import linkData from '../../data/chain_link_data.json';
import { NormalColors } from '../color';
import useChainStore from '../../store/store';

const NetworkPie = () => {
    const svgRef = useRef(null);
    const { setSelectedChain } = useChainStore();

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 550;
        const height = 430;

        const zoomableGroup = svg.append('g').attr('class', 'zoomable-group');

        // Zoom 기능 설정
        const zoom = d3
            .zoom()
            .scaleExtent([0.5, 5])
            .translateExtent([
                [0, 0],
                [width, height],
            ])
            .on('zoom', (event) => {
                zoomableGroup.attr('transform', event.transform);
            });

        svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`).call(zoom);

        // 초기 확대/축소 설정
        const initialScale = 0.8;
        const initialTranslate = [width * 0.1, height * 0.1];
        svg.call(zoom.transform, d3.zoomIdentity.translate(...initialTranslate).scale(initialScale));

        // 포인트 생성 및 스케일링 (기존 코드와 동일)
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

        // Voronoi 다이어그램 생성 (기존 코드와 동일)
        const delaunay = d3.Delaunay.from(
            scaledPoints,
            (d) => d.x,
            (d) => d.y
        );
        const voronoi = delaunay.voronoi([0, 0, width, height]);

        // Voronoi 셀 렌더링 (기존 코드와 동일)
        const cellCenters = scaledPoints
            .map((point, index) => {
                const cell = voronoi.cellPolygon(index);

                if (cell) {
                    const originalRadius = points[index].radius;
                    const opacity = 0.1 + (originalRadius / d3.max(points, (p) => p.radius)) * 0.3;
                    const strokeWidth = 0.5 + originalRadius / d3.max(points, (p) => p.radius);

                    svg.append('path')
                        .attr('d', d3.line()(cell))
                        .attr('fill', '#FFFFFF')
                        .attr('fill-opacity', opacity)
                        .attr('stroke', '#888888')
                        .attr('stroke-opacity', 0.5)
                        .attr('stroke-width', strokeWidth)
                        .style('pointer-events', 'none');

                    const centroid = d3.polygonCentroid(cell);

                    return {
                        chain: point.chain,
                        x: centroid[0],
                        y: centroid[1],
                    };
                }
                return null;
            })
            .filter(Boolean);

        // 노드 생성 (기존 코드와 동일)
        const nodes = jsonData.map((chainData) => {
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

        // 링크 렌더링 (기존 코드와 동일)
        const nodeById = {};
        nodes.forEach((node) => {
            nodeById[node.id] = node;
        });

        linkData.forEach((link) => {
            const sourceNode = nodeById[link.chain1];
            const targetNode = nodeById[link.chain2];

            if (sourceNode && targetNode) {
                const lineThickness = Math.sqrt(link.shared_validators);
                zoomableGroup
                    .append('line')
                    .attr('x1', sourceNode.x)
                    .attr('y1', sourceNode.y)
                    .attr('x2', targetNode.x)
                    .attr('y2', targetNode.y)
                    .attr('stroke', 'rgba(49, 74, 196, 0.5)')
                    .attr('stroke-width', Math.max(lineThickness, 1))
                    .attr('opacity', 0.5)
                    .append('title')
                    .text(`${link.chain1} ↔ ${link.chain2}: ${link.shared_validators} shared validators`);
            }
        });

        // Radial Bar Chart 및 파이 차트 설정
        const maxRadius = Math.min(width, height) / 6;
        const chartRadius = maxRadius;
        const arcMinRadius = 10;
        const arcPadding = 2;
        const numArcs = Object.keys(nodes[0].proposal).length;
        const arcWidth = (chartRadius - arcMinRadius - numArcs * arcPadding) / (numArcs * 2);

        const colorScale = d3.scaleOrdinal(NormalColors);

        const getInnerRadius = (index) => arcMinRadius + index * (arcWidth + arcPadding);
        const getOuterRadius = (index) => getInnerRadius(index) + arcWidth;

        // 파이 차트 및 Radial Bar Chart 렌더링
        nodes.forEach((node) => {
            const chainData = jsonData.find((chain) => chain.chain === node.id);

            const radius = Math.min(10 + chainData.radius, maxRadius);

            const proportionData = Object.entries(chainData.proportion).map(([key, value]) => ({ month: key, value }));

            // 파이 차트 렌더링 (기존 코드와 동일)
            const pie = d3.pie().value((d) => d.value);
            const arcData = pie(proportionData);
            const pieArc = d3.arc().innerRadius(0).outerRadius(radius);

            const blockchainGroup = zoomableGroup
                .append('g')
                .attr('transform', `translate(${node.x}, ${node.y})`)
                .attr('class', 'blockchain-group')
                .style('cursor', 'pointer')
                .on('click', () => {
                    setSelectedChain(node.id);
                });

            // 파이 슬라이스 렌더링
            blockchainGroup
                .selectAll('.pie-slice')
                .data(arcData)
                .enter()
                .append('path')
                .attr('d', pieArc)
                .attr('fill', (d, i) => colorScale(i))
                .attr('class', 'pie-slice')
                .append('title')
                .text((d) => `${node.id} - proportion ${d.data.month}: ${(d.data.value * 100).toFixed(2)}%`);

            const barData = Object.entries(chainData.proposal).map(([key, value]) => ({ month: key, value }));
            const barColorScale = d3.scaleOrdinal(d3.schemeCategory10);

            const barArc = d3
                .arc()
                .innerRadius((d, i) => getInnerRadius(i) + radius - 8)
                .outerRadius((d, i) => getOuterRadius(i) + radius - 8)
                .startAngle(0)
                .endAngle((d) => (d.value / 100) * 2 * Math.PI);

            blockchainGroup
                .selectAll('.bar')
                .data(barData)
                .enter()
                .append('path')
                .attr('d', barArc)
                .attr('fill', (d, i) => barColorScale(i))
                .attr('opacity', 0.7) // 불투명도 조절
                .attr('class', 'bar')
                .append('title')
                .text((d) => `${node.id} - proposal ${d.month}: ${d.value}`);

            // 블록체인 라벨 추가
            blockchainGroup
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', radius + 15 + chartRadius)
                .text(node.id)
                .attr('font-size', '14px')
                .attr('font-weight', 'bold');
        });
    }, [setSelectedChain]);

    return (
        <div className="mt-2">
            <svg ref={svgRef}></svg>
            {/* {selectedChain && (
                <div className="border-2">
                    <p>{selectedChain}</p>
                    <div className="flex flex-wrap justify-between">
                        <div className="w-full sm:w-1/2">
                            <div className="flex flex-wrap">
                                <p className="w-full sm:w-1/2">검증인 수: </p>
                                <p className="w-full sm:w-1/2">군집 수: </p>
                                <p className="w-full sm:w-1/2">proposal 수: {}</p>
                                <p className="w-full sm:w-1/2">의견 포용력: </p>
                            </div>
                        </div>
                        <div className="w-full sm:w-1/2 flex-wrap">
                            <p>유사한 체인</p>
                            <p>~~~~~</p>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
};

export default NetworkPie;
