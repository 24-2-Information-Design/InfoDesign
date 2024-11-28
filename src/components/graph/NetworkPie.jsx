import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { data } from '../../pages/data';

const NetworkPie = () => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // Clear previous rendering

        // 화면 크기를 기준으로 svg 크기 설정 (2/3 비율)
        const width = (window.innerWidth * 2) / 3; // 화면의 2/3
        const height = window.innerHeight + 10;
        const nodeCount = Object.keys(data).length;

        svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

        // Prepare nodes with x, y, vx, vy properties
        const nodes = Object.keys(data).map((blockchain) => ({
            id: blockchain,
            x: data[blockchain]['x-axis'],
            y: data[blockchain]['y-axis'],
            radius: data[blockchain].radius,
            proposal: data[blockchain].proposal, // Add proposal data
            proportion: data[blockchain].proportion,
        }));

        // Enhanced force simulation to prevent overlap
        const simulation = d3
            .forceSimulation(nodes)
            .force('charge', d3.forceCollide().radius(100)) // 충돌 방지를 위한 radius 크기 조정 (좀 더 작은 값으로)
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('x', d3.forceX(width / 2).strength(0.2))
            .force('y', d3.forceY(height / 2).strength(0.2))
            .force(
                'radial',
                d3
                    .forceRadial(
                        Math.min(width, height) / (3 * nodeCount), // Dynamic radial force with stronger strength
                        width / 2,
                        height / 2
                    )
                    .strength(0.5) // Adjusted to keep elements within bounds
            )
            .stop();

        // Run the simulation synchronously with more iterations
        for (let i = 0; i < 600; ++i) simulation.tick(); // 좀 더 많은 tick으로 안정화

        nodes.forEach((node) => {
            const blockchain = node.id;
            const chainData = data[blockchain];

            // Ensure radius doesn't exceed available space
            const maxRadius = Math.min(width, height) / 4; // Limiting radius size
            const radius = Math.min(40 + chainData.radius * 1.5, maxRadius); // 차트 크기 더 줄이기

            const proportionData = Object.entries(chainData.proportion).map(([key, value]) => ({ month: key, value }));

            const pie = d3.pie().value((d) => d.value);
            const arcData = pie(proportionData);

            const colorScale = d3
                .scaleSequential()
                .domain([0, proportionData.length])
                .interpolator(d3.interpolateBlues);

            const arc = d3
                .arc()
                .innerRadius(0) // Pie chart inner radius
                .outerRadius(radius); // Pie chart outer radius

            const blockchainGroup = svg
                .append('g')
                .attr('transform', `translate(${node.x}, ${node.y})`)
                .attr('class', 'blockchain-group');

            // Pie Chart (unchanged)
            blockchainGroup
                .selectAll('path')
                .data(arcData)
                .enter()
                .append('path')
                .attr('d', arc)
                .attr('fill', (d, i) => colorScale(i))
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .append('title')
                .text((d) => `${blockchain} - proportion ${d.data.month}: ${(d.data.value * 100).toFixed(2)}%`);

            // Add bars around the pie chart for each month (1-12)
            const barWidth = 25; // Width of each bar

            proportionData.forEach((d, index) => {
                const angle = (index / 12) * 2 * Math.PI; // 각도를 월에 맞게 배분

                // 월 범위가 1에서 12까지로 제한되도록 보장
                const month = (index % 12) + 1;

                // Adjust the bar length based on the proposal value
                const barLength = (chainData.proposal[month] / 100) * radius * 1; // Adjust according to proposal value

                const x1 = radius * Math.cos(angle); // x 좌표 (시작점)
                const y1 = radius * Math.sin(angle); // y 좌표 (시작점)

                // 바 끝이 원형 차트 바깥으로 나가게 하기 위해서
                const x2 = (radius + barLength) * Math.cos(angle); // x 좌표 (끝점)
                const y2 = (radius + barLength) * Math.sin(angle); // y 좌표 (끝점)

                // 바 그리기 (색상을 노란색으로 설정)
                blockchainGroup
                    .append('line')
                    .attr('x1', x1)
                    .attr('y1', y1)
                    .attr('x2', x2)
                    .attr('y2', y2)
                    .attr('stroke', d3.interpolateBlues((index + 1) / 12))
                    .attr('stroke-width', barWidth)
                    .append('title')
                    .text(`proposal ${month}: ${(d.value * 100).toFixed(2)}%`); // month 값만 1부터 12로 표시
            });

            // Blockchain Label
            blockchainGroup
                .append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', radius + 20)
                .text(blockchain)
                .attr('font-size', '14px')
                .attr('font-weight', 'bold');
        });
    }, []);

    return (
        <div>
            <svg ref={svgRef}></svg>
        </div>
    );
};

export default NetworkPie;
