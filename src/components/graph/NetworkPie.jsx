import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

// eslint-disable-next-line react/prop-types
const NetworkPie = ({ data, links }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!data || typeof data !== 'object') {
            return;
        }

        const width = 800;
        const height = 600;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // 이전 내용 초기화
        svg.attr('width', width).attr('height', height);

        const nodes = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value,
        }));

        const getClusterData = (node) => {
            return Object.entries(node)
                .filter(([key]) => key.startsWith('cluster'))
                .map(([key, value]) => ({ cluster: key, value }));
        };

        const color = d3
            .scaleOrdinal()
            .domain(
                Array.from(new Set(nodes.flatMap((node) => Object.keys(node).filter((k) => k.startsWith('cluster')))))
            )
            .range(d3.schemeCategory10);

        const pie = d3.pie().value((d) => d.value);
        const arc = d3.arc().innerRadius(0).outerRadius(40); // 파이차트 크기 조정

        const getX = (x) => Math.max(30, Math.min(width - 40, x * (width / 10)));
        const getY = (y) => Math.max(30, Math.min(height - 40, y * (height / 10)));

        const nodeGroups = svg
            .selectAll('g.node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr(
                'transform',
                (d) => `translate(${getX(d.x)}, ${getY(d.y)})` // 위치 조정
            );
        nodeGroups
            .selectAll('path')
            .data((d) => pie(getClusterData(d)))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', (d) => color(d.data.cluster))
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5);

        // nodeGroups
        //     .append('text')
        //     .text((d) => d.id)
        //     .attr('dy', 40)
        //     .attr('text-anchor', 'middle')
        //     .style('font-size', '10px')
        //     .style('fill', 'black');

        // const drag = d3
        //     .drag()
        //     .on('start', function (event, d) {
        //         // 드래그 시작 시 현재 위치 저장
        //         d3.select(this).raise(); // 드래그된 노드를 최상단으로 올림
        //     })
        //     .on('drag', function (event, d) {
        //         // 드래그 중, 노드 위치 변경
        //         const newX = getX(d.x + event.dx / (width / 10)); // 드래그된 거리만큼 이동
        //         const newY = getY(d.y + event.dy / (height / 10)); // 드래그된 거리만큼 이동

        //         const validX = !isNaN(newX) ? newX : d.x * (width / 10); // NaN이면 기존 값으로 유지
        //         const validY = !isNaN(newY) ? newY : d.y * (height / 10); // NaN이면 기존 값으로 유지

        //         d3.select(this) // 현재 노드 그룹
        //             .attr('transform', `translate(${validX}, ${validY})`);

        //         d.x = validX; // 업데이트된 위치 저장
        //         d.y = validY; // 업데이트된 위치 저장
        //     });

        // // 드래그를 활성화
        // nodeGroups.call(drag);

        if (links && Array.isArray(links)) {
            svg.selectAll('line.link')
                .data(links)
                .enter()
                .append('line')
                .attr('class', 'link')
                .attr('x1', (d) => {
                    const sourceNode = nodes.find((node) => node.id === d.source);
                    return sourceNode ? sourceNode.x * (width / 10) : 0;
                })
                .attr('y1', (d) => {
                    const sourceNode = nodes.find((node) => node.id === d.source);
                    return sourceNode ? sourceNode.y * (height / 10) : 0;
                })
                .attr('x2', (d) => {
                    const targetNode = nodes.find((node) => node.id === d.target);
                    return targetNode ? targetNode.x * (width / 10) : 0;
                })
                .attr('y2', (d) => {
                    const targetNode = nodes.find((node) => node.id === d.target);
                    return targetNode ? targetNode.y * (height / 10) : 0;
                })
                .attr('stroke', '#999')
                .attr('stroke-width', 1);
        }
    }, [data, links]);

    return <svg ref={svgRef} />;
};

export default NetworkPie;
