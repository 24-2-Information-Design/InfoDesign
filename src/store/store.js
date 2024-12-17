import { create } from 'zustand';
import chainData from '../data/chain_data.json';
import * as d3 from 'd3';
import linkDataJson from '../data/chain_link_data.json';

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
    singleSelectMode: false, // 추가된 상태

    getChainOpacity: (chainId) => {
        const state = get();
        const { selectedChain, selectedValidators } = state;

        if (!selectedChain) return 1;
        if (chainId === selectedChain) return 1;

        if (selectedValidators.length === 0) {
            const linkData = linkDataJson.find(
                (link) =>
                    (link.chain1 === selectedChain && link.chain2 === chainId) ||
                    (link.chain2 === selectedChain && link.chain1 === chainId)
            );

            if (!linkData) return 0.3;

            const minValidators = d3.min(linkDataJson, (d) => d.shared_validators);
            const maxValidators = d3.max(linkDataJson, (d) => d.shared_validators);

            return 0.3 + ((linkData.shared_validators - minValidators) / (maxValidators - minValidators)) * 0.7;
        }

        const chainData = findChainMetadata(chainId);
        if (!chainData || !chainData.validators) return 0.2;

        const containsAllValidators = selectedValidators.every((validator) => chainData.validators.includes(validator));
        return containsAllValidators ? 0.7 : 0.2;
    },

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
        const containsAllValidators = chainContainsAllValidators(chain, currentValidators);

        if (get().selectedChain === chain) {
            set({
                selectedChain: null,
                chainData: null,
                validatorChains: [],
                selectedValidators: [],
                baseValidator: null,
                highlightedChains: [],
                singleSelectMode: false, // 체인 선택 해제시 단일 선택 모드도 초기화
            });
            return;
        }

        set({
            selectedChain: chain,
            chainData: metadata,
            validatorChains: metadata?.validators || [],
            ...(containsAllValidators
                ? {}
                : {
                      selectedValidators: [],
                      highlightedValidators: [],
                      baseValidator: null,
                      highlightedChains: [],
                      singleSelectMode: false, // 새로운 체인 선택시 단일 선택 모드 초기화
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

    setSingleSelectMode: (mode) => {
        const currentValidators = get().selectedValidators;
        set({ 
            singleSelectMode: mode,
            // 단일 선택 모드로 전환시 첫 번째 검증인만 유지
            ...(mode && currentValidators.length > 0 
                ? {
                    selectedValidators: [currentValidators[0]],
                    baseValidator: currentValidators[0]
                  }
                : {}
            )
        });
    },

    resetValidatorSelection: () =>
        set({
            selectedValidators: [],
            highlightedChains: [],
            highlightedValidators: [],
            validatorChains: [],
            baseValidator: null,
            singleSelectMode: false, // 선택 초기화시 단일 선택 모드도 초기화
        }),
}));

export default useChainStore;