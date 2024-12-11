import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import jsonData from '../../data/chain_data.json';
import linkData from '../../data/chain_link_data.json';
import { NormalColors } from '../color';
import useChainStore from '../../store/store';

const NetworkPie = () => {
    const svgRef = useRef(null);
    const { setSelectedChain, selectedValidators } = useChainStore();

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 550;
        const height = 430;
        const padding = 60; // 여백
        const effectiveWidth = width - padding * 2;
        const effectiveHeight = height - padding * 2;

        // Zoom 설정
        const zoomableGroup = svg.append('g').attr('class', 'zoomable-group');

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

        const initialScale = 0.8;
        const initialTranslate = [width * 0.1, height * 0.1];
        svg.call(zoom.transform, d3.zoomIdentity.translate(...initialTranslate).scale(initialScale));

        // 차트 크기 설정
        const maxRadius = Math.min(width, height) / 8; // 차트 크기 축소
        const chartRadius = maxRadius;
        const arcMinRadius = 8;
        const arcPadding = 2;
        const numArcs = Object.keys(jsonData[0].proposal).length;
        const arcWidth = (chartRadius - arcMinRadius - numArcs * arcPadding) / (numArcs * 5);

        // 노드 데이터 생성
        const nodes = jsonData.map((chainData) => ({
            id: chainData.chain,
            radius: chainData.radius,
            proposal: chainData.proposal,
            proportion: chainData.proportion,
            x: padding + Math.random() * effectiveWidth,
            y: padding + Math.random() * effectiveHeight,
        }));

        // 노드 매핑
        const nodeById = {};
        nodes.forEach((node) => {
            nodeById[node.id] = node;
        });

        // Force simulation 설정
        const forceSimulation = d3
            .forceSimulation(nodes)
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            // x축 경계 설정
            .force('x', d3.forceX(width / 2).strength(0.1))
            // y축 경계 설정
            .force('y', d3.forceY(height / 2).strength(0.1))
            .force(
                'collision',
                d3.forceCollide().radius((d) => {
                    const baseRadius = Math.min(8 + d.radius, maxRadius);
                    // 텍스트 라벨을 고려한 충돌 반경
                    return baseRadius + chartRadius + 20;
                })
            )
            // 경계 설정
            .force('bounds', () => {
                for (let node of nodes) {
                    const r = Math.min(8 + node.radius, maxRadius) + chartRadius + 20;
                    node.x = Math.max(r, Math.min(width - r, node.x));
                    node.y = Math.max(r, Math.min(height - r, node.y));
                }
            });

        // Force simulation 실행
        for (let i = 0; i < 300; i++) forceSimulation.tick();

        const points = nodes.map((node) => ({
            x: node.x,
            y: node.y,
            radius: node.radius,
            id: node.id,
        }));

        // Weighted Voronoi를 시뮬레이션하기 위한 다수의 포인트 생성
        const weightedPoints = [];
        points.forEach((point) => {
            // radius 값에 따라 포인트 수를 조절
            const numPoints = Math.max(1, Math.floor(point.radius * 2));
            const spread = point.radius / 2; // 분산 정도

            for (let i = 0; i < numPoints; i++) {
                // 원형으로 포인트 분산
                const angle = (2 * Math.PI * i) / numPoints;
                const jitter = spread * Math.random() * 0.5; // 약간의 랜덤성 추가
                weightedPoints.push({
                    x: point.x + Math.cos(angle) * jitter,
                    y: point.y + Math.sin(angle) * jitter,
                    originalId: point.id,
                });
            }
        });

        // Voronoi 다이어그램 생성
        // Voronoi 다이어그램 생성
        const delaunay = d3.Delaunay.from(
            points, // 가중치 포인트 대신 원본 포인트 사용
            (d) => d.x,
            (d) => d.y
        );
        const voronoi = delaunay.voronoi([0, 0, width, height]);

        // Voronoi 영역 렌더링
        points.forEach((point, i) => {
            const cell = voronoi.cellPolygon(i);
            if (!cell) return;

            const chainData = jsonData.find((d) => d.chain === point.id);
            const opacity = 0.1 + (chainData.radius / d3.max(jsonData, (d) => d.radius)) * 0.2;

            zoomableGroup
                .append('path')
                .attr('d', d3.line()(cell))
                .attr('fill', '#FFFFFF')
                .attr('fill-opacity', opacity)
                .attr('stroke', '#888888')
                .attr('stroke-opacity', 0.3)
                .attr('stroke-width', 0.5)
                .attr('class', `voronoi-cell-${point.id}`)
                .style('pointer-events', 'none');
        });

        // 링크 렌더링
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
                    .attr('stroke', '#dbe6f1')
                    .attr('stroke-width', Math.max(lineThickness, 1))
                    .attr('opacity', 0.5)
                    .append('title')
                    .text(`${link.chain1} ↔ ${link.chain2}: ${link.shared_validators} shared validators`);
            }
        });

        // 차트 색상 스케일
        const colorScale = d3.scaleOrdinal(NormalColors);

        const getInnerRadius = (index) => arcMinRadius + index * (arcWidth + arcPadding);
        const getOuterRadius = (index) => getInnerRadius(index) + arcWidth;

        // 파이 차트 및 바 차트 렌더링
        nodes.forEach((node) => {
            const chainData = jsonData.find((chain) => chain.chain === node.id);
            const radius = Math.min(8 + chainData.radius, maxRadius);

            const proportionData = Object.entries(chainData.proportion).map(([key, value]) => ({ month: key, value }));

            // 파이 차트 생성
            const pie = d3.pie().value((d) => d.value);
            const arcData = pie(proportionData);
            const pieArc = d3.arc().innerRadius(0).outerRadius(radius);

            const blockchainGroup = zoomableGroup
                .append('g')
                .datum(node)
                .attr('transform', `translate(${node.x}, ${node.y})`)
                .attr('class', 'blockchain-group')
                .style('cursor', 'pointer')
                .style('opacity', () => {
                    // 선택된 검증인이 없으면 모든 체인 표시
                    if (selectedValidators.length === 0) return 1;

                    // 해당 체인의 검증인 목록 가져오기
                    const chainValidators = chainData.validators || [];

                    // 선택된 검증인들이 모두 포함되어 있는지 확인
                    const allValidatorsIncluded = selectedValidators.every((validator) =>
                        chainValidators.includes(validator)
                    );

                    return allValidatorsIncluded ? 1 : 0.2;
                })
                .on('click', (event, d) => {
                    setSelectedChain(d.id);

                    const linkedChains = linkData
                        .filter((link) => link.chain1 === d.id || link.chain2 === d.id)
                        .map((link) => (link.chain1 === d.id ? link.chain2 : link.chain1));

                    d3.selectAll('.blockchain-group').each(function (d) {
                        const currentGroup = d3.select(this);
                        if (d.id === node.id) {
                            currentGroup.style('opacity', 1);
                        } else if (linkedChains.includes(d.id)) {
                            currentGroup.style('opacity', 0.6);
                        } else {
                            currentGroup.style('opacity', 0.3);
                        }
                    });
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
                .text((d) => `${node.id} - proportion ${d.data.month}: ${(d.value * 100).toFixed(2)}%`);

            // 바 차트 데이터 및 렌더링
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
                .attr('opacity', 0.7)
                .attr('class', 'bar')
                .append('title')
                .text((d) => `${node.id} - proposal ${d.month}: ${d.value}`);

            // 라벨 추가
            blockchainGroup
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', radius + 15)
                .text(node.id)
                .attr('font-size', '12px')
                .attr('font-weight', 'bold');
        });
    }, [setSelectedChain, selectedValidators]);

    return (
        <div className="mt-2">
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default NetworkPie;
