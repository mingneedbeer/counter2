import { useState, useEffect } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther } from "viem";
import { toAccount } from "viem/accounts";
import { abstractTestnet, abstract } from "viem/chains";
import { createAbstractClient, getSmartAccountAddressFromInitialSigner, deployAccount } from "@abstract-foundation/agw-client";
import type { Address, Hex } from "viem";

const checkIsDeployed = (publicClient: ReturnType<typeof createPublicClient>, address: Address) =>
  publicClient.getCode({ address }).then((code) => code !== "0x" && code !== undefined);

type WalletState = {
  eoa: `0x${string}`;
  aaAddress: `0x${string}`;
  eoaBalance: string;
  aaBalance: string;
  isDeployed: boolean;
  chainId: number;
};

export default function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(false);
  const [chain, setChain] = useState<"abstract_testnet" | "abstract">("abstract_testnet");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const targetChain = chain === "abstract" ? abstract : abstractTestnet;

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const getPublicClient = () =>
    createPublicClient({ chain: targetChain, transport: http() });

  const connect = async () => {
    if (!window.ethereum) {
      showToast("error", "No wallet found. Install MetaMask or Rabby.");
      return;
    }
    setLoading(true);
    try {
      const [eoa] = await window.ethereum.request({ method: "eth_requestAccounts" }) as [`0x${string}`];
      const targetChainId = chain === "abstract" ? "0xab5" : "0x2b74"; // 2741, 11124
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetChainId }] });
      } catch {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: targetChainId, chainName: targetChain.name, rpcUrls: targetChain.rpcUrls.default.http, nativeCurrency: targetChain.nativeCurrency }] });
      }

      const publicClient = getPublicClient();
      const aaAddress = await getSmartAccountAddressFromInitialSigner(eoa, publicClient);
      const [eoaBalance, aaBalance, isDeployed] = await Promise.all([
        publicClient.getBalance({ address: eoa }),
        publicClient.getBalance({ address: aaAddress }),
        checkIsDeployed(publicClient, aaAddress),
      ]);
      const chainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
      setWallet({ eoa, aaAddress, eoaBalance: formatEther(eoaBalance), aaBalance: formatEther(aaBalance), isDeployed, chainId: parseInt(chainId) });
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setWallet(null);
    setTxHash(null);
  };

  const switchChain = async (c: "abstract_testnet" | "abstract") => {
    setChain(c);
    if (!wallet) return;
    const target = c === "abstract" ? abstract : abstractTestnet;
    const targetChainId = c === "abstract" ? "0xab5" : "0x2b74";
    try {
      await window.ethereum!.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetChainId }] });
    } catch {
      await window.ethereum!.request({ method: "wallet_addEthereumChain", params: [{ chainId: targetChainId, chainName: target.name, rpcUrls: target.rpcUrls.default.http, nativeCurrency: target.nativeCurrency }] });
    }
    const publicClient = createPublicClient({ chain: target, transport: http() });
    const aaAddress = await getSmartAccountAddressFromInitialSigner(wallet.eoa, publicClient);
    const [eoaBalance, aaBalance, isDeployed] = await Promise.all([
      publicClient.getBalance({ address: wallet.eoa }),
      publicClient.getBalance({ address: aaAddress }),
      checkIsDeployed(publicClient, aaAddress),
    ]);
    setWallet({ ...wallet, aaAddress, eoaBalance: formatEther(eoaBalance), aaBalance: formatEther(aaBalance), isDeployed });
  };

  const deploy = async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const walletClient = createWalletClient({ chain: targetChain, transport: custom(window.ethereum!) });
      const publicClient = getPublicClient();
      const signer = toAccount({
        address: wallet.eoa,
        async signMessage({ message }) {
          return walletClient.signMessage({ account: wallet.eoa, message }) as Promise<`0x${string}`>;
        },
        async signTypedData(typedData) {
          const { domain, types, message, primaryType } = typedData as any;
          return walletClient.signTypedData({ account: wallet.eoa, domain, types, message, primaryType }) as Promise<`0x${string}`>;
        },
      });
      const result = await deployAccount({ walletClient, publicClient, initialSignerAddress: wallet.eoa });
      showToast("success", `Account deployed! Tx: ${result.deploymentTransaction?.slice(0, 20)}...`);
      setWallet({ ...wallet, isDeployed: true });
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Deploy failed");
    } finally {
      setLoading(false);
    }
  };

  const sendDemoTx = async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const walletClient = createWalletClient({ chain: targetChain, transport: custom(window.ethereum!) });
      const signer = toAccount({
        address: wallet.eoa,
        async signMessage({ message }) {
          return walletClient.signMessage({ account: wallet.eoa, message }) as Promise<`0x${string}`>;
        },
        async signTypedData(typedData) {
          const { domain, types, message, primaryType } = typedData as any;
          return walletClient.signTypedData({ account: wallet.eoa, domain, types, message, primaryType }) as Promise<`0x${string}`>;
        },
      });
      const abstractClient = await createAbstractClient({
        signer,
        chain: targetChain,
        transport: custom(window.ethereum!),
      });
      const hash = await abstractClient.sendCalls({
        calls: [{ to: wallet.eoa, value: 0n, data: "0x" }],
      });
      setTxHash(hash);
      showToast("success", `Demo UserOp sent!`);
      const publicClient = getPublicClient();
      const aaBalance = await publicClient.getBalance({ address: wallet.aaAddress });
      setWallet({ ...wallet, aaBalance: formatEther(aaBalance) });
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = ([addr]: string[]) => {
      if (!addr) setWallet(null);
      else connect();
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => { window.ethereum?.removeListener("accountsChanged", handleAccountsChanged); };
  }, []);

  return (
    <div>
      {!wallet ? (
        <button onClick={connect} disabled={loading} className="btn btn-primary w-full">
          {loading ? (
            <svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          )}
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-base-content/50">EOA</span>
            <button onClick={disconnect} className="btn btn-ghost btn-xs text-error">Disconnect</button>
          </div>
          <div className="font-mono text-sm truncate">{wallet.eoa}</div>
          <div className="text-xs text-base-content/50">Balance: <span className="font-mono">{wallet.eoaBalance} ETH</span></div>

          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-primary font-semibold">Abstract Account (AA)</span>
              {!wallet.isDeployed && <span className="badge badge-outline badge-xs">counterfactual</span>}
              {wallet.isDeployed && <span className="badge badge-success badge-xs">deployed</span>}
            </div>
            <div className="font-mono text-sm truncate mt-1">{wallet.aaAddress}</div>
            <div className="text-xs text-base-content/50">Balance: <span className="font-mono">{wallet.aaBalance} ETH</span></div>
          </div>

          <div className="flex justify-between items-center py-2 px-3 bg-base-200 rounded-box">
            <span className="text-sm text-base-content/60">Network</span>
            <div className="flex gap-1">
              <button onClick={() => switchChain("abstract_testnet")} className={`btn btn-xs ${chain === "abstract_testnet" ? "btn-primary" : "btn-ghost"}`}>Testnet</button>
              <button onClick={() => switchChain("abstract")} className={`btn btn-xs ${chain === "abstract" ? "btn-primary" : "btn-ghost"}`}>Mainnet</button>
            </div>
          </div>

          <div className="flex gap-2">
            {!wallet.isDeployed && (
              <button onClick={deploy} disabled={loading} className="btn btn-outline btn-sm flex-1">
                {loading ? "Deploying..." : "Deploy Account"}
              </button>
            )}
            <button onClick={sendDemoTx} disabled={loading || !wallet.isDeployed} className="btn btn-outline btn-sm flex-1">
              {loading ? "Sending..." : "Demo UserOp"}
            </button>
          </div>

          {txHash && (
            <div className="text-xs text-base-content/50 truncate">
              Last tx: <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-6)}</span>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-max max-w-[94%] sm:max-w-lg z-[9999]">
          <div className={`${toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"} border text-sm rounded-lg px-4 py-3 shadow-lg`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
