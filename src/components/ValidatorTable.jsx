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
                        };
                    });

                setValidatorData([
                    { validator: baseValidator, matchRate: 1, cluster: baseValidatorData.cluster_label },
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
        setIsDescending(!isDescending); // 정렬 방향 토글
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
        <div className="w-full h-[28%] ">
            <h3 className="pl-3">Validator Results</h3>
            <div>
                {!baseValidator || selectedValidators.length < 0 ? (
                    <p className="text-sm text-gray-500 ml-4">선택된 검증인이 없습니다.</p>
                ) : (
                    <table className="min-w-full border-4">
                        <thead>
                            <tr className="border-b">
                                <th className="p-1 border-r-2">No.</th>
                                <th className="p-1 border-r-2">검증인</th>
                                <th className="p-1 border-r-2 cursor-pointer" onClick={handleSortClick}>
                                    일치율(%) {isDescending ? '▼' : '▲'}
                                </th>
                                <th className="p-1">Cluster</th>
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
                                    <td className="px-4 py-2 border-r-2">{index + 1}</td>
                                    <td className="px-4 py-2 border-r-2">
                                        {index === 0 ? (
                                            <span className="font-medium">{data.validator}</span>
                                        ) : (
                                            data.validator
                                        )}
                                    </td>
                                    <td className="px-4 py-2 border-r-2">{(data.matchRate * 100).toFixed(2)}</td>
                                    <td className="px-4 py-2">{data.cluster}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
export default ValidatorTable;
