import { create } from 'zustand';
import chainData from '../data/chain_data.json';

// 헬퍼 함수들
const findChainMetadata = (chain) => {
    const metadata = chainData.find((item) => item.chain === chain);
    if (!metadata) return null;

    return {
        radius: metadata.radius,
        validator_num: metadata.validator_num,
        proposal_num: metadata.proposal_num,
        cluster_num: metadata.cluster_num,
        similar_chains: metadata.similar_chains,
        validators: metadata.validators,
    };
};

const findCommonChains = (validators) => {
    return chainData
        .filter((chain) => validators.every((validator) => chain.validators?.includes(validator)))
        .map((chain) => chain.chain);
};

const findValidatorChains = (validators) => {
    return chainData
        .filter((chain) => validators.some((validator) => chain.validators?.includes(validator)))
        .map((chain) => chain.chain);
};

// 새로운 헬퍼 함수: 체인이 선택된 검증인들을 모두 포함하는지 확인
const chainContainsAllValidators = (chain, validators) => {
    const chainData = findChainMetadata(chain);
    return validators.every((validator) => chainData?.validators?.includes(validator));
};

export const useChainStore = create((set, get) => ({
    // 초기 상태
    selectedChain: null,
    chainData: null,
    selectedValidators: [],
    highlightedChains: [],
    highlightedValidators: [],
    baseValidator: null,
    validatorChains: [],

    // 액션들
    setSelectedChain: (chain) => {
        if (!chain) {
            set({
                selectedChain: null,
                chainData: null,
                validatorChains: [],
            });
            return;
        }

        const currentValidators = get().selectedValidators;
        const metadata = findChainMetadata(chain);

        // 새로운 체인에 현재 선택된 검증인들이 모두 포함되어 있는지 확인
        const containsAllValidators = chainContainsAllValidators(chain, currentValidators);

        set({
            selectedChain: chain,
            chainData: metadata,
            validatorChains: metadata?.validators || [],
            // 검증인 포함 여부에 따라 선택 상태 유지 또는 초기화
            ...(containsAllValidators
                ? {}
                : {
                      selectedValidators: [],
                      highlightedValidators: [],
                      baseValidator: null,
                      highlightedChains: [],
                  }),
        });
    },

    setSelectedValidators: (validators) => {
        const commonChains = findCommonChains(validators);
        const validatorChains = findValidatorChains(validators);

        set({
            selectedValidators: validators,
            highlightedChains: commonChains,
            validatorChains,
        });
    },

    setBaseValidator: (validator) => set({ baseValidator: validator }),

    setHighlightedChains: (chains) => set({ highlightedChains: chains }),

    setHighlightedValidators: (validators) => set({ highlightedValidators: validators }),

    resetValidatorSelection: () =>
        set({
            selectedValidators: [],
            highlightedChains: [],
            highlightedValidators: [],
            validatorChains: [],
            baseValidator: null,
        }),
}));

export default useChainStore;
