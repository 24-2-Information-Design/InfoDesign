import { useEffect, useState } from 'react';
import NetworkPie from '../components/graph/NetworkPie';
import ScatterPlot from '../components/graph/ScatterPlot';
import Parallel from '../components/graph/Parallel';
import useChainStore from '../store/store';
import CircularDendrogram from '../components/graph/CircularDendrogram';
import ValidatorTable from '../components/ValidatorTable';
import ClusterResult from '../components/ClusterResult';

const Home = () => {
    const { selectedChain, chainData } = useChainStore();
    const [scatterData, setScatterData] = useState(null);
    const [parallelData, setParallelData] = useState(null);
    const [dendroData, setDendroData] = useState(null);
    const [loading, setLoading] = useState(false); // 로딩 상태 추가
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedChain) return;

        setLoading(true);
        setError(null);

        const ScatterFile = `/data/scatter_data/scatter_${selectedChain}.json`; // 파일 경로
        const ParallelFile = `/data/parallel_data/parallel_${selectedChain}.json`;
        const DendroFile = `/data/dendrogram/dendrogram_${selectedChain}.json`;

        Promise.all([
            fetch(ScatterFile).then((response) => response.json()),
            fetch(ParallelFile).then((response) => response.json()),
            fetch(DendroFile).then((response) => response.json()),
        ])
            .then(([scatterResult, parallelResult, dendroResult]) => {
                setScatterData(scatterResult);
                setParallelData(parallelResult);
                setDendroData(dendroResult);
            })
            .catch((error) => {
                console.log(error);
                setError('Failed to load data');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [selectedChain]);

    return (
        <div className="flex flex-col w-full h-full">
            {/* header */}
            <h1 className="ml-4 mt-4">Find your friends</h1>
            {/* body */}
            <div className="w-full h-full flex flex-row">
                {/* left section */}
                <div className="w-2/5 h-full m-1 ml-3 shadow-xl rounded-lg border-slate-100 border-[0.3px]">
                    <h2 className="pl-3 pt-2">Overall Chain View</h2>
                    <div className="w-full h-[69%]">
                        <NetworkPie />
                    </div>
                    <div className="w-[94%] ml-4 mt-1 mb-1 flex border-t border-gray-200"></div>

                    {/* chain result */}
                    <div className="w-full h-[30%]">
                        <h3 className="pl-3 pt-2 ml-4">Chain Results</h3>
                        {selectedChain && (
                            <div className="border-2 ml-4">
                                <div className="ml-4">
                                    <strong>{selectedChain}</strong>
                                    <div className="flex flex-wrap justify-between">
                                        <div className="w-full sm:w-2/3">
                                            <div className="flex flex-wrap">
                                                <p className="w-full sm:w-1/2">검증인 수: {chainData.validator_num}</p>
                                                <p className="w-full sm:w-1/2">군집 수: {chainData.cluster_num}</p>
                                                <p className="w-full sm:w-1/2">proposal 수: {chainData.proposal_num}</p>
                                                <p className="w-full sm:w-1/2">의견 포용력: {chainData.radius}</p>
                                            </div>
                                        </div>
                                        <div className="w-1/2 sm:w-1/3 flex-wrap">
                                            <p>유사한 체인</p>
                                            <p>{chainData.similar_chains.join(', ')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* right section */}
                <div className="w-3/5 h-full m-1 mr-3 shadow-xl rounded-md border-slate-100 border-[0.3px]">
                    <h2 className="pl-3 pt-2">Specific Validator View</h2>

                    {/* validator & proposal view */}
                    <div className="w-full h-[42%] flex flex-row">
                        <div className="w-1/2 h-full">
                            {scatterData ? (
                                <ScatterPlot data={scatterData} />
                            ) : (
                                selectedChain && <p>Loading scatter plot for {selectedChain}...</p>
                            )}
                        </div>
                        <div className="w-1/2 h-full">
                            <CircularDendrogram data={dendroData} />
                        </div>
                    </div>

                    <div className="w-[95%] ml-5 mt-1 mb-1 flex border-t border-gray-200"></div>

                    {/* parallel view */}
                    <div className="w-full h-[26%]">
                        <h3 className="pl-3">Votes Tendency</h3>
                        {parallelData ? <Parallel data={parallelData} /> : selectedChain && <p>Loading... </p>}
                    </div>

                    <div className="w-[95%] ml-5 mb-1 flex border-t border-gray-200"></div>

                    {/* result view */}
                    <div className="w-full h-[28%] flex flex-row">
                        <div className="w-1/2 h-full">
                            <ValidatorTable />
                        </div>

                        <div className="w-1/2 h-full ">
                            <ClusterResult />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        // <div className="flex flex-row">
        //     <div className="w-2/5 ml-4 border-r-2">
        //         <h1 className="mb-4">Overall Chain View</h1>
        //         <NetworkPie onSelectChain={setSelectedChain} />
        //     </div>

        //     <div className="w-3/5 flex flex-col ml-8">
        //         <h1 className="font-bold">Specific Validator View</h1>
        //         {/* 오른쪽 위 2/3 영역 */}
        //         <div className="flex-2/5 ">
        //             {scatterData ? (
        //                 <ScatterPlot data={scatterData} />
        //             ) : (
        //                 selectedChain && <p>Loading scatter plot for {selectedChain}...</p>
        //             )}
        //         </div>

        //         {/* 오른쪽 아래 1/3 영역 */}
        //         <div className="flex-2/5 ">
        //             {parallelData ? <Parallel data={parallelData} /> : selectedChain && <p>Loading... </p>}
        //         </div>
        //         <div className="flex h-full ">
        //             <div className="w-1/2">
        //                 <p>Validator Result</p>
        //             </div>
        //             <div className="w-1/2  h-full border-l-4">
        //                 <p>Cluster Result</p>
        //             </div>
        //         </div>
        //     </div>
        // </div>
    );
};

export default Home;
