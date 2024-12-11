import { useEffect, useState } from 'react';
import useChainStore from '../store/store';

const ValidatorTable = () => {
    const { selectedChain, selectedValidators, baseValidator, setBaseValidator } = useChainStore();
    const [validatorData, setValidatorData] = useState([]);

    useEffect(() => {
        if (!selectedChain || !baseValidator || selectedValidators.length <= 1) return;

        fetch(`/data/validator_result/validator_result_${selectedChain}.json`)
            .then((response) => response.json())
            .then((data) => {
                // 기준 검증인의 데이터를 찾음
                const baseValidatorData = data.find((item) => item.voter === baseValidator);
                if (!baseValidatorData) return;

                // 선택된 다른 검증인들의 데이터 수집
                const validatorsInfo = selectedValidators
                    .filter((validator) => validator !== baseValidator)
                    .map((validator) => {
                        // 해당 검증인의 클러스터 정보 찾기
                        const validatorInfo = data.find((item) => item.voter === validator);
                        // cluster_label 사용
                        const clusterLabel = validatorInfo ? validatorInfo.cluster_label : 'N/A';

                        return {
                            validator,
                            matchRate: baseValidatorData[validator] || 0,
                            cluster: clusterLabel,
                        };
                    });

                // 기준 검증인의 cluster_label도 찾기
                setValidatorData([
                    { validator: baseValidator, matchRate: 1, cluster: baseValidatorData.cluster_label },
                    ...validatorsInfo,
                ]);
            })
            .catch((error) => console.error('Error loading validator results:', error));
    }, [selectedChain, selectedValidators, baseValidator]);
    const handleValidatorClick = (clickedValidator) => {
        if (clickedValidator === baseValidator) return;
        setBaseValidator(clickedValidator);
    };

    if (!baseValidator || selectedValidators.length <= 1) return null;

    return (
        <div className="w-full h-[28%] p-4">
            <h3 className="pl-3 pt-2">Validator Results</h3>
            <div className="overflow-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="px-4 py-2">No.</th>
                            <th className="px-4 py-2">검증인</th>
                            <th className="px-4 py-2">일치율(%)</th>
                            <th className="px-4 py-2">Cluster</th>
                        </tr>
                    </thead>
                    <tbody>
                        {validatorData.map((data, index) => (
                            <tr
                                key={data.validator}
                                className={`border-b ${
                                    index === 0 ? 'bg-gray-50' : 'hover:bg-gray-100 cursor-pointer'
                                }`}
                                onClick={() => index !== 0 && handleValidatorClick(data.validator)}
                            >
                                <td className="px-4 py-2">{index + 1}</td>
                                <td className="px-4 py-2">
                                    {index === 0 ? (
                                        <span className="font-medium">{data.validator}</span>
                                    ) : (
                                        data.validator
                                    )}
                                </td>
                                <td className="px-4 py-2">{index === 0 ? '-' : (data.matchRate * 100).toFixed(2)}</td>
                                <td className="px-4 py-2">{data.cluster}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default ValidatorTable;
