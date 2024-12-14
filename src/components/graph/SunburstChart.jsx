import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import useChainStore from '../../store/store';

const SunburstChart = ({ data, parallelData }) => {
  const svgRef = useRef(null);
  const { selectedValidators, selectedChain } = useChainStore();

  const voteTypes = [
    { name: 'Yes', color: '#2ecc71' },
    { name: 'No', color: '#e74c3c' },
    { name: 'Veto', color: '#f1c40f' },
    { name: 'Abstain', color: '#3498db' },
    { name: 'No Vote', color: '#95a5a6' }
  ];

  const checkVoteAgreement = (proposalId, parallelData, selectedValidators) => {
    if (!selectedValidators || selectedValidators.length < 2) return false;
    
    // 현재 선택된 체인을 기반으로 proposal ID 생성
    const proposalKey = `${selectedChain}_${proposalId}`;
    
    // 선택된 검증인들의 투표 데이터 추출
    const validatorVotes = selectedValidators.map(validator => {
      const validatorData = parallelData.find(d => d.voter === validator);
      return validatorData ? validatorData[proposalKey] : null;
    }).filter(vote => vote !== null);  // null 투표 제외

    // 유효한 투표가 2개 미만이면 false
    if (validatorVotes.length < 2) return false;

    // 모든 투표가 동일한지 확인
    return validatorVotes.every(vote => vote === validatorVotes[0]);
  };

  const transformData = (rawData) => {
    if (!rawData) return null;

    return {
      name: "Proposals",
      children: voteTypes.map(type => ({
        name: type.name.toLowerCase(),
        color: type.color,
        children: rawData
          .filter(d => d[type.name.toLowerCase()] > 0)  // 투표 타입을 소문자로 매칭
          .map(d => ({
            name: d.title,
            value: 1,
            proposalId: d.id,  // dendrogram의 id 필드 사용
            hasAgreement: checkVoteAgreement(d.id, parallelData, selectedValidators)
          }))
      }))
    };
  };

  useEffect(() => {
    if (!data || !parallelData) return;

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

    // 툴팁 설정
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('padding', '10px')
      .style('border-radius', '4px')
      .style('font-size', '12px');

    const path = svg.selectAll("path")
      .data(root.descendants().slice(1))
      .enter()
      .append("path")
      .attr("d", arc)
      .style("fill", d => {
        if (d.depth === 2) {
          // 선택된 검증인들의 투표가 일치하는 경우 강조색 사용
          return d.data.hasAgreement ? d.parent.data.color : "#d3d3d3";
        }
        return colorMap[d.data.name];
      })
      .style("opacity", d => d.depth === 2 && d.data.hasAgreement ? 0.8 : 0.6)
      .style("stroke", "white")
      .style("stroke-width", "0.5")
      .on('mouseover', function(event, d) {
        if (d.depth === 2) {
          tooltip.style('visibility', 'visible')
            .html(`
              <strong>Proposal: ${d.data.name}</strong><br/>
              <strong>Vote Type: ${d.parent.data.name}</strong>
              ${d.data.hasAgreement ? '<br/><span style="color: green;">✓ Selected validators agreed on this proposal</span>' : ''}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');

          d3.select(this)
            .style("opacity", 1)
            .style("stroke-width", "2");
        }
      })
      .on('mouseout', function(event, d) {
        tooltip.style('visibility', 'hidden');
        
        d3.select(this)
          .style("opacity", d.depth === 2 && d.data.hasAgreement ? 0.8 : 0.6)
          .style("stroke-width", "0.5");
      });

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

    return () => {
      tooltip.remove();
    };

  }, [data, parallelData, selectedValidators, selectedChain]); // selectedChain 의존성 추가

  return <svg ref={svgRef} className="w-full h-full" />;
};

export default SunburstChart;