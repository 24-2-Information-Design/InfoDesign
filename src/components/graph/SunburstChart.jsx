import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import useChainStore from '../../store/store';

const SunburstChart = ({ data, parallelData }) => {
    const svgRef = useRef(null);
    const { selectedValidators, selectedChain, singleSelectMode } = useChainStore();

    const voteColors = {
        YES: '#2ecc71',
        NO: '#e74c3c',
        NO_WITH_VETO: '#f1c40f',
        ABSTAIN: '#3498db',
        NO_VOTE: '#95a5a6',
    };

    const voteLabels = {
        YES: 'Yes',
        NO: 'No',
        NO_WITH_VETO: 'Veto',
        ABSTAIN: 'Abstain',
        NO_VOTE: 'No Vote',
    };

    const getVoteTypeColor = (voteName) => {
        return voteColors[voteName] || '#95a5a6';
    };

    const getMostCommonVote = (proposalId, parallelData) => {
        const proposalKey = `${selectedChain}_${proposalId}`;
        const voteCount = {};
        let totalVotes = 0;

        parallelData.forEach((validator) => {
            const vote = validator[proposalKey] || 'NO_VOTE';
            voteCount[vote] = (voteCount[vote] || 0) + 1;
            totalVotes++;
        });

        const noVoteRatio = (voteCount['NO_VOTE'] || 0) / totalVotes;
        if (noVoteRatio >= 0.8) return 'NO_VOTE';

        let maxVote = 'NO_VOTE';
        let maxCount = 0;

        Object.entries(voteCount).forEach(([vote, count]) => {
            if (vote !== 'NO_VOTE' && count > maxCount) {
                maxCount = count;
                maxVote = vote;
            }
        });

        return maxVote === 'NO_VOTE' && maxCount === 0 ? 'NO_VOTE' : maxVote;
    };

    // SunburstChart.jsx 내부의 getValidatorInfo 함수를 수정

    const calculateParticipationRate = (validator) => {
        if (!validator || !data || !parallelData) return 0;
        
        const validatorData = parallelData.find(d => d.voter === validator);
        if (!validatorData) return 0;

        // 전체 제안 수
        const totalProposals = data.length;
        
        // 투표에 참여한 제안 수 계산 (NO_VOTE가 아닌 경우)
        const participatedProposals = data.reduce((count, proposal) => {
            const proposalKey = `${selectedChain}_${proposal.id}`;
            const vote = validatorData[proposalKey];
            return vote && vote !== 'NO_VOTE' ? count + 1 : count;
        }, 0);

        // 참여율 계산
        return (participatedProposals / totalProposals) * 100;
    };

    const getValidatorInfo = (validator) => {
        if (!validator || !parallelData) return null;
        const validatorData = parallelData.find(d => d.voter === validator);
        if (!validatorData) return null;
        
        return {
            name: validator,
            cluster: validatorData.cluster_label,
            participationRate: calculateParticipationRate(validator).toFixed(1)
        };
    };

    const checkVoteResult = (proposalId, parallelData, selectedValidators) => {
        if (!selectedValidators || selectedValidators.length === 0) {
            return getMostCommonVote(proposalId, parallelData);
        }

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

    const calculateMatchStatistics = (rawData) => {
        if (!selectedValidators || selectedValidators.length < 2) return { rate: 0, matched: 0, total: 0 };

        const totalProposals = rawData.length;
        const agreedProposals = rawData.filter((d) => {
            const voteResult = checkVoteResult(d.id, parallelData, selectedValidators);
            return typeof voteResult === 'string';
        }).length;

        return {
            rate: ((agreedProposals / totalProposals) * 100).toFixed(1),
            matched: agreedProposals,
            total: totalProposals,
        };
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
        const legendHeight = 40;

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3
            .select(svgRef.current)
            .attr('width', width)
            .attr('height', height + legendHeight);

        const legend = svg.append('g').attr('class', 'legend').attr('transform', `translate(10, 20)`);

        const legendItems = Object.entries(voteLabels);

        let currentX = 0;
        legendItems.forEach(([voteType, label]) => {
            const legendItem = legend.append('g').attr('transform', `translate(${currentX}, 0)`);

            legendItem
                .append('rect')
                .attr('width', 10)
                .attr('height', 10)
                .attr('fill', voteColors[voteType])
                .style('opacity', 0.8);

            const legendText = legendItem
                .append('text')
                .attr('x', 14)
                .attr('y', 9)
                .style('font-size', '11px')
                .style('fill', '#666')
                .text(label);

            const textWidth = legendText.node().getComputedTextLength();
            currentX += 14 + textWidth + 15;
        });

        const chartGroup = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2 + legendHeight})`);

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

        const path = chartGroup
            .selectAll('path')
            .data(root.descendants().slice(1))
            .enter()
            .append('path')
            .attr('d', arc)
            .style('fill', (d) => {
                if (d.depth === 2) {
                    if (selectedValidators.length === 0) {
                        return getVoteTypeColor(d.data.voteResult);
                    } else if (selectedValidators.length === 1) {
                        return getVoteTypeColor(d.data.voteResult);
                    } else {
                        return d.data.voteResult ? getVoteTypeColor(d.data.voteResult) : '#d3d3d3';
                    }
                }
                return d.data.color;
            })
            .style('opacity', (d) => (d.depth === 2 ? 0.8 : 0.6))
            .style('stroke', 'white')
            .style('stroke-width', '0.5')
            .on('mouseover', function (event, d) {
                d3.select(this).style('opacity', 1).style('stroke-width', '2');

                const tooltipContent =
                    d.depth === 1
                        ? `<strong>Type: ${d.data.name}</strong><br/>
                           <span>Number of Proposals: ${d.children.length}</span>`
                        : `<strong>Proposal ID: ${d.data.proposalId}</strong><br/>
                           <strong>Proposal: ${d.data.name}</strong><br/>
                           <strong>Type: ${d.parent.data.name}</strong>
                           ${
                               selectedValidators.length === 0
                                   ? `<br/><span style="color: green;">Most Common Vote: ${d.data.voteResult}</span>
                                   ${d.data.voteResult === 'NO_VOTE' ? ' (>80% No Vote)' : ' (Excluding No Votes)'}`
                                   : selectedValidators.length === 1
                                   ? `<br/><span style="color: green;">Vote: ${d.data.voteResult}</span>`
                                   : d.data.voteResult
                                   ? '<br/><span style="color: green;">✓ Selected validators agreed: ' +
                                     d.data.voteResult +
                                     '</span>'
                                   : ''
                           }`;

                tooltip
                    .style('visibility', 'visible')
                    .html(tooltipContent)
                    .style('left', event.pageX + 10 + 'px')
                    .style('top', event.pageY - 10 + 'px');
            })
            .on('mousemove', function (event) {
                tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 10 + 'px');
            })
            .on('mouseout', function (event, d) {
                tooltip.style('visibility', 'hidden');
                d3.select(this)
                    .style('opacity', d.depth === 2 ? 0.8 : 0.6)
                    .style('stroke-width', '0.5');
            });

        // 중앙 정보 표시
        const centerGroup = chartGroup
            .append('g')
            .attr('class', 'center-stats')
            .style('opacity', () => {
                if (singleSelectMode) {
                    return selectedValidators.length === 1 ? 1 : 0;
                } else {
                    return selectedValidators.length >= 2 ? 1 : 0;
                }
            });

        if (singleSelectMode && selectedValidators.length === 1) {
            // 단일 검증인 정보 표시
            const validatorInfo = getValidatorInfo(selectedValidators[0]);
            
            if (validatorInfo) {
                centerGroup
                    .append('text')
                    .attr('class', 'validator-name')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '-1.2em')
                    .style('font-size', '16px')
                    .style('fill', '#333')
                    .text(validatorInfo.name);

                centerGroup
                    .append('text')
                    .attr('class', 'validator-cluster')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '0.2em')
                    .style('font-size', '14px')
                    .style('fill', '#666')
                    .text(`Cluster ${validatorInfo.cluster}`);

                centerGroup
                    .append('text')
                    .attr('class', 'validator-participation')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '1.6em')
                    .style('font-size', '14px')
                    .style('fill', '#666')
                    .text(`${validatorInfo.participationRate}%`);
            }
        } else if (!singleSelectMode && selectedValidators.length >= 2) {
            // 매치율 정보 표시
            const matchStats = calculateMatchStatistics(data);

            centerGroup
                .append('text')
                .attr('class', 'match-rate')
                .attr('text-anchor', 'middle')
                .attr('dy', '-0.2em')
                .style('font-size', '24px')
                .style('fill', '#333')
                .text(`${matchStats.rate}%`);

            centerGroup
                .append('text')
                .attr('class', 'match-count')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.9em')
                .style('font-size', '14px')
                .style('fill', '#666')
                .text(`${matchStats.matched} / ${matchStats.total}`);

            centerGroup
                .append('text')
                .attr('class', 'match-label')
                .attr('text-anchor', 'middle')
                .attr('dy', '2.1em')
                .style('font-size', '14px')
                .style('fill', '#666')
                .text('Match Rate');
        }

        return () => {
            tooltip.remove();
        };
    }, [data, parallelData, selectedValidators, selectedChain, singleSelectMode]);

    return (
        <div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg pl-3">
                        {singleSelectMode ? 'Personal Proposal' : 'Proposal Match'}
                    </h3>
                </div>
            </div>
            <svg ref={svgRef} className="mb-80 ml-24" />
        </div>);
};

export default SunburstChart;