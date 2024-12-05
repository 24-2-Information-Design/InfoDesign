import { useEffect, useState } from 'react';
import NetworkPie from '../components/graph/NetworkPie';
import ScatterPlot from '../components/graph/ScatterPlot';

const Home = () => {
    const [selectedChain, setSelectedChain] = useState(null);
    const [scatterData, setScatterData] = useState(null);

    useEffect(() => {
        if (!selectedChain) return;

        const fileName = `/data/scatter_data/validator_scatter_${selectedChain}.json`; // 파일 경로
        fetch(fileName)
            .then((response) => response.json())
            .then((data) => setScatterData(data))
            .catch((error) => console.error('Error loading data:', error));
    }, [selectedChain]);

    return (
        <div className="flex pd-0">
            {/* 왼쪽 2/3 영역 */}
            <div className="w-2/3 ">
                <NetworkPie onSelectChain={setSelectedChain} />
            </div>

            {/* 오른쪽 1/3 영역 (내부적으로 다시 2/3, 1/3으로 분할) */}
            <div className="w-1/3 flex flex-col">
                {/* 오른쪽 위 2/3 영역 */}
                <div className="flex-2/3 ">
                    {scatterData ? (
                        <ScatterPlot data={scatterData} />
                    ) : (
                        selectedChain && <p>Loading scatter plot for {selectedChain}...</p>
                    )}
                </div>

                {/* 오른쪽 아래 1/3 영역 */}
                <div className="flex-1/3 "></div>
            </div>
        </div>
    );
};

export default Home;
