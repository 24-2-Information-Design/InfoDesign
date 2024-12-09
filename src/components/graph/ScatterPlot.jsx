import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ScatterPlot = ({ data }) => {
    const svgRef = useRef(null);

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

        // X, Y 도메인 설정
        const xScale = d3
            .scaleLinear()
            .domain(d3.extent(data, (d) => d.tsne_x))
            .range([0, chartWidth]);

        const yScale = d3
            .scaleLinear()
            .domain(d3.extent(data, (d) => d.tsne_y))
            .range([chartHeight, 0]);

        const sizeScale = d3
            .scaleSqrt()
            .domain(d3.extent(data, (d) => d.votingPower))
            .range([5, 20]);

        const colorScale = d3
            .scaleOrdinal()
            .domain([...new Set(data.map((d) => d.cluster_label))])
            .range(d3.schemeTableau10);

        // 축 그리기
        chart
            .append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(xScale).ticks(10))
            .attr('font-size', '12px');

        chart.append('g').call(d3.axisLeft(yScale).ticks(10)).attr('font-size', '12px');

        // 노드 그리기
        const tooltip = d3
            .select('body')
            .append('div')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background', 'rgba(0, 0, 0, 0.7)')
            .style('color', '#fff')
            .style('padding', '5px 10px')
            .style('border-radius', '5px')
            .style('font-size', '12px');

        chart
            .selectAll('circle')
            .data(data)
            .enter()
            .append('circle')
            .attr('cx', (d) => xScale(d.tsne_x))
            .attr('cy', (d) => yScale(d.tsne_y))
            .attr('r', (d) => sizeScale(d.votingPower))
            .attr('fill', (d) => colorScale(d.cluster_label))
            .attr('opacity', 0.6)
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
    }, [data]);

    return (
        <div>
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default ScatterPlot;
