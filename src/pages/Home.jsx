import { useEffect, useState } from 'react';
import NetworkPie from '../components/graph/NetworkPie';
import ScatterPlot from '../components/graph/ScatterPlot';
import Parallel from '../components/graph/Parallel';
import useChainStore from '../store/store';
import SunburstChart from '../components/graph/SunburstChart';
import ValidatorTable from '../components/ValidatorTable';
import ClusterResult from '../components/ClusterResult';

const Home = () => {
    const { selectedChain, chainData } = useChainStore();
    const [scatterData, setScatterData] = useState(null);
    const [parallelData, setParallelData] = useState(null);
    const [sunburstData, setSunburstData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedChain) return;

        setLoading(true);
        setError(null);

        const ScatterFile = `/data/scatter_data/scatter_${selectedChain}.json`;
        const ParallelFile = `/data/parallel_data/parallel_${selectedChain}.json`;
        const SunburstFile = `/data/sunburst_data/sunburst_${selectedChain}.json`;

        Promise.all([
            fetch(ScatterFile).then((response) => response.json()),
            fetch(ParallelFile).then((response) => response.json()),
            fetch(SunburstFile).then((response) => response.json()),
        ])
            .then(([scatterResult, parallelResult, sunburstResult]) => {
                setScatterData(scatterResult);
                setParallelData(parallelResult);
                setSunburstData(sunburstResult);
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
                    <div className="w-full h-auto">
                        <h3 className="pl-3 pt-2 ml-4">Chain Results</h3>
                        {selectedChain && (
                            <div className="border-2 ml-4 p-4">
                                {/* 상단 3개 */}
                                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                    <div>
                                        <img
                                            src={`src/assets/${selectedChain}.png`}
                                            alt="selected-chain"
                                            className="mx-auto w-12 h-12 mb-2"
                                        />
                                        <strong className="text-lg">{selectedChain}</strong>
                                        <p className="text-sm text-gray-500">Selected Chain</p>
                                    </div>
                                    <div>
                                        <img
                                            src="src/assets/validator.png"
                                            alt="validators"
                                            className="mx-auto w-12 h-12 mb-2"
                                        />
                                        <strong className="text-lg">{chainData.validator_num}</strong>
                                        <p className="text-sm text-gray-500">Number of Validator</p>
                                    </div>
                                    <div>
                                        <img
                                            src="src/assets/proposal.png"
                                            alt="proposals"
                                            className="mx-auto w-12 h-12 mb-2"
                                        />
                                        <strong className="text-lg">{chainData.proposal_num}</strong>
                                        <p className="text-sm text-gray-500">Number of Proposal</p>
                                    </div>
                                </div>

                                {/* 하단 3개 */}
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="flex justify-center mb-2">
                                            {chainData.similar_chains.map((chain, index) => (
                                                <img
                                                    key={index}
                                                    src={`src/assets/${chain}.png`}
                                                    alt={`similar-chain-${chain}`}
                                                    className="w-12 h-12 mr-2"
                                                />
                                            ))}
                                        </div>
                                        <strong className="text-lg">{chainData.similar_chains.join(', ')}</strong>
                                        <p className="text-sm text-gray-500">Similar Chain</p>
                                    </div>
                                    <div>
                                        <img
                                            src="src/assets/cluster.png"
                                            alt="clusters"
                                            className="mx-auto w-12 h-12 mb-2"
                                        />
                                        <strong className="text-lg">{chainData.cluster_num}</strong>
                                        <p className="text-sm text-gray-500">Number of Cluster</p>
                                    </div>
                                    <div>
                                        <img
                                            src="src/assets/tolerance.png"
                                            alt="tolerance"
                                            className="mx-auto w-12 h-12 mb-2"
                                        />
                                        <strong className="text-lg">{chainData.radius}</strong>
                                        <p className="text-sm text-gray-500">Tolerance of Opinions</p>
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
                            <SunburstChart data={sunburstData} parallelData={parallelData} />
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
    );
};

export default Home;
