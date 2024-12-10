import { create } from 'zustand';
import chainData from '../data/chain_data.json';

export const useChainStore = create((set) => ({
    selectedChainselectedChain: null,
    chainData: null,
    setSelectedChain: (chain) => {
        // Find the metadata for the selected chain
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
}));

export default useChainStore;
