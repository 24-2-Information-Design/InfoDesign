import { useEffect, useState } from 'react';
import NetworkPie from '../components/graph/NetworkPie';
import ScatterPlot from '../components/graph/ScatterPlot';
import Parallel from '../components/graph/Parallel';

const Home = () => {
    const [selectedChain, setSelectedChain] = useState('akash');
    const [scatterData, setScatterData] = useState(null);
    const [parallelData, setParallelData] = useState(null);
    const [loading, setLoading] = useState(false); // 로딩 상태 추가
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedChain) return;

        setLoading(true); // 로딩 시작
        setError(null); // 에러 초기화

        const ScatterFile = `/data/scatter_data/validator_scatter_${selectedChain}.json`; // 파일 경로
        const ParallelFile = `/data/parallel_data/parallel_${selectedChain}.json`;

        // fetch 호출 병렬 처리
        Promise.all([
            fetch(ScatterFile).then((response) => response.json()),
            fetch(ParallelFile).then((response) => response.json()),
        ])
            .then(([scatterResult, parallelResult]) => {
                setScatterData(scatterResult);
                setParallelData(parallelResult);
            })
            .catch((error) => {
                console.log(error);
                setError('Failed to load data');
            })
            .finally(() => {
                setLoading(false); // 로딩 완료
            });
    }, [selectedChain]);
    return (
        <div className="flex pd-0">
            <div className="w-4/7 ml-4 border-r-2">
                <h1 className="font-bold mb-4">Overall Chain View</h1>
                <NetworkPie onSelectChain={setSelectedChain} />
            </div>

            <div className="w-3/5 flex flex-col ml-8">
                <h1 className="font-bold">Specific Validator View</h1>
                {/* 오른쪽 위 2/3 영역 */}
                <div className="flex-2/5 ">
                    {scatterData ? (
                        <ScatterPlot data={scatterData} />
                    ) : (
                        selectedChain && <p>Loading scatter plot for {selectedChain}...</p>
                    )}
                </div>

                {/* 오른쪽 아래 1/3 영역 */}
                <div className="flex-2/5 ">
                    {parallelData ? <Parallel data={parallelData} /> : selectedChain && <p>Loading... </p>}
                </div>
                <div className="flex h-full ">
                    <div className="w-1/2">
                        <p>Validator Result</p>
                    </div>
                    <div className="w-1/2  h-full border-l-4">
                        <p>Cluster Result</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
