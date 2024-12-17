import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { NormalColors } from '../color';
import useChainStore from '../../store/store';

const ScatterPlot = ({ data }) => {
    const svgRef = useRef(null);
    const { selectedValidators, setSelectedValidators, baseValidator, setBaseValidator } = useChainStore();
    const [singleSelectMode, setSingleSelectMode] = useState(false);

    useEffect(() => {
        if (!data || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 500;
        const height = 300;
        const margin = { top: 10, right: 20, bottom: 50, left: 50 };

        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        svg.attr('width', width).attr('height', height);

        const chart = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

        const maxNodeSize = 12;
        const minNodeSize = 3;

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

        // participation_rate를 기준으로 노드 크기 조정
        const sizeScale = d3
            .scaleSqrt()
            .domain([0, d3.max(data, (d) => d.participation_rate)])
            .range([minNodeSize, maxNodeSize]);

        const colorScale = d3.scaleOrdinal(NormalColors);

        // 노드를 크기 순으로 정렬 (작은 노드가 앞에 오도록)
        const sortedData = [...data].sort((a, b) => sizeScale(a.participation_rate) - sizeScale(b.participation_rate));

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

        function handleNodeClick(event, d) {
            event.stopPropagation();
            if (singleSelectMode) {
                const isCurrentlySelected = selectedValidators.includes(d.voter);
                const newSelected = isCurrentlySelected ? [] : [d.voter];
                setSelectedValidators(newSelected);
                setBaseValidator(isCurrentlySelected ? null : d.voter);
            } else {
                const isSelected = selectedValidators.includes(d.voter);
                let newSelected;
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
                setSelectedValidators(newSelected);
            }
        }

        const brush = d3
            .brush()
            .extent([
                [0, 0],
                [chartWidth, chartHeight],
            ])
            .on('end', (event) => {
                if (!event.selection || singleSelectMode) return;

                const [[x0, y0], [x1, y1]] = event.selection;
                const selectedNodes = data.filter(
                    (d) =>
                        xScale(d.tsne_x) >= x0 &&
                        xScale(d.tsne_x) <= x1 &&
                        yScale(d.tsne_y) >= y0 &&
                        yScale(d.tsne_y) <= y1
                );

                if (selectedNodes.length > 0) {
                    const newSelected = [...selectedValidators, ...selectedNodes.map((d) => d.voter)];
                    const uniqueSelected = [...new Set(newSelected)];
                    setSelectedValidators(uniqueSelected);
                    if (!baseValidator && uniqueSelected.length > 0) {
                        setBaseValidator(uniqueSelected[0]);
                    }
                }

                chart.select('.brush').call(brush.move, null);
            });

        const brushContainer = chart.append('g').attr('class', 'brush');

        if (!singleSelectMode) {
            brushContainer.call(brush);
        }

        // 최소 클릭 영역 설정 (최소 노드 크기를 보장)
        const minClickRadius = Math.max(minNodeSize, 5);

        const nodes = chart
            .selectAll('circle')
            .data(sortedData)
            .enter()
            .append('circle')
            .attr('cx', (d) => xScale(d.tsne_x))
            .attr('cy', (d) => yScale(d.tsne_y))
            .attr('r', (d) => {
                const nodeRadius = sizeScale(d.participation_rate);
                return Math.max(nodeRadius, minClickRadius);
            })
            .attr('fill', (d) => colorScale(d.cluster_label))
            .attr('opacity', (d) => (selectedValidators.includes(d.voter) ? 1 : 0.6))
            .attr('stroke', (d) => {
                if (d.voter === baseValidator) return '#000';
                return selectedValidators.includes(d.voter) ? '#666' : 'none';
            })
            .attr('stroke-width', (d) => (d.voter === baseValidator ? 2 : 1))
            .style('cursor', 'pointer')
            .on('click', handleNodeClick)
            .on('mouseover', (event, d) => {
                tooltip
                    .style('visibility', 'visible')
                    .html(
                        `<strong>${d.voter}</strong><br/>
                        Participation Rate: ${(d.participation_rate * 100).toFixed(2)}%<br/>
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
    };

    const handleSingleSelectModeChange = (isChecked) => {
        setSingleSelectMode(isChecked);
        if (isChecked && selectedValidators.length > 0) {
            // Single selection 모드에서는 첫 번째 검증인만 유지
            const firstValidator = selectedValidators[0];
            setSelectedValidators([firstValidator]);
            setBaseValidator(firstValidator);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4 pl-3">
                <h3 className="text-lg">Validator Votes Similarity</h3>
                <div className="flex items-center gap-4">
                    <label className="flex items-center space-x-2 text-sm">
                        <input
                            type="checkbox"
                            checked={singleSelectMode}
                            onChange={(e) => handleSingleSelectModeChange(e.target.checked)}
                            className="form-checkbox h-4 w-4"
                        />
                        <span>Single Selection</span>
                    </label>
                    <button onClick={handleReset} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm">
                        Reset
                    </button>
                </div>
            </div>
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default ScatterPlot;
