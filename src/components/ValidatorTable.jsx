import { useEffect, useState } from 'react';
import useChainStore from '../store/store';

const ValidatorTable = () => {
    const { selectedChain, selectedValidators, baseValidator, setBaseValidator } = useChainStore();
    const [validatorData, setValidatorData] = useState([]);
    const [isDescending, setIsDescending] = useState(true);

    useEffect(() => {
        // 선택된 검증인이 없거나 1명만 있을 때는 데이터 초기화
        if (!selectedChain || !baseValidator || selectedValidators.length <= 1) {
            setValidatorData([]);
            return;
        }

        // 이전 데이터 초기화 (새로운 데이터 로딩 전에 비우기)
        setValidatorData([]);

        fetch(`/data/validator_result/validator_result_${selectedChain}.json`)
            .then((response) => response.json())
            .then((data) => {
                // baseValidator가 변경되었거나 selectedValidators가 변경된 경우를 확인
                if (!selectedValidators.includes(baseValidator) || selectedValidators.length <= 1) {
                    setValidatorData([]);
                    return;
                }

                const baseValidatorData = data.find((item) => item.voter === baseValidator);
                if (!baseValidatorData) {
                    setValidatorData([]);
                    return;
                }

                const validatorsInfo = selectedValidators
                    .filter((validator) => validator !== baseValidator)
                    .map((validator) => {
                        const validatorInfo = data.find((item) => item.voter === validator);
                        const clusterLabel = validatorInfo ? validatorInfo.cluster_label : 'N/A';

                        return {
                            validator,
                            matchRate: baseValidatorData[validator] || 0,
                            cluster: clusterLabel,
                            overallMatchRate: validatorInfo?.overall_match_rate || 0,
                            clusterMatchRate: validatorInfo?.cluster_match_rate || 0,
                            participationRate: validatorInfo?.participation_rate || 0,
                        };
                    });

                setValidatorData([
                    {
                        validator: baseValidator,
                        matchRate: 1,
                        cluster: baseValidatorData.cluster_label,
                        overallMatchRate: baseValidatorData.overall_match_rate || 0,
                        clusterMatchRate: baseValidatorData.cluster_match_rate || 0,
                        participationRate: baseValidatorData.participation_rate || 0,
                    },
                    ...validatorsInfo,
                ]);
            })
            .catch((error) => {
                console.error('Error loading validator results:', error);
                setValidatorData([]);
            });
    }, [selectedChain, selectedValidators, baseValidator]);

    const handleValidatorClick = (clickedValidator) => {
        if (clickedValidator === baseValidator) return;
        setBaseValidator(clickedValidator);
    };

    const handleSortClick = () => {
        setIsDescending(!isDescending);
        setValidatorData((prevData) => {
            if (prevData.length <= 1) return prevData;
            const [first, ...rest] = prevData;
            const sortedData = rest.sort((a, b) => {
                return isDescending ? b.matchRate - a.matchRate : a.matchRate - b.matchRate;
            });
            return [first, ...sortedData];
        });
    };

    return (
        <div className="border rounded-lg">
            <h3 className="pl-3">Validator Results</h3>
            <div style={{ maxHeight: 'calc((2.5rem * 3) + 2.5rem)' }} className="relative overflow-auto">
                <table className="w-full" style={{ minWidth: '800px' }}>
                    <thead className="sticky top-0 bg-white border-b text-xs text-center">
                        <tr>
                            <th className="p-1 font-medium border-r whitespace-nowrap">No.</th>
                            <th className="p-0 font-medium border-r whitespace-nowrap">Validator Name</th>
                            <th
                                className="p-0 font-medium border-r whitespace-nowrap cursor-pointer"
                                onClick={handleSortClick}
                            >
                                Match Rate(%) {isDescending ? '▼' : '▲'}
                            </th>
                            <th className="p-0 font-medium border-r whitespace-nowrap">Cluster</th>
                            <th className="p-0 font-medium border-r whitespace-nowrap">Overall Match Rate</th>
                            <th className="p-0 font-medium border-r whitespace-nowrap">Cluster Match Rate</th>
                            <th className="p-0 font-medium whitespace-nowrap">Participation</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs text-left">
                        {validatorData.map((data, index) => (
                            <tr
                                key={data.validator}
                                className={`border-b last:border-b-0 ${
                                    index === 0 ? 'bg-gray-50' : 'hover:bg-blue-200 cursor-pointer'
                                }`}
                                onClick={() => index !== 0 && handleValidatorClick(data.validator)}
                            >
                                <td className="p-2 border-r">{index + 1}</td>
                                <td className="p-2 border-r">
                                    {index === 0 ? (
                                        <span className="font-medium">{data.validator}</span>
                                    ) : (
                                        data.validator
                                    )}
                                </td>
                                <td className="p-2 border-r">{(data.matchRate * 100).toFixed(2)}</td>
                                <td className="p-2 border-r">{data.cluster}</td>
                                <td className="p-2 border-r">{(data.overallMatchRate * 100).toFixed(2)}</td>
                                <td className="p-2 border-r">{(data.clusterMatchRate * 100).toFixed(2)}</td>
                                <td className="p-2">{(data.participationRate * 100).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ValidatorTable;