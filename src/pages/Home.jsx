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
        <div className="flex flex-col w-full h-full">
            {/* header */}
            <div className="w-full h-10">
                <h1 className="ml-4 mt-3">Find Your Friends</h1>
            </div>
            
            {/* body */}
            <div className="w-full h-full flex flex-row">
                
                {/* left section */}
                <div className="w-2/5 h-full m-1 ml-3 shadow-xl rounded-lg border-slate-100 border-[0.3px]">
                    <h2 className="pl-3 pt-2">Overall Chain View</h2>
                    {/* chain network */}
                    <div className="w-full h-[69%]">
                        <NetworkPie onSelectChain={setSelectedChain} />
                    </div>

                    <div className="w-[94%] ml-4 mt-1 mb-1 flex border-t border-gray-200"></div>
                    
                    {/* chain result */}
                    <div className="w-full h-[30%]">
                    <h3 className="pl-3 pt-2">Chain Results</h3>

                    </div>
                </div>

                {/* right section */}
                <div className="w-3/5 h-full m-1 mr-3 shadow-xl rounded-md border-slate-100 border-[0.3px]">
                    <h2 className="pl-3 pt-2">Specific Validator View</h2>

                    {/* validator & proposal view */}
                    <div className="w-full h-[42%] flex flex-row">

                        {/* scatter plot */}
                        <div className="w-1/2 h-full">
                            <h3 className="pl-3">Validator Votes Similarity</h3>
                            {scatterData ? (
                                <ScatterPlot data={scatterData} />
                            ) : (
                                selectedChain && <p>Loading scatter plot for {selectedChain}...</p>
                            )}
                        </div>

                        {/* circular dendrogram */}
                        <div className="w-1/2 h-full">
                            <h3 className="pl-3">Proposal Match</h3>

                        </div>
                    </div>

                    <div className="w-[95%] ml-5 mt-1 mb-1 flex border-t border-gray-200"></div>

                    {/* parallel view */}
                    <div className="w-full h-[26%]">
                        <h3 className="pl-3 pt-2">Votes Tendency</h3>
                        {parallelData ? <Parallel data={parallelData} /> : selectedChain && <p>Loading... </p>}
                    </div>

                    <div className="w-[95%] ml-5 mt-2 mb-1 flex border-t border-gray-200"></div>
                    
                    {/* result view */}
                    <div className="w-full h-[28%] flex flex-row">
                        {/* validator results */}
                        <div className="w-1/2 h-full">
                            <h3 className="pl-3 pt-2">Validator Results</h3>

                        </div>

                        <div className="h-[75%] mt-1 mb-1 border-l border-gray-200"></div>
                        
                        {/* cluster results */}
                        <div className="w-1/2 h-full">
                            <h3 className="pl-3 pt-2">Cluster Results</h3>
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
