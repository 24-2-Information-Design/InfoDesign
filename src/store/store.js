import { create } from 'zustand';
import chainData from '../data/chain_data.json';

export const useChainStore = create((set, get) => ({
    // 기존 상태
    selectedChain: null,
    chainData: null,

    // 새로운 상태
    selectedValidators: [], // 선택된 검증인 배열
    highlightedChains: [], // 하이라이트된 체인 배열
    highlightedValidators: [], // Parallel Coordinates에서 하이라이트할 검증인 배열
    baseValidator: null,

    // 기존 액션
    setSelectedChain: (chain) => {
        const metadata = chainData.find((item) => item.chain === chain);

        set({
            selectedChain: chain,
            chainData: metadata
                ? {
                      radius: metadata.radius,
                      validator_num: metadata.validator_num,
                      proposal_num: metadata.proposal_num,
                      cluster_num: metadata.cluster_num,
                      similar_chains: metadata.similar_chains,
                  }
                : null,
        });
    },

    // 새로운 액션
    setSelectedValidators: (validators) => {
        set({ selectedValidators: validators });
        // 선택된 검증인들이 공통으로 속한 체인들을 하이라이트
        const commonChains = chainData
            .filter((chain) => validators.every((validator) => chain.validators?.includes(validator)))
            .map((chain) => chain.chain);
        set({ highlightedChains: commonChains });
    },
    setBaseValidator: (validator) => set({ baseValidator: validator }),

    // 하이라이트된 체인 설정
    setHighlightedChains: (chains) => {
        set({ highlightedChains: chains });
    },

    // 하이라이트된 검증인 설정 (Parallel Coordinates용)
    setHighlightedValidators: (validators) => {
        set({ highlightedValidators: validators });
    },

    // 검증인 선택 초기화
    resetValidatorSelection: () => {
        set({
            selectedValidators: [],
            highlightedChains: [],
            highlightedValidators: [],
        });
    },
}));

export default useChainStore;
