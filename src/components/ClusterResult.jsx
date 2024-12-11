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
        if (!selectedChain || !baseValidator) return;

        // 기준 검증인의 클러스터 정보 가져오기
        fetch(`/data/validator_result/validator_result_${selectedChain}.json`)
            .then((response) => response.json())
            .then((data) => {
                const baseValidatorData = data.find((item) => item.voter === baseValidator);
                if (!baseValidatorData) return;

                // 클러스터 관계 데이터 가져오기
                fetch('/data/cluster_relationships.json') // 파일명 수정
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

    if (!clusterInfo.cluster) return null;

    return (
        <div className="w-full h-full p-4">
            <h3 className="pl-3 pt-2">Cluster Results</h3>
            <div className="ml-4">
                <p className="mb-2">Cluster {clusterInfo.cluster}</p>
                <div>
                    <p className="text-sm flex text-gray-600 mb-1">
                        우호적 클러스터:{' '}
                        <p className="ml-2 text-green-600">
                            {clusterInfo.friendly.length > 0 ? clusterInfo.friendly.join(', ') : '없음'}
                        </p>
                    </p>
                </div>
                <div className="mt-2">
                    <p className="text-sm flex text-gray-600 mb-1">
                        적대적 클러스터:{' '}
                        <p className="ml-2 text-red-600">
                            {clusterInfo.opposition.length > 0 ? clusterInfo.opposition.join(', ') : '없음'}
                        </p>
                    </p>
                </div>
            </div>
        </div>
    );
};
export default ClusterResult;
