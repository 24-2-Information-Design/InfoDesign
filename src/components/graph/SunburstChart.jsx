import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import useChainStore from '../../store/store';

const SunburstChart = ({ data, parallelData }) => {
    const svgRef = useRef(null);
    const { selectedValidators, selectedChain } = useChainStore();

    const voteColors = {
        YES: '#2ecc71',
        NO: '#e74c3c',
        NO_WITH_VETO: '#f1c40f',
        ABSTAIN: '#3498db',
        NO_VOTE: '#95a5a6',
    };

    const voteLabels = {
        YES: 'YES',
        NO: 'NO',
        NO_WITH_VETO: 'VETO',
        ABSTAIN: 'ABSTAIN',
        NO_VOTE: 'NO VOTE'
    };

    const getVoteTypeColor = (voteName) => {
        return voteColors[voteName] || '#95a5a6';
    };

    const checkVoteResult = (proposalId, parallelData, selectedValidators) => {
        if (!selectedValidators || selectedValidators.length === 0) return false;

        const proposalKey = `${selectedChain}_${proposalId}`;

        if (selectedValidators.length === 1) {
            const validatorData = parallelData.find((d) => d.voter === selectedValidators[0]);
            return validatorData ? validatorData[proposalKey] || 'NO_VOTE' : 'NO_VOTE';
        }

        const validatorVotes = selectedValidators.map((validator) => {
            const validatorData = parallelData.find((d) => d.voter === validator);
            return validatorData ? validatorData[proposalKey] || 'NO_VOTE' : 'NO_VOTE';
        });

        const allSameVote = validatorVotes.every((vote) => vote === validatorVotes[0]);
        return allSameVote ? validatorVotes[0] : false;
    };

    const calculateMatchRate = (rawData) => {
        if (!selectedValidators || selectedValidators.length < 2) return 0;

        const totalProposals = rawData.length;
        const agreedProposals = rawData.filter((d) => {
            const voteResult = checkVoteResult(d.id, parallelData, selectedValidators);
            return typeof voteResult === 'string';
        }).length;

        return ((agreedProposals / totalProposals) * 100).toFixed(1);
    };

    const transformData = (rawData) => {
        if (!rawData) return null;

        const types = new Set(rawData.map((d) => d.type || 'Unknown'));
        const uniqueTypes = Array.from(types);

        const typeCounts = uniqueTypes.map((type) => ({
            type,
            count: rawData.filter((d) => (d.type || 'Unknown') === type).length,
        }));

        const sortedTypes = typeCounts.sort((a, b) => b.count - a.count);
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        return {
            name: 'Proposals',
            children: sortedTypes.map(({ type }) => ({
                name: type,
                color: colorScale(type),
                children: rawData
                    .filter((d) => (d.type || 'Unknown') === type)
                    .map((d) => ({
                        name: d.title,
                        value: 1,
                        proposalId: d.id,
                        voteResult: checkVoteResult(d.id, parallelData, selectedValidators),
                    })),
            })),
        };
    };

    useEffect(() => {
        if (!data || !parallelData) return;

        const width = 300;
        const height = 300;
        const radius = Math.min(width, height) / 2;
        const legendWidth = 150;  // 범례 영역 너비

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3
            .select(svgRef.current)
            .attr('width', width + legendWidth)  // 범례 공간 추가
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        const hierarchyData = d3.hierarchy(transformData(data)).sum((d) => d.value);

        const partition = d3.partition().size([2 * Math.PI, radius]);

        const root = partition(hierarchyData);

        root.descendants().forEach((d) => {
            if (d.depth === 1) {
                d.y0 = radius * 0.4;
                d.y1 = radius * 0.7;
            } else if (d.depth === 2) {
                d.y0 = radius * 0.7;
                d.y1 = radius * 0.95;
            }
        });

        const arc = d3
            .arc()
            .startAngle((d) => d.x0)
            .endAngle((d) => d.x1)
            .innerRadius((d) => d.y0)
            .outerRadius((d) => d.y1);

        const tooltip = d3
            .select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'white')
            .style('border', '1px solid #ddd')
            .style('padding', '10px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('z-index', '1000');

        const path = svg
            .selectAll('path')
            .data(root.descendants().slice(1))
            .enter()
            .append('path')
            .attr('d', arc)
            .style('fill', (d) => {
                if (d.depth === 2) {
                    if (selectedValidators.length === 1) {
                        return getVoteTypeColor(d.data.voteResult);
                    } else {
                        return d.data.voteResult ? getVoteTypeColor(d.data.voteResult) : '#d3d3d3';
                    }
                }
                return d.data.color;
            })
            .style('opacity', (d) =>
                d.depth === 2 && (selectedValidators.length === 1 || d.data.voteResult) ? 0.8 : 0.6
            )
            .style('stroke', 'white')
            .style('stroke-width', '0.5')
            .on('mouseover', function (event, d) {
                d3.select(this).style('opacity', 1).style('stroke-width', '2');
                
                const tooltipContent = d.depth === 1 
                    ? `<strong>Type: ${d.data.name}</strong><br/>
                       <span>Number of Proposals: ${d.children.length}</span>`
                    : `<strong>Proposal: ${d.data.name}</strong><br/>
                       <strong>Type: ${d.parent.data.name}</strong>
                       ${selectedValidators.length === 1
                           ? `<br/><span style="color: green;">Vote: ${d.data.voteResult}</span>`
                           : d.data.voteResult
                           ? '<br/><span style="color: green;">✓ Selected validators agreed: ' +
                             d.data.voteResult +
                             '</span>'
                           : ''}`;

                tooltip
                    .style('visibility', 'visible')
                    .html(tooltipContent)
                    .style('left', event.pageX + 10 + 'px')
                    .style('top', event.pageY - 10 + 'px');
            })
            .on('mousemove', function(event) {
                tooltip
                    .style('left', event.pageX + 10 + 'px')
                    .style('top', event.pageY - 10 + 'px');
            })
            .on('mouseout', function (event, d) {
                tooltip.style('visibility', 'hidden');
                d3.select(this)
                    .style(
                        'opacity',
                        d.depth === 2 && (selectedValidators.length === 1 || d.data.voteResult) ? 0.8 : 0.6
                    )
                    .style('stroke-width', '0.5');
            });

        // 범례 추가
        const legend = svg
            .append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${radius + 20}, ${-radius + 20})`);  // 차트 우측에 배치

        const legendItems = Object.entries(voteLabels);
        const legendSpacing = 25;  // 범례 항목 간 간격

        legendItems.forEach(([voteType, label], index) => {
            const legendItem = legend
                .append('g')
                .attr('transform', `translate(0, ${index * legendSpacing})`);

            legendItem
                .append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', voteColors[voteType])
                .style('opacity', 0.8);

            legendItem
                .append('text')
                .attr('x', 20)
                .attr('y', 12)
                .style('font-size', '12px')
                .style('fill', '#666')
                .text(label);
        });

        // 중앙에 Match Rate 표시 (2명 이상 선택시에만)
        const centerGroup = svg
            .append('g')
            .attr('class', 'center-stats')
            .style('opacity', selectedValidators.length >= 2 ? 1 : 0);

        centerGroup
            .append('text')
            .attr('class', 'match-rate')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.5em')
            .style('font-size', '24px')
            .style('fill', '#333')
            .text(`${calculateMatchRate(data)}%`);

        centerGroup
            .append('text')
            .attr('class', 'match-label')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.5em')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text('Match Rate');

        return () => {
            tooltip.remove();
        };
    }, [data, parallelData, selectedValidators, selectedChain]);

    return <svg ref={svgRef} className="mb-80 ml-24" />;
};

export default SunburstChart;