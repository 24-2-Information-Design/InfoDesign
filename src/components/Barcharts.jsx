import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

// eslint-disable-next-line react/prop-types
const BarChart = ({ data }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || typeof data !== 'object') {
            return;
        }

        const width = 800;
        const height = 400;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // 기존 내용 초기화
        svg.attr('width', width).attr('height', height);

        const clusters = Array.from(
            new Set(
                Object.values(data).flatMap((chain) => Object.keys(chain).filter((key) => key.startsWith('cluster')))
            )
        );

        const xScale = d3
            .scaleBand()
            .domain(Object.keys(data))
            .range([50, width - 200]) // 범례 공간 확보를 위해 오른쪽 여백 추가
            .padding(0.2);

        const yScale = d3
            .scaleLinear()
            .domain([0, 1])
            .range([height - 50, 20]);

        const color = d3.scaleOrdinal().domain(clusters).range(d3.schemeCategory10);

        const stack = d3.stack().keys(clusters);

        const series = stack(
            Object.entries(data).map(([key, value]) => ({
                chain: key,
                ...Object.fromEntries(clusters.map((cluster) => [cluster, value[cluster] || 0])),
            }))
        );

        svg.append('g')
            .selectAll('g')
            .data(series)
            .enter()
            .append('g')
            .attr('fill', (d) => color(d.key))
            .selectAll('rect')
            .data((d) => d)
            .enter()
            .append('rect')
            .attr('x', (d) => xScale(d.data.chain))
            .attr('y', (d) => yScale(d[1]))
            .attr('height', (d) => yScale(d[0]) - yScale(d[1]))
            .attr('width', xScale.bandwidth());

        // X축
        svg.append('g')
            .attr('transform', `translate(0, ${height - 50})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('text-anchor', 'middle');

        // Y축
        svg.append('g').attr('transform', 'translate(50, 0)').call(d3.axisLeft(yScale));

        // 범례(legend) 추가
        const legend = svg.append('g').attr('transform', `translate(${width - 150}, 20)`); // 오른쪽으로 이동

        clusters.forEach((cluster, index) => {
            const legendRow = legend.append('g').attr('transform', `translate(0, ${index * 20})`); // 각 항목 간격 조정

            legendRow.append('rect').attr('width', 15).attr('height', 15).attr('fill', color(cluster));

            legendRow
                .append('text')
                .attr('x', 20)
                .attr('y', 12)
                .style('text-anchor', 'start')
                .style('font-size', '12px')
                .text(cluster);
        });
    }, [data]);

    return <svg ref={svgRef} />;
};

export default BarChart;
