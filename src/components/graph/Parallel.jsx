import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { NormalColors } from '../color';

const Parallel = ({ data }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!svgRef.current || !data || data.length === 0) return;

        // SVG 초기화
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 820;
        const height = 120;

        const g = svg.attr('width', width).attr('height', height).append('g');
        //            .attr('transform', `translate(${margin.left},${margin.top})`);

        // 모든 체인 키 추출
        const chainKeys = Object.keys(data[0]).filter((key) => /^[a-z_]+\d+$/.test(key));

        const colorScale = d3.scaleOrdinal(NormalColors);

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
            .domain(['NO', 'NO_WITH_VETO', 'ABSTAIN', 'YES'])
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
                .attr('stroke', () => colorScale(voter.cluster_label))
                .attr('stroke-width', 1.5)
                .attr('d', line)
                .style('opacity', 0.3);
        });
    }, [data]);

    return (
        <div className="mt-1 flex justify-center items-center">
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default Parallel;
