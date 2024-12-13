import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const SunburstChart = ({ data }) => {
  const svgRef = useRef(null);

  const transformData = (rawData) => {
    if (!rawData) return null;

    // 데이터를 계층 구조로 변환
    return {
      name: "Votes",
      children: [
        {
          name: "Yes",
          children: rawData.filter(d => d.yes > 0).map(d => ({
            name: d.title,
            value: d.yes
          }))
        },
        {
          name: "No",
          children: rawData.filter(d => d.no > 0).map(d => ({
            name: d.title,
            value: d.no
          }))
        },
        {
          name: "Veto",
          children: rawData.filter(d => d.veto > 0).map(d => ({
            name: d.title,
            value: d.veto
          }))
        },
        {
          name: "Abstain",
          children: rawData.filter(d => d.abstain > 0).map(d => ({
            name: d.title,
            value: d.abstain
          }))
        },
        {
          name: "No Vote",
          children: rawData.filter(d => d.no_vote > 0).map(d => ({
            name: d.title,
            value: d.no_vote
          }))
        }
      ]
    };
  };

  useEffect(() => {
    if (!data) return;

    const width = 500;
    const height = 500;
    const radius = Math.min(width, height) / 2;

    // SVG 초기화
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // 색상 스케일 설정
    const color = d3.scaleOrdinal()
      .domain(["Yes", "No", "Veto", "Abstain", "No Vote"])
      .range(["#2ecc71", "#e74c3c", "#f1c40f", "#3498db", "#95a5a6"]);

    // 데이터 변환
    const hierarchyData = d3.hierarchy(transformData(data))
      .sum(d => d.value);

    // Partition 레이아웃 생성
    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    const root = partition(hierarchyData);

    // Arc 생성기
    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1);

    // 차트 그리기
    const path = svg.selectAll("path")
      .data(root.descendants())
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", d => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .style("opacity", 0.8)
      .style("stroke", "white")
      .style("stroke-width", "0.5");

    // 툴팁 추가
    path.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\nValue: ${d.value}`);

    // 레이블 추가
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
      .text(d => d.data.name);

  }, [data]);

  return <svg ref={svgRef} className="w-full h-full"/>;
};

export default SunburstChart;