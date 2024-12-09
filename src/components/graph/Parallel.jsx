import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const VOTE_COLORS = {
    YES: '#4CAF50', // 녹색
    NO: '#F44336', // 빨간색
    ABSTAIN: '#FFC107', // 노란색
    NO_WITH_VETO: '#9C27B0', // 보라색
    NO_VOTE: '#3F3F3F', // 회색
    null: '#E0E0E0', // 연한 회색
};

const Parallel = ({ data }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!svgRef.current || !data || data.length === 0) return;

        // SVG 초기화
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 800;
        const height = 180;

        const g = svg.attr('width', width).attr('height', height).append('g');
        //            .attr('transform', `translate(${margin.left},${margin.top})`);

        // 모든 체인 키 추출
        const chainKeys = Object.keys(data[0]).filter((key) => /^[a-z_]+\d+$/.test(key));

        // x축 구성
        const xScale = d3
            .scalePoint()
            .domain(['Cluster', ...chainKeys, 'End'])
            .range([0, width])
            .padding(0.5);

        // y축 구성
        const clusterScale = d3
            .scalePoint()
            .domain([...Array.from({ length: 14 }, (_, i) => `Cluster ${i}`)])
            .range([height, 0])
            .padding(0.5);

        const voteScale = d3
            .scalePoint()
            .domain(['NO', 'NO_WITH_VETO', 'NO_VOTE', 'ABSTAIN', 'YES'])
            .range([height, 0])
            .padding(0.5);

        // x축 그리기
        g.append('g').attr('transform', `translate(0, ${height})`);
        // .call(d3.axisBottom(xScale).tickFormat((d) => (d === 'Cluster' || d === 'End' ? d : d.split('_')[1])));

        // 축 그리기
        g.selectAll('.axis')
            .data(['Cluster', ...chainKeys])
            .enter()
            .append('g')
            .attr('class', 'axis')
            .attr('transform', (d) => `translate(${xScale(d)}, 0)`)
            .each(function (d) {
                d3.select(this).call(d3.axisLeft(d === 'Cluster' ? clusterScale : voteScale));
            })
            .selectAll('.tick text')
            .remove();

        // 라인 생성
        const line = d3
            .line()
            .x((d) => xScale(d.chainID))
            .y((d) => {
                if (d.chainID === 'Cluster' || d.chainID === 'End') {
                    return clusterScale(d.vote);
                }
                return voteScale(d.vote);
            })
            .defined((d) => {
                if (d.chainID === 'Cluster' || d.chainID === 'End') {
                    return clusterScale(d.vote) !== undefined;
                }
                return voteScale(d.vote) !== undefined;
            });

        data.forEach((voter) => {
            const lineData = [
                { chainID: 'Cluster', vote: `Cluster ${voter.cluster_label}` },
                ...chainKeys.map((chainID) => ({
                    chainID,
                    vote: voter[chainID] || 'NO_VOTE',
                })),
                { chainID: 'End', vote: `Cluster ${voter.cluster_label}` },
            ];

            g.append('path')
                .datum(lineData)
                .attr('fill', 'none')
                .attr('stroke', (d) => {
                    // 각 점의 투표 값에 따라 색상 설정
                    const votes = d.filter((point) => chainKeys.includes(point.chainID));
                    const voteColors = votes.map((point) => VOTE_COLORS[point.vote] || VOTE_COLORS['NO_VOTE']);
                    return voteColors.length > 0 ? voteColors[0] : VOTE_COLORS['NO_VOTE'];
                })
                .attr('stroke-width', 1.5)
                .attr('d', line)
                .style('opacity', 0.3);
        });
    }, [data]);

    return (
        <div className="border-t-4 border-b-4 pb-4">
            <h2 className="mt-2 mb-2 text-2xl font-semibold">Votes by Voters</h2>
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default Parallel;
