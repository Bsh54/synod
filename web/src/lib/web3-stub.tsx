'use client';

// Inert web3 stubs — crypto/wallet layer removed for synod.
// No wallet connection, no on-chain payments. These keep the UI compiling
// while the real coordination moves to the Mozaik agent runtime.

export function useAppKit() {
	return {open: () => {}};
}

export function useAppKitAccount() {
	return {address: undefined as string | undefined, isConnected: false};
}

export function useAppKitNetwork() {
	return {chainId: undefined as number | undefined};
}

export function useWriteContract() {
	return {
		writeContractAsync: async () => '0x' as `0x${string}`,
		data: undefined as `0x${string}` | undefined,
		error: undefined as Error | undefined,
		isPending: false,
	};
}

export function useWaitForTransactionReceipt(_args?: {hash?: unknown}) {
	return {isLoading: false, isSuccess: false};
}

// Inert placeholders replacing the former on-chain payment constants.
export const USDC_ADDRESSES: {[chainId: number]: string} = {};
export const ERC20_ABI = [] as const;
