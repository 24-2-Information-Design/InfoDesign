import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SunburstChart = ({ data }) => {
  const svgRef = useRef(null);

  const voteTypes = [
    { name: 'Yes', color: '#2ecc71' },
    { name: 'No', color: '#e74c3c' },
    { name: 'Veto', color: '#f1c40f' },
    { name: 'Abstain', color: '#3498db' },
    { name: 'No Vote', color: '#95a5a6' }
  ];

  const transformData = (rawData) => {
    if (!rawData) return null;

    return {
      name: "Proposals",
      children: voteTypes.map(type => ({
        name: type.name.toLowerCase(),
        color: type.color,
        children: rawData
          .filter(d => d[type.name.toLowerCase().replace(' ', '_')] > 0)
          .map(d => ({
            name: d.title,
            value: 1
          }))
      }))
    };
  };

  useEffect(() => {
    if (!data) return;

    const width = 500;
    const height = 500;
    const radius = Math.min(width, height) / 2;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const colorMap = Object.fromEntries(
      voteTypes.map(type => [type.name.toLowerCase(), type.color])
    );

    const hierarchyData = d3.hierarchy(transformData(data))
      .sum(d => d.value);

    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    const root = partition(hierarchyData);

    root.descendants().forEach(d => {
      if (d.depth === 1) {
        d.y0 = 0;
        d.y1 = radius * 0.7;
      } else if (d.depth === 2) {
        d.y0 = radius * 0.7;
        d.y1 = radius;
      }
    });

    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    const path = svg.selectAll("path")
      .data(root.descendants().slice(1))
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", d => {
        if (d.depth === 2) {
          return "#d3d3d3";
        }
        return colorMap[d.data.name];
      })
      .style("opacity", 0.8)
      .style("stroke", "white")
      .style("stroke-width", "0.5");

    const text = svg.selectAll("text")
      .data(root.descendants().filter(d => d.depth === 1))
      .enter()
      .append("text")
      .attr("transform", function(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "white")
      .text(d => d.data.name.charAt(0).toUpperCase() + d.data.name.slice(1));

  }, [data]);

  return <svg ref={svgRef} className="w-full h-full" />;
};

export default SunburstChart;