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

    getChainOpacity: (chainId) => {
        const state = get();
        const { selectedChain, selectedValidators } = state;

        if (!selectedChain) return 1;

        if (chainId === selectedChain) return 1;

        // 선택된 검증인이 없을 때
        if (selectedValidators.length === 0) {
            if (chainId === selectedChain) return 1;

            // shared_validator에 따른 투명도 계산
            const linkData = linkDataJson.find(
                (link) =>
                    (link.chain1 === selectedChain && link.chain2 === chainId) ||
                    (link.chain2 === selectedChain && link.chain1 === chainId)
            );

            if (!linkData) return 0.3;

            // shared_validator 값을 0.2~0.8 범위로 정규화
            const minValidators = d3.min(linkDataJson, (d) => d.shared_validators);
            const maxValidators = d3.max(linkDataJson, (d) => d.shared_validators);

            return 0.3 + ((linkData.shared_validators - minValidators) / (maxValidators - minValidators)) * 0.7;
        }

        // 선택된 검증인이 있을 때
        const chainData = findChainMetadata(chainId);
        if (!chainData || !chainData.validators) return 0.2;

        // 해당 체인이 모든 선택된 검증인을 포함하는지 확인

        const containsAllValidators = selectedValidators.every((validator) => chainData.validators.includes(validator));

        // 모든 선택된 검증인을 포함하면 0.8, 그렇지 않으면 0.2
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

        // 새로운 체인에 현재 선택된 검증인들이 모두 포함되어 있는지 확인
        const containsAllValidators = chainContainsAllValidators(chain, currentValidators);
        if (get().selectedChain === chain) {
            set({
                selectedChain: null,
                chainData: null,
                validatorChains: [],
                selectedValidators: [], // scatter plot 초기화
                baseValidator: null, // scatter plot 초기화
                highlightedChains: [], // 선택 해제시 하이라이트된 체인들도 초기화
            });
            return;
        }

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
