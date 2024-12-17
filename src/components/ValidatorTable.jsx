import { useEffect, useState } from 'react';
import useChainStore from '../store/store';

const ValidatorTable = () => {
    const { selectedChain, selectedValidators, baseValidator, setBaseValidator } = useChainStore();
    const [validatorData, setValidatorData] = useState([]);
    const [sortConfig, setSortConfig] = useState({
        key: 'matchRate',
        direction: 'desc',
    });

    useEffect(() => {
        if (!selectedChain || !selectedValidators.length) {
            setValidatorData([]);
            return;
        }

        fetch(`/data/validator_result/validator_result_${selectedChain}.json`)
            .then((response) => response.json())
            .then((data) => {
                if (selectedValidators.length === 1) {
                    const singleValidator = selectedValidators[0];
                    const validatorInfo = data.find((item) => item.voter === singleValidator);

                    if (validatorInfo) {
                        setValidatorData([
                            {
                                validator: singleValidator,
                                matchRate: 1,
                                cluster: validatorInfo.cluster_label,
                                overallMatchRate: validatorInfo.overall_match_rate || 0,
                                clusterMatchRate: validatorInfo.cluster_match_rate || 0,
                                participationRate: validatorInfo.participation_rate || 0,
                            },
                        ]);
                    }
                    return;
                }

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

    const sortValidatorData = (data, key, direction) => {
        return [...data].sort((a, b) => {
            let comparison = 0;
            
            if (key === 'cluster') {
                const aMatch = String(a[key] || '').match(/\d+/);
                const bMatch = String(b[key] || '').match(/\d+/);
                const aNumber = aMatch ? parseInt(aMatch[0]) : -1;
                const bNumber = bMatch ? parseInt(bMatch[0]) : -1;
                comparison = aNumber - bNumber;
            } else if (key === 'validator') {
                const aValue = String(a[key] || '').toLowerCase();
                const bValue = String(b[key] || '').toLowerCase();
                comparison = aValue.localeCompare(bValue);
            } else {
                comparison = (a[key] || 0) - (b[key] || 0);
            }

            return direction === 'asc' ? comparison : -comparison;
        });
    };

    const handleSort = (key) => {
        const newDirection = 
            sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'desc' : 'asc') : 'desc';
        
        setSortConfig({ key, direction: newDirection });
        setValidatorData(prevData => {
            const [first, ...rest] = prevData;
            const sortedRest = sortValidatorData(rest, key, newDirection);
            return [first, ...sortedRest];
        });
    };

    const columns = [
        { key: 'validator', label: 'Validator Name' },
        { key: 'matchRate', label: 'Match Rate(%)' },
        { key: 'cluster', label: 'Cluster' },
        { key: 'overallMatchRate', label: 'Overall Match Rate' },
        { key: 'clusterMatchRate', label: 'Cluster Match Rate' },
        { key: 'participationRate', label: 'Participation Rate' },
    ];

    return (
        <div className="border">
            <h3 className="pl-3">Validator Results</h3>
            
            <div className="pl-3 relative">
                <div style={{ maxHeight: 'calc(2.5rem * 4)' }} className="overflow-auto">
                    <table className="w-full" style={{ minWidth: '800px', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b text-xs">
                                <th className="p-1 font-medium border-r whitespace-nowrap">No.</th>
                                {columns.map((column) => (
                                    <th
                                        key={column.key}
                                        className="p-2 font-medium whitespace-nowrap cursor-pointer hover:bg-gray-100 text-center"
                                        onClick={() => handleSort(column.key)}
                                    >
                                        {column.label} {sortConfig.key === column.key ? 
                                            (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {validatorData.length > 0 && (
                                <tr className="sticky top-8 bg-gray-50 z-10">
                                    <td className="p-2 border-b">1</td>
                                    <td className="p-2 border-b font-medium">{validatorData[0].validator}</td>
                                    <td className="p-2 border-b text-center">{(validatorData[0].matchRate * 100).toFixed(2)}</td>
                                    <td className="p-2 border-b text-center">{validatorData[0].cluster}</td>
                                    <td className="p-2 border-b text-center">{(validatorData[0].overallMatchRate * 100).toFixed(2)}</td>
                                    <td className="p-2 border-b text-center">{(validatorData[0].clusterMatchRate * 100).toFixed(2)}</td>
                                    <td className="p-2 border-b text-center">{(validatorData[0].participationRate * 100).toFixed(2)}</td>
                                </tr>
                            )}
                            {validatorData.slice(1).map((data, index) => (
                                <tr 
                                    key={data.validator}
                                    className="border-b hover:bg-blue-200 cursor-pointer"
                                    onClick={() => setBaseValidator(data.validator)}
                                >
                                    <td className="p-2">{index + 2}</td>
                                    <td className="p-2">{data.validator}</td>
                                    <td className="p-2 text-center">{(data.matchRate * 100).toFixed(2)}</td>
                                    <td className="p-2 text-center">{data.cluster}</td>
                                    <td className="p-2 text-center">{(data.overallMatchRate * 100).toFixed(2)}</td>
                                    <td className="p-2 text-center">{(data.clusterMatchRate * 100).toFixed(2)}</td>
                                    <td className="p-2 text-center">{(data.participationRate * 100).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ValidatorTable;