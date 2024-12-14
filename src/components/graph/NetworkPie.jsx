import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import jsonData from '../../data/chain_data.json';
import linkData from '../../data/chain_link_data.json';
import { NormalColors } from '../color';
import useChainStore from '../../store/store';

const NetworkPie = () => {
    const svgRef = useRef(null);
    const { setSelectedChain, selectedValidators, setSelectedValidators } = useChainStore();

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 550;
        const height = 430;
        const padding = 60; // 여백

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
        const nodes = jsonData.map((chainData) => {
            // x-axis, y-axis 값을 스케일링하여 사용
            const xScale = d3
                .scaleLinear()
                .domain(d3.extent(jsonData, (d) => d['x-axis']))
                .range([padding + chartRadius + 20, width - (padding + chartRadius + 20)]);

            const yScale = d3
                .scaleLinear()
                .domain(d3.extent(jsonData, (d) => d['y-axis']))
                .range([padding + chartRadius + 20, height - (padding + chartRadius + 20)]);

            return {
                id: chainData.chain,
                radius: chainData.radius,
                proposal: chainData.proposal,
                proportion: chainData.proportion,
                // 스케일링된 x, y 좌표 사용
                x: xScale(chainData['x-axis']),
                y: yScale(chainData['y-axis']),
                // 위치를 약간 조정할 수 있도록 fx, fy는 설정하지 않음
            };
        });

        // Force simulation 설정 수정
        const forceSimulation = d3
            .forceSimulation(nodes)
            .force('charge', d3.forceManyBody().strength(-100))
            .force(
                'collision',
                d3
                    .forceCollide()
                    .radius((d) => {
                        const baseRadius = Math.min(8 + d.radius, maxRadius);
                        return baseRadius + chartRadius + 20;
                    })
                    .strength(1)
            ) // 충돌 강도를 1로 설정하여 확실히 겹치지 않도록 함
            .force('x', d3.forceX((d) => d.x).strength(0.5)) // 원래 x 위치로 돌아가려는 힘
            .force('y', d3.forceY((d) => d.y).strength(0.5)) // 원래 y 위치로 돌아가려는 힘
            // 경계 검사 force 추가
            .force('bounds', () => {
                nodes.forEach((node) => {
                    const r = Math.min(8 + node.radius, maxRadius) + chartRadius + 20;
                    // 경계를 벗어나지 않도록 조정
                    node.x = Math.max(r, Math.min(width - r, node.x));
                    node.y = Math.max(r, Math.min(height - r, node.y));
                });
            });

        // Force simulation 반복 횟수 증가
        for (let i = 0; i < 500; i++) forceSimulation.tick();

        // 노드 매핑
        const nodeById = {};
        nodes.forEach((node) => {
            nodeById[node.id] = node;
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
                    .attr('opacity', link.shared_validators >= 40 ? 0.6 : 0.3)
                    .attr('class', `link-line link-${link.chain1} link-${link.chain2}`) // 클래스 추가
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
                .on('click', (event, d) => {
                    const chainData = jsonData.find((chain) => chain.chain === d.id);

                    // 선택된 검증인들이 새로 선택된 체인에 모두 포함되어 있는지 확인
                    const allValidatorsIncluded =
                        selectedValidators.length > 0 &&
                        selectedValidators.every((validator) => chainData.validators?.includes(validator));

                    setSelectedChain(d.id);

                    // 선택된 검증인들이 새 체인에 포함되지 않으면 검증인 선택 초기화
                    if (!allValidatorsIncluded && selectedValidators.length > 0) {
                        setSelectedValidators([]);
                    }

                    // 연결된 체인과 공유 검증인 수 정보 가져오기
                    const linkedChainsInfo = linkData
                        .filter((link) => link.chain1 === d.id || link.chain2 === d.id)
                        .map((link) => ({
                            chain: link.chain1 === d.id ? link.chain2 : link.chain1,
                            sharedValidators: link.shared_validators,
                        }));

                    // 선택된 검증인들이 포함된 체인들 찾기
                    const chainsWithSelectedValidators =
                        selectedValidators.length > 0
                            ? jsonData
                                  .filter((chain) =>
                                      selectedValidators.every((validator) => chain.validators?.includes(validator))
                                  )
                                  .map((chain) => chain.chain)
                            : [];

                    // 투명도 설정
                    d3.selectAll('.blockchain-group').each(function (groupD) {
                        const currentGroup = d3.select(this);
                        if (groupD.id === d.id) {
                            currentGroup.style('opacity', 1); // 선택된 체인
                        } else if (selectedValidators.length > 0) {
                            // 선택된 검증인들이 있는 경우
                            if (chainsWithSelectedValidators.includes(groupD.id)) {
                                // 선택된 검증인들을 모두 포함하는 체인
                                const linkedInfo = linkedChainsInfo.find((info) => info.chain === groupD.id);
                                const opacityValue = linkedInfo ? 0.3 + (linkedInfo.sharedValidators / 100) * 0.7 : 0.3;
                                currentGroup.style('opacity', opacityValue);
                            } else {
                                currentGroup.style('opacity', 0.1); // 선택된 검증인들을 포함하지 않는 체인
                            }
                        } else {
                            // 선택된 검증인이 없는 경우 기존 로직 적용
                            const linkedInfo = linkedChainsInfo.find((info) => info.chain === groupD.id);
                            if (linkedInfo) {
                                const opacityValue = 0.3 + (linkedInfo.sharedValidators / 100) * 0.7;
                                currentGroup.style('opacity', opacityValue);
                            } else {
                                currentGroup.style('opacity', 0.1);
                            }
                        }
                    });

                    // 링크 라인 업데이트
                    zoomableGroup
                        .selectAll('line')
                        .style('visibility', function () {
                            const line = d3.select(this);
                            if (selectedValidators.length > 0) {
                                // 선택된 검증인들이 있는 경우
                                const isConnectedToSelected =
                                    line.classed(`link-${d.id}`) &&
                                    (line.classed(`link-${chainsWithSelectedValidators[0]}`) ||
                                        chainsWithSelectedValidators.some((chain) => line.classed(`link-${chain}`)));
                                return isConnectedToSelected ? 'visible' : 'hidden';
                            } else {
                                // 기존 로직
                                return line.classed(`link-${d.id}`) ? 'visible' : 'hidden';
                            }
                        })
                        .style('opacity', function () {
                            const line = d3.select(this);
                            if (line.classed(`link-${d.id}`)) {
                                const linkInfo = linkData.find(
                                    (link) =>
                                        (link.chain1 === d.id && line.classed(`link-${link.chain2}`)) ||
                                        (link.chain2 === d.id && line.classed(`link-${link.chain1}`))
                                );
                                return linkInfo.shared_validators >= 40 ? 0.6 : 0.3;
                            }
                            return 0;
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
                .attr('fill', '#2ca02c')
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
    }, [setSelectedChain, selectedValidators, setSelectedValidators]);

    return (
        <div className="mt-2">
            <svg className="ml-4" ref={svgRef}></svg>
        </div>
    );
};

export default NetworkPie;
