import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { NormalColors } from '../color';
import useChainStore from '../../store/store';

const ScatterPlot = ({ data }) => {
    const svgRef = useRef(null);
    const { selectedValidators, setSelectedValidators } = useChainStore();

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
                const isSelected = selectedValidators.includes(d.voter);
                const newSelectedValidators = isSelected
                    ? selectedValidators.filter((v) => v !== d.voter)
                    : [...selectedValidators, d.voter];

                setSelectedValidators(newSelectedValidators);

                // 시각적 업데이트
                nodes
                    .attr('opacity', (d) =>
                        newSelectedValidators.length === 0 || newSelectedValidators.includes(d.voter) ? 1 : 0.6
                    )
                    .attr('stroke', (d) => (newSelectedValidators.includes(d.voter) ? '#000' : 'none'));
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
    }, [data, selectedValidators, setSelectedValidators]);
    const handleReset = () => {
        setSelectedValidators([]);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg">Validator Votes Similarity</h3>
                <button onClick={handleReset} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm">
                    Reset
                </button>
            </div>
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default ScatterPlot;
