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

        const chainKeys = Object.keys(data[0])
            .filter((key) => {
                // voter와 cluster_label 제외
                if (key === 'voter' || key === 'cluster_label') return false;

                // gravity-bridge_ 접두사가 있는 경우
                if (key.startsWith('gravity-bridge_')) return true;

                // 기존 패턴 (chain_숫자)
                return /^[a-z_]+\d+$/.test(key);
            })
            .sort((a, b) => {
                // 숫자 부분을 추출하여 정렬
                const numA = parseInt(a.split('_').pop());
                const numB = parseInt(b.split('_').pop());
                return numA - numB;
            });
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
            .domain(['NO_VOTE', 'NO', 'NO_WITH_VETO', 'ABSTAIN', 'YES'])
            .range([height, 0])
            .padding(0.5);

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
                return voteScale(d.vote || 'NO_VOTE'); // null 값을 NO_VOTE로 처리
            })
            .defined((d) => d.vote !== undefined);

        data.forEach((voter) => {
            const lineData = [
                { chainID: 'Cluster', vote: `Cluster ${voter.cluster_label}` },
                ...chainKeys.map((chainID) => ({
                    chainID,
                    vote: voter[chainID] || 'NO_VOTE', // null 값을 NO_VOTE로 처리
                })),
                { chainID: 'End', vote: `Cluster ${voter.cluster_label}` },
            ];

            g.append('path')
                .datum(lineData)
                .attr('fill', 'none')
                .attr('stroke', () => colorScale(voter.cluster_label))
                .attr('stroke-width', 1.5)
                .attr('d', line)
                .style('opacity', 0.6);
        });
    }, [data]);

    return (
        <div className="mt-1 flex justify-center items-center">
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default Parallel;
