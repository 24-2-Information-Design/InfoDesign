import { useEffect, useState } from 'react';
import useChainStore from '../store/store';

const ValidatorTable = () => {
    const { selectedChain, selectedValidators, baseValidator, setBaseValidator } = useChainStore();
    const [validatorData, setValidatorData] = useState([]);
    const [sortConfig, setSortConfig] = useState({
        key: 'matchRate',
        direction: 'desc'
    });

    useEffect(() => {
        // 체인이나 검증인이 선택되지 않은 경우만 체크
        if (!selectedChain || !selectedValidators.length) {
            setValidatorData([]);
            return;
        }

        setValidatorData([]);

        fetch(`/data/validator_result/validator_result_${selectedChain}.json`)
            .then((response) => response.json())
            .then((data) => {
                // 검증인이 한 명일 경우 해당 검증인의 정보만 표시
                if (selectedValidators.length === 1) {
                    const singleValidator = selectedValidators[0];
                    const validatorInfo = data.find((item) => item.voter === singleValidator);
                    
                    if (validatorInfo) {
                        setValidatorData([{
                            validator: singleValidator,
                            matchRate: 1,
                            cluster: validatorInfo.cluster_label,
                            overallMatchRate: validatorInfo.overall_match_rate || 0,
                            clusterMatchRate: validatorInfo.cluster_match_rate || 0,
                            participationRate: validatorInfo.participation_rate || 0,
                        }]);
                    }
                    return;
                }

                // baseValidator가 선택되지 않은 경우 첫 번째 검증인을 baseValidator로 사용
                const currentBaseValidator = baseValidator || selectedValidators[0];
                const baseValidatorData = data.find((item) => item.voter === currentBaseValidator);
                
                if (!baseValidatorData) {
                    setValidatorData([]);
                    return;
                }

                const validatorsInfo = selectedValidators
                    .filter((validator) => validator !== currentBaseValidator)
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

                const initialData = [
                    {
                        validator: currentBaseValidator,
                        matchRate: 1,
                        cluster: baseValidatorData.cluster_label,
                        overallMatchRate: baseValidatorData.overall_match_rate || 0,
                        clusterMatchRate: baseValidatorData.cluster_match_rate || 0,
                        participationRate: baseValidatorData.participation_rate || 0,
                    },
                    ...validatorsInfo,
                ];

                setValidatorData(initialData);
            })
            .catch((error) => {
                console.error('Error loading validator results:', error);
                setValidatorData([]);
            });
    }, [selectedChain, selectedValidators, baseValidator]);

    const handleValidatorClick = (clickedValidator) => {
        if (clickedValidator === baseValidator || selectedValidators.length <= 1) return;
        setBaseValidator(clickedValidator);
    };

    const getClusterNumber = (clusterString) => {
        const match = clusterString.match(/\d+/);
        return match ? parseInt(match[0]) : -1;
    };

    const sortData = (data, key, direction) => {
        if (data.length <= 1) return data;
        const [first, ...rest] = data;
        
        const sortedData = [...rest].sort((a, b) => {
            let comparison = 0;
            
            if (key === 'cluster') {
                const aNumber = getClusterNumber(String(a[key] || ''));
                const bNumber = getClusterNumber(String(b[key] || ''));
                comparison = aNumber - bNumber;
            }
            else if (key === 'validator') {
                const aValue = String(a[key] || '').toLowerCase();
                const bValue = String(b[key] || '').toLowerCase();
                comparison = aValue.localeCompare(bValue);
            }
            else {
                comparison = (a[key] || 0) - (b[key] || 0);
            }
            
            return direction === 'asc' ? comparison : -comparison;
        });

        return [first, ...sortedData];
    };

    const handleSort = (key) => {
        const newDirection = 
            sortConfig.key === key
            ? sortConfig.direction === 'asc' ? 'desc' : 'asc'
            : 'desc';
        
        setSortConfig({ key, direction: newDirection });
        setValidatorData(prevData => sortData(prevData, key, newDirection));
    };

    const getSortIndicator = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return '↕';
        }
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    };

    const columns = [
        { key: 'validator', label: 'Validator Name' },
        { key: 'matchRate', label: 'Match Rate(%)' },
        { key: 'cluster', label: 'Cluster' },
        { key: 'overallMatchRate', label: 'Overall Match Rate' },
        { key: 'clusterMatchRate', label: 'Cluster Match Rate' },
        { key: 'participationRate', label: 'Participation' }
    ];

    return (
        <div className="border rounded-lg">
            <h3 className="pl-3">Validator Results</h3>
            <div style={{ maxHeight: 'calc((2.5rem * 3) + 2.5rem)' }} className="relative overflow-auto">
                <table className="w-full" style={{ minWidth: '800px' }}>
                    <thead className="sticky top-0 bg-white border-b text-xs text-center">
                        <tr>
                            <th className="p-1 font-medium border-r whitespace-nowrap">No.</th>
                            {columns.map(column => (
                                <th
                                    key={column.key}
                                    className="p-2 font-medium border-r whitespace-nowrap cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort(column.key)}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {column.label} {getSortIndicator(column.key)}
                                    </div>
                                </th>
                            ))}
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
                                <td className="p-2 border-r text-center">{(data.matchRate * 100).toFixed(2)}</td>
                                <td className="p-2 border-r text-center">{data.cluster}</td>
                                <td className="p-2 border-r text-center">
                                    {(data.overallMatchRate * 100).toFixed(2)}
                                </td>
                                <td className="p-2 border-r text-center">
                                    {(data.clusterMatchRate * 100).toFixed(2)}
                                </td>
                                <td className="p-2 text-center">
                                    {(data.participationRate * 100).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ValidatorTable;