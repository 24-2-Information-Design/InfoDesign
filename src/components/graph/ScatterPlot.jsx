import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { NormalColors } from '../color';
import useChainStore from '../../store/store';

const ScatterPlot = ({ data }) => {
    const svgRef = useRef(null);
    const { selectedValidators, setSelectedValidators, baseValidator, setBaseValidator } = useChainStore();

    useEffect(() => {
        if (!data) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 400;
        const height = 250;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };

        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // SVG 설정
        svg.attr('width', width).attr('height', height);

        const chart = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

        // 최대 노드 크기 계산
        const maxNodeSize = 12; // 최대 노드 크기 제한

        // 데이터의 범위 계산
        const xExtent = d3.extent(data, (d) => d.tsne_x);
        const yExtent = d3.extent(data, (d) => d.tsne_y);

        // 여백 추가 (노드 크기를 고려한 패딩)
        const padding = maxNodeSize;
        const xPadding = (xExtent[1] - xExtent[0]) * 0.05; // 5% 추가 여백
        const yPadding = (yExtent[1] - yExtent[0]) * 0.05;

        // X, Y 도메인 설정 (패딩 포함)
        const xScale = d3
            .scaleLinear()
            .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
            .range([padding, chartWidth - padding]);

        const yScale = d3
            .scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([chartHeight - padding, padding]);

        // 크기 스케일 수정
        const sizeScale = d3
            .scaleSqrt()
            .domain(d3.extent(data, (d) => d.votingPower))
            .range([3, maxNodeSize]); // 최소, 최대 크기 조정

        const colorScale = d3.scaleOrdinal(NormalColors);

        // 축 그리기
        chart
            .append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(xScale).ticks(10))
            .attr('font-size', '12px');

        chart.append('g').call(d3.axisLeft(yScale).ticks(10)).attr('font-size', '12px');

        // 툴팁 설정
        const tooltip = d3
            .select('body')
            .append('div')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background', 'rgba(0, 0, 0, 0.7)')
            .style('color', '#fff')
            .style('padding', '5px 10px')
            .style('border-radius', '5px')
            .style('font-size', '12px')
            .style('pointer-events', 'none');

        // 노드 그리기
        const nodes = chart
            .selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', (d) => xScale(d.tsne_x))
            .attr('cy', (d) => yScale(d.tsne_y))
            .attr('r', (d) => sizeScale(d.votingPower))
            .attr('fill', (d) => colorScale(d.cluster_label))
            .attr('opacity', (d) => (selectedValidators.includes(d.voter) ? 1 : 0.6))
            .attr('stroke', (d) => (selectedValidators.includes(d.voter) ? '#000' : 'none'))
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                // 클릭 시 선택/해제 토글
                event.stopPropagation();
                const isSelected = selectedValidators.includes(d.voter);
                let newSelected;

                if (isSelected) {
                    // 선택 해제
                    newSelected = selectedValidators.filter((v) => v !== d.voter);
                    if (d.voter === baseValidator) {
                        // 기준 검증인을 해제하는 경우, 남은 검증인 중 첫 번째를 기준으로 설정
                        setBaseValidator(newSelected.length > 0 ? newSelected[0] : null);
                    }
                } else {
                    // 새로 선택
                    newSelected = [...selectedValidators, d.voter];
                    if (!baseValidator) {
                        setBaseValidator(d.voter);
                    }
                }

                setSelectedValidators(newSelected);

                // 시각적 업데이트
                nodes
                    .attr('opacity', (d) => (newSelected.length === 0 || newSelected.includes(d.voter) ? 0.6 : 0.2))
                    .attr('stroke', (d) => {
                        if (d.voter === baseValidator) return '#000';
                        return newSelected.includes(d.voter) ? '#666' : 'none';
                    })
                    .attr('stroke-width', (d) => (d.voter === baseValidator ? 2 : 1));
            })
            .on('mouseover', (event, d) => {
                tooltip
                    .style('visibility', 'visible')
                    .html(
                        `<strong>${d.voter}</strong><br/>
                        Voting Power: ${d.votingPower.toFixed(6)}<br/>
                        Cluster: ${d.cluster_label}`
                    )
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY}px`);
            })
            .on('mousemove', (event) => {
                tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY}px`);
            })
            .on('mouseout', () => {
                tooltip.style('visibility', 'hidden');
            });

        return () => {
            tooltip.remove();
        };
    }, [data, selectedValidators, baseValidator]);
    const handleReset = () => {
        setSelectedValidators([]);
        setBaseValidator([]);
    };
    const uniqueClusters = [...new Set(data.map((d) => d.cluster_label))].sort((a, b) => a - b);
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg">Validator Votes Similarity</h3>
                <button onClick={handleReset} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm">
                    Reset
                </button>
            </div>
            <div className="flex">
                {/* Legend - 너비를 줄이고 높이는 유지 */}
                <div className="w-16 pr-1" style={{ height: '250px' }}>
                    {' '}
                    {/* w-24 -> w-16으로 변경, 패딩 감소 */}
                    <div className="text-xs font-medium mb-1">Clusters</div> {/* text-sm -> text-xs, 마진 감소 */}
                    <div className="overflow-y-auto h-[calc(100%-1.5rem)]">
                        {uniqueClusters.map((cluster, i) => (
                            <div
                                key={cluster}
                                className="flex items-center mb-0.5" // mb-1 -> mb-0.5로 변경
                            >
                                <div
                                    className="w-3 h-3 rounded-full mr-1" // w-4 h-4 -> w-3 h-3, 마진 감소
                                    style={{
                                        backgroundColor: NormalColors[cluster],
                                        opacity: 0.6,
                                    }}
                                ></div>
                                <span className="text-[10px]">
                                    {' '}
                                    {/* text-xs -> text-[10px]로 변경 */}
                                    {cluster} {/* "Cluster" -> "C"로 축약 */}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Chart */}
                <div className="flex-1">
                    <svg ref={svgRef}></svg>
                </div>
            </div>
        </div>
    );
};

export default ScatterPlot;
