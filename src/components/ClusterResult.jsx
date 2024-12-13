import { useEffect, useState } from 'react';
import useChainStore from '../store/store';

const ClusterResult = () => {
    const { selectedChain, selectedValidators, baseValidator } = useChainStore();
    const [clusterInfo, setClusterInfo] = useState({
        cluster: null,
        friendly: [],
        opposition: [],
    });

    useEffect(() => {
        if (!selectedChain || !baseValidator) {
            setClusterInfo({ cluster: null, friendly: [], opposition: [] });
            return;
        }

        fetch(`/data/validator_result/validator_result_${selectedChain}.json`)
            .then((response) => response.json())
            .then((data) => {
                const baseValidatorData = data.find((item) => item.voter === baseValidator);
                if (!baseValidatorData) return;

                fetch('/data/cluster_relationships.json')
                    .then((response) => response.json())
                    .then((relationsData) => {
                        const clusterNum = baseValidatorData.cluster_label.toString();
                        const chainRelations = relationsData[selectedChain];

                        if (chainRelations && chainRelations[clusterNum]) {
                            setClusterInfo({
                                cluster: clusterNum,
                                friendly: chainRelations[clusterNum].friendly,
                                opposition: chainRelations[clusterNum].opposition,
                            });
                        }
                    });
            });
    }, [selectedChain, baseValidator]);

    return (
        <div className="w-full h-full font-medium">
            <h3 className="pl-3 ">Cluster Results</h3>
            <div className="ml-4">
                {clusterInfo.cluster ? (
                    <>
                        <p className="mb-2">Cluster {clusterInfo.cluster}</p>
                        <div>
                            <p className=" flex mb-1">
                                우호적 클러스터:{' '}
                                <p className="ml-2 text-green-600">
                                    {clusterInfo.friendly.length > 0 ? clusterInfo.friendly.join(', ') : '없음'}
                                </p>
                            </p>
                        </div>
                        <div className="mt-2">
                            <p className=" flex  mb-1">
                                적대적 클러스터:{' '}
                                <p className="ml-2 text-red-600">
                                    {clusterInfo.opposition.length > 0 ? clusterInfo.opposition.join(', ') : '없음'}
                                </p>
                            </p>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-gray-500">선택된 검증인이 없습니다.</p>
                )}
            </div>
        </div>
    );
};

export default ClusterResult;
