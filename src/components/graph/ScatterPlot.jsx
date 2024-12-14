import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NormalColors } from '../color';
import useChainStore from '../../store/store';

const ScatterPlot = ({ data }) => {
    const svgRef = useRef(null);
    const { selectedValidators, setSelectedValidators, baseValidator, setBaseValidator } = useChainStore();
    const [singleSelectMode, setSingleSelectMode] = useState(false);

    useEffect(() => {
        if (!data) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 400;
        const height = 250;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };

        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        svg.attr('width', width).attr('height', height);

        const chart = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

        const maxNodeSize = 12;

        const xExtent = d3.extent(data, (d) => d.tsne_x);
        const yExtent = d3.extent(data, (d) => d.tsne_y);

        const padding = maxNodeSize;
        const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
        const yPadding = (yExtent[1] - yExtent[0]) * 0.05;

        const xScale = d3
            .scaleLinear()
            .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
            .range([padding, chartWidth - padding]);

        const yScale = d3
            .scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([chartHeight - padding, padding]);

        const sizeScale = d3
            .scaleSqrt()
            .domain(d3.extent(data, (d) => d.votingPower))
            .range([3, maxNodeSize]);

        const colorScale = d3.scaleOrdinal(NormalColors);

        chart
            .append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(xScale).ticks(10))
            .attr('font-size', '12px');

        chart.append('g').call(d3.axisLeft(yScale).ticks(10)).attr('font-size', '12px');

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
                event.stopPropagation();
                const isSelected = selectedValidators.includes(d.voter);
                let newSelected;

                if (singleSelectMode) {
                    // 단일 선택 모드
                    newSelected = isSelected ? [] : [d.voter];
                    setBaseValidator(isSelected ? null : d.voter);
                } else {
                    // 다중 선택 모드
                    if (isSelected) {
                        newSelected = selectedValidators.filter((v) => v !== d.voter);
                        if (d.voter === baseValidator) {
                            setBaseValidator(newSelected.length > 0 ? newSelected[0] : null);
                        }
                    } else {
                        newSelected = [...selectedValidators, d.voter];
                        if (!baseValidator) {
                            setBaseValidator(d.voter);
                        }
                    }
                }

                setSelectedValidators(newSelected);

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
    }, [data, selectedValidators, baseValidator, singleSelectMode]);

    const handleReset = () => {
        setSelectedValidators([]);
        setBaseValidator(null);
        const nodes = d3.select(svgRef.current).selectAll('circle');
        nodes.attr('opacity', 0.6).attr('stroke', 'none').attr('stroke-width', 1);
    };

    const uniqueClusters = [...new Set(data.map((d) => d.cluster_label))].sort((a, b) => a - b);

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg pl-3">Validator Votes Similarity</h3>
                    <label className="flex items-center space-x-2 text-sm">
                        <input
                            type="checkbox"
                            checked={singleSelectMode}
                            onChange={(e) => {
                                setSingleSelectMode(e.target.checked);
                                if (e.target.checked && selectedValidators.length > 1) {
                                    // 단일 선택 모드로 전환 시 첫 번째 선택된 검증인만 유지
                                    const firstSelected = selectedValidators[0];
                                    setSelectedValidators([firstSelected]);
                                    setBaseValidator(firstSelected);
                                }
                            }}
                            className="form-checkbox h-4 w-4"
                        />
                        <span>단일 선택 모드</span>
                    </label>
                </div>
                <button onClick={handleReset} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm">
                    Reset
                </button>
            </div>
            <div className="flex">
                <div className="w-16 pr-1" style={{ height: '250px' }}>
                    <div className="text-xs font-medium pl-3 mb-1">Clusters</div>
                    <div className="overflow-y-auto pl-3 h-[calc(100%-1.5rem)]">
                        {uniqueClusters.map((cluster) => (
                            <div key={cluster} className="flex items-center mb-0.5">
                                <div
                                    className="w-3 h-3 rounded-full mr-1"
                                    style={{
                                        backgroundColor: NormalColors[cluster],
                                        opacity: 0.6,
                                    }}
                                ></div>
                                <span className="text-[9px]">{cluster}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1">
                    <svg ref={svgRef}></svg>
                </div>
            </div>
        </div>
    );
};

export default ScatterPlot;
